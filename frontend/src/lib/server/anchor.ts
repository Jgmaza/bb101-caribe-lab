import "server-only";
import { Keypair, Networks, StellarToml, TransactionBuilder, WebAuth } from "@stellar/stellar-sdk";
import { stroopsToXlm, xlmToStroops } from "@/lib/money";
import { USDC_CODE, USDC_ISSUER } from "./stellar";

// Anchor SEP-24 para "Retirar a mi banco". En testnet: testanchor.stellar.org, que acepta
// retiros de USDC (Circle). Para un banco real (p. ej. Bancolombia) solo cambia ANCHOR_DOMAIN.
// La autenticación es SEP-10: el anchor manda un challenge, lo verificamos y lo firmamos con la
// clave custodial de la persona en el servidor. La clave nunca sale del servidor.

const DOMAIN = process.env.ANCHOR_DOMAIN || "testanchor.stellar.org";
const TIMEOUT_MS = 15_000;
const CONFIG_TTL_MS = 60 * 60_000;
const INFO_TTL_MS = 10 * 60_000;

/** Falla al hablar con el anchor. El mensaje es técnico: va al log, no a la UI. */
export class AnchorError extends Error {}

type AnchorConfig = { webAuth: string; transferServer: string; signingKey: string };

let config: { value: AnchorConfig; at: number } | undefined;

async function anchorConfig(): Promise<AnchorConfig> {
  if (config && Date.now() - config.at < CONFIG_TTL_MS) return config.value;
  const toml = await StellarToml.Resolver.resolve(DOMAIN, { timeout: TIMEOUT_MS });
  const { WEB_AUTH_ENDPOINT, TRANSFER_SERVER_SEP0024, SIGNING_KEY, NETWORK_PASSPHRASE } = toml;
  if (!WEB_AUTH_ENDPOINT || !TRANSFER_SERVER_SEP0024 || !SIGNING_KEY) {
    throw new AnchorError(`${DOMAIN} no publica SEP-10/SEP-24 en su stellar.toml`);
  }
  if (NETWORK_PASSPHRASE && NETWORK_PASSPHRASE !== Networks.TESTNET) {
    throw new AnchorError(`${DOMAIN} no es un anchor de testnet`);
  }
  const value = { webAuth: WEB_AUTH_ENDPOINT, transferServer: TRANSFER_SERVER_SEP0024, signingKey: SIGNING_KEY };
  config = { value, at: Date.now() };
  return value;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AnchorError(`${url} respondió ${res.status}: ${JSON.stringify(body)}`);
  return body as T;
}

// JWT de SEP-10 por cuenta, en memoria hasta un minuto antes de vencer.
const tokens = new Map<string, { token: string; exp: number }>();

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function authenticate(kp: Keypair): Promise<string> {
  const cached = tokens.get(kp.publicKey());
  if (cached && cached.exp - 60_000 > Date.now()) return cached.token;

  const { webAuth, signingKey } = await anchorConfig();
  const challenge = await request<{ transaction: string; network_passphrase?: string }>(
    `${webAuth}?account=${encodeURIComponent(kp.publicKey())}`,
  );
  if (challenge.network_passphrase && challenge.network_passphrase !== Networks.TESTNET) {
    throw new AnchorError("El challenge de SEP-10 es de otra red");
  }
  // Verifica firma del anchor, cuenta, dominio y que sea un challenge (no un pago disfrazado)
  // antes de firmarlo con la clave de la persona.
  const { clientAccountID } = WebAuth.readChallengeTx(
    challenge.transaction,
    signingKey,
    Networks.TESTNET,
    DOMAIN,
    new URL(webAuth).host,
  );
  if (clientAccountID !== kp.publicKey()) throw new AnchorError("El challenge es para otra cuenta");

  const tx = TransactionBuilder.fromXDR(challenge.transaction, Networks.TESTNET);
  tx.sign(kp);
  const { token } = await request<{ token: string }>(webAuth, {
    method: "POST",
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });
  if (!token) throw new AnchorError("SEP-10 no devolvió token");
  tokens.set(kp.publicKey(), { token, exp: jwtExp(token) });
  return token;
}

export type WithdrawLimits = { enabled: boolean; minStroops: bigint; maxStroops: bigint | null };

let info: { value: WithdrawLimits; at: number } | undefined;

/** Montos que el anchor acepta para retirar USDC (testanchor: entre 1 y 10 USDC). */
export async function getWithdrawLimits(): Promise<WithdrawLimits> {
  if (info && Date.now() - info.at < INFO_TTL_MS) return info.value;
  const { transferServer } = await anchorConfig();
  const body = await request<{
    withdraw?: { USDC?: { enabled?: boolean; min_amount?: number; max_amount?: number } };
  }>(`${transferServer}/info`);
  const usdc = body.withdraw?.USDC;
  const value = {
    enabled: !!usdc?.enabled,
    minStroops: usdc?.min_amount ? xlmToStroops(String(usdc.min_amount)) : 1n,
    maxStroops: usdc?.max_amount ? xlmToStroops(String(usdc.max_amount)) : null,
  };
  info = { value, at: Date.now() };
  return value;
}

/** Crea el retiro en el anchor. `url` es la página donde la persona llena los datos de su banco. */
export async function startWithdraw(kp: Keypair, amountStroops: bigint): Promise<{ id: string; url: string }> {
  const { transferServer } = await anchorConfig();
  const token = await authenticate(kp);
  const res = await request<{ type?: string; id?: string; url?: string }>(
    `${transferServer}/transactions/withdraw/interactive`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        asset_code: USDC_CODE,
        asset_issuer: USDC_ISSUER,
        account: kp.publicKey(),
        amount: stroopsToXlm(amountStroops),
        lang: "es",
      }),
    },
  );
  if (res.type !== "interactive_customer_info_needed" || !res.id || !res.url?.startsWith("https://")) {
    throw new AnchorError(`Respuesta inesperada del anchor: ${JSON.stringify(res)}`);
  }
  return { id: res.id, url: res.url };
}

export type AnchorTransaction = {
  id: string;
  status: string;
  amount_in?: string;
  amount_fee?: string;
  fee_details?: { total?: string };
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  refunded?: boolean;
  message?: string;
};

export async function getWithdrawTransaction(kp: Keypair, id: string): Promise<AnchorTransaction> {
  const { transferServer } = await anchorConfig();
  const token = await authenticate(kp);
  const { transaction } = await request<{ transaction?: AnchorTransaction }>(
    `${transferServer}/transaction?id=${encodeURIComponent(id)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!transaction || transaction.id !== id) throw new AnchorError(`El anchor no devolvió el retiro ${id}`);
  return transaction;
}
