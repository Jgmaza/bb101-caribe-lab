import "server-only";
import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";
import { availableStroops, stroopsToXlm, xlmToStroops } from "@/lib/money";
import type { TxLookup } from "@/lib/payments";
import type { AnchorMemo } from "@/lib/withdrawals";
import { env } from "./env";

// Toda la interacción con Stellar testnet pasa por aquí.
// Activo de pago: USDC de Circle en testnet. Montos en unidades de 10^-7 ("stroops").
// XLM solo para reserva de cuenta, comisiones y swap al fondear.

const FEE = "1000"; // stroops por operación; holgado para testnet
const STARTING_XLM = "3"; // (2+trustline)×0,5 XLM + margen de comisiones
/** XLM libres mínimos antes de abrir trustline USDC (reserva extra + fees). */
const TRUSTLINE_NATIVE_MIN = xlmToStroops("1.5");
const TIMEOUT_SECONDS = 60;
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const MAX_TOPUP_ROUNDS = 5; // cada ronda de friendbot trae ~10.000 XLM
const MAX_USDC_TOPUP_ROUNDS = 20; // cada ronda compra hasta 25 USDC en el DEX
const FUNDER_MIN_STROOPS = xlmToStroops("500"); // por debajo, el funder se recarga solo

/** USDC de Circle en Stellar Testnet (mismo issuer que testanchor). */
export const USDC_CODE = "USDC";
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const USDC = new Asset(USDC_CODE, USDC_ISSUER);

let server: Horizon.Server | undefined;
function horizon() {
  server ??= new Horizon.Server(env("STELLAR_HORIZON_URL"));
  return server;
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerAccountUrl(publicKey: string) {
  return `https://stellar.expert/explorer/testnet/account/${publicKey}`;
}

type Submitted = { hash: string; fee_charged?: number | string };

/**
 * Falla al enviar una transacción. `uncertain`: Horizon no dio una respuesta definitiva (red,
 * timeout 504): la transacción todavía podría entrar hasta su plazo. Si no, Stellar la rechazó
 * y seguro no se aplicó; `codes` trae los result codes (tx_bad_seq, op_underfunded, …).
 */
export class TxError extends Error {
  constructor(
    message: string,
    readonly uncertain: boolean,
    readonly codes: string[] = [],
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sin respuesta de Horizon, o un 5xx (504 = enviada pero sin confirmar): no sabemos si se aplicó. */
function isTransient(err: unknown): boolean {
  if (err instanceof NotFoundError) return false;
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
}

function txHash(tx: Transaction) {
  return Buffer.from(tx.hash()).toString("hex");
}

/** Busca una transacción por hash. "failed" = entró pero sus operaciones no se aplicaron. */
export async function lookupTransaction(hash: string): Promise<TxLookup> {
  try {
    const tx = await horizon().transactions().transaction(hash).call();
    return tx.successful ? "success" : "failed";
  } catch (err) {
    return err instanceof NotFoundError ? "missing" : "unknown";
  }
}

async function findTransaction(hash: string): Promise<Submitted | null> {
  try {
    const tx = await horizon().transactions().transaction(hash).call();
    return tx.successful ? { hash: tx.hash, fee_charged: tx.fee_charged } : null;
  } catch {
    return null;
  }
}

/**
 * Envía una transacción firmada. Si falla por red (p. ej. una conexión keep-alive vencida),
 * busca la transacción por su hash antes de reenviarla: reenviar la MISMA transacción no
 * puede duplicar el pago (mismo número de secuencia), a lo sumo Horizon la rechaza.
 */
async function submit(tx: Transaction): Promise<Submitted> {
  const hash = txHash(tx);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await horizon().submitTransaction(tx);
    } catch (err) {
      lastErr = err;
      if (attempt > 1 || isTransient(err)) {
        await sleep(1000 * attempt);
        const applied = await findTransaction(hash);
        if (applied) return applied;
      }
      if (!isTransient(err)) break;
    }
  }
  throw toTxError(lastErr);
}

function toTxError(err: unknown): TxError {
  const codes = (
    err as {
      response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
    }
  )?.response?.data?.extras?.result_codes;
  if (codes) {
    const list = [codes.transaction, ...(codes.operations ?? [])].filter(
      (c): c is string => !!c && c !== "op_success",
    );
    return new TxError(`Stellar rechazó la transacción: ${JSON.stringify(codes)}`, false, list);
  }
  const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
  const base = err instanceof Error ? err.message : String(err);
  return new TxError(cause ? `${base} (${cause.code ?? cause.message})` : base, isTransient(err));
}

export type SignedTx = { hash: string; deadline: Date };

/**
 * Arma, firma y envía una transacción desde `source`. `onSigned` corre con el hash ANTES de
 * enviarla (para guardarlo); si falla, no se envía nada. Si la secuencia de la cuenta cambió
 * entre la lectura y el envío (tx_bad_seq: otra transacción de la misma cuenta entró antes), esa
 * transacción ya no puede entrar nunca: se vuelve a armar con la secuencia nueva.
 */
async function buildAndSubmit(
  source: Keypair,
  addOperations: (builder: TransactionBuilder) => TransactionBuilder,
  onSigned?: (tx: SignedTx) => Promise<void>,
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const tx = addOperations(await builderFor(source.publicKey()))
      .setTimeout(TIMEOUT_SECONDS)
      .build();
    tx.sign(source);
    await onSigned?.({ hash: txHash(tx), deadline: new Date(Number(tx.timeBounds!.maxTime) * 1000) });
    try {
      return (await submit(tx)).hash;
    } catch (err) {
      if (attempt < 3 && err instanceof TxError && err.codes.includes("tx_bad_seq")) continue;
      throw err;
    }
  }
}

/**
 * loadAccount con reintentos ante errores de red: tras una espera larga (p. ej. friendbot) la
 * conexión keep-alive con Horizon puede estar cerrada y fetch falla sin reintentar. Leer una
 * cuenta es idempotente; "no existe" (NotFoundError) no se reintenta.
 */
async function loadAccount(publicKey: string, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await horizon().loadAccount(publicKey);
    } catch (err) {
      if (err instanceof NotFoundError || i >= attempts) throw err;
      await sleep(500 * i);
    }
  }
}

async function builderFor(publicKey: string) {
  return new TransactionBuilder(await loadAccount(publicKey), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  });
}

function usdcBalanceStroops(account: Horizon.AccountResponse): bigint {
  const line = account.balances.find(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === USDC_CODE &&
      b.asset_issuer === USDC_ISSUER,
  );
  if (!line) return 0n;
  const bal = xlmToStroops(line.balance);
  const selling = "selling_liabilities" in line ? xlmToStroops(line.selling_liabilities) : 0n;
  const free = bal - selling;
  return free > 0n ? free : 0n;
}

function hasUsdcTrustline(account: Horizon.AccountResponse): boolean {
  return account.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === USDC_CODE &&
      b.asset_issuer === USDC_ISSUER,
  );
}

/**
 * Saldo disponible en USDC (unidades 10^-7). 0 si no hay trustline; null si Horizon falló.
 * El nombre histórico `getAvailableStroops` se mantiene: la UI y la DB siguen hablando de stroops.
 */
export async function getAvailableStroops(publicKey: string): Promise<bigint | null> {
  try {
    const account = await loadAccount(publicKey);
    return usdcBalanceStroops(account);
  } catch (err) {
    if (err instanceof NotFoundError) return 0n;
    console.error(`No se pudo leer el saldo USDC de ${publicKey}:`, err);
    return null;
  }
}

/** Saldo XLM gastable (reserva + comisiones). Usado internamente para fondeo. */
async function getAvailableNativeStroops(publicKey: string): Promise<bigint | null> {
  try {
    const account = await loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    if (!native) return 0n;
    return availableStroops({
      balance: native.balance,
      subentries: account.subentry_count,
      sponsoring: account.num_sponsoring ?? 0,
      sponsored: account.num_sponsored ?? 0,
      sellingLiabilities: "selling_liabilities" in native ? native.selling_liabilities : "0",
    });
  } catch (err) {
    if (err instanceof NotFoundError) return 0n;
    console.error(`No se pudo leer el saldo XLM de ${publicKey}:`, err);
    return null;
  }
}

/** Abre trustline USDC si falta (idempotente). Si falta XLM de reserva → friendbot. */
export async function ensureUsdcTrustline(secret: string): Promise<void> {
  const kp = Keypair.fromSecret(secret);
  const account = await loadAccount(kp.publicKey());
  if (hasUsdcTrustline(account)) return;
  // ChangeTrust + fee exige ≥1,5 XLM con 0 subentradas; cuentas viejas a 1,5 fallan (op_low_reserve).
  const nativeFree = (await getAvailableNativeStroops(kp.publicKey())) ?? 0n;
  if (nativeFree < TRUSTLINE_NATIVE_MIN) {
    await friendbotTopUp(kp.publicKey(), TRUSTLINE_NATIVE_MIN - nativeFree + xlmToStroops("1"));
  }
  await buildAndSubmit(kp, (builder) => builder.addOperation(Operation.changeTrust({ asset: USDC })));
}

/** Fondea una cuenta nueva con friendbot. Si la llamada falla, revisa si igual quedó fondeada. */
async function friendbot(publicKey: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return;
      throw new Error(`Friendbot respondió ${res.status}`);
    } catch (err) {
      const funded = await loadAccount(publicKey).then(
        () => true,
        () => false,
      );
      if (funded) return;
      if (attempt >= 2) throw new Error(`Friendbot no respondió: ${(err as Error).message}`);
      await sleep(1000);
    }
  }
}

export type TopupRound = { txHash: string; amountStroops: bigint };

/**
 * Recarga XLM con friendbot: crea cuenta temporal, friendbot la fondea y se fusiona en
 * `destination`. Repite hasta sumar `minStroops` de XLM.
 */
export async function friendbotTopUp(
  destination: string,
  minStroops = 1n,
  onRound?: (round: TopupRound) => Promise<void>,
): Promise<TopupRound[]> {
  const rounds: TopupRound[] = [];
  let total = 0n;
  while (total < minStroops) {
    if (rounds.length >= MAX_TOPUP_ROUNDS) {
      throw new Error("El monto supera lo que se puede recargar de una vez.");
    }
    const temp = Keypair.random();
    await friendbot(temp.publicKey());
    const tempAccount = await loadAccount(temp.publicKey());
    const balance = xlmToStroops(tempAccount.balances.find((b) => b.asset_type === "native")!.balance);
    const tx = new TransactionBuilder(tempAccount, { fee: FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.accountMerge({ destination }))
      .setTimeout(TIMEOUT_SECONDS)
      .build();
    tx.sign(temp);
    const res = await submit(tx);
    const fee = BigInt(res.fee_charged ?? FEE);
    const round = { txHash: res.hash, amountStroops: balance - fee };
    rounds.push(round);
    total += round.amountStroops;
    await onRound?.(round);
  }
  return rounds;
}

/**
 * Recarga USDC en testnet: friendbot trae XLM y se cambia a USDC en el DEX (path payment).
 * `onRound` recibe el USDC neto de cada swap (para registrar en `topups`).
 */
export async function usdcTopUp(
  secret: string,
  minUsdcStroops = 1n,
  onRound?: (round: TopupRound) => Promise<void>,
): Promise<TopupRound[]> {
  const kp = Keypair.fromSecret(secret);
  await ensureUsdcTrustline(secret);

  const rounds: TopupRound[] = [];
  let available = (await getAvailableStroops(kp.publicKey())) ?? 0n;

  while (available < minUsdcStroops) {
    if (rounds.length >= MAX_USDC_TOPUP_ROUNDS) {
      throw new Error("El monto supera lo que se puede recargar de una vez.");
    }
    const need = minUsdcStroops - available;
    // Pedimos de a poco para no agotar un solo nivel del libro (máx. 25 USDC/ronda).
    const chunk = need > 250_000_000n ? 250_000_000n : need < 1_000_000n ? 1_000_000n : need;
    // Precio de referencia ~0.12–0.5 USDC por XLM → margen amplio de XLM a enviar.
    const xlmForSwap = chunk * 20n + xlmToStroops("100");
    const nativeFree = (await getAvailableNativeStroops(kp.publicKey())) ?? 0n;
    if (nativeFree < xlmForSwap) {
      await friendbotTopUp(kp.publicKey(), xlmForSwap - nativeFree + xlmToStroops("10"));
    }

    const before = available;
    const destAmount = stroopsToXlm(chunk);
    const sendMax = stroopsToXlm(xlmForSwap);
    const hash = await buildAndSubmit(kp, (builder) =>
      builder.addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset: Asset.native(),
          sendMax,
          destination: kp.publicKey(),
          destAsset: USDC,
          destAmount,
          path: [],
        }),
      ),
    );
    available = (await getAvailableStroops(kp.publicKey())) ?? 0n;
    const gained = available - before;
    if (gained <= 0n) throw new Error("El swap XLM→USDC no aumentó el saldo.");
    const round = { txHash: hash, amountStroops: gained };
    rounds.push(round);
    await onRound?.(round);
  }
  return rounds;
}

/** Si el funder baja del umbral, se recarga solo con friendbot. */
async function ensureFunderBalance(funder: Keypair, needed: bigint) {
  const available = await getAvailableNativeStroops(funder.publicKey());
  if (available !== null && available - needed >= FUNDER_MIN_STROOPS) return;
  await friendbotTopUp(funder.publicKey(), needed);
}

/**
 * Crea cuentas custodiales (personas o proyectos) en una sola transacción: el funder les da lo
 * justo para la reserva y algunas comisiones. Luego cada una abre trustline USDC.
 */
export async function createCustodialAccounts(count: number): Promise<Keypair[]> {
  if (count < 1 || count > 100) throw new Error("Se pueden crear entre 1 y 100 cuentas a la vez");
  const funder = Keypair.fromSecret(env("FUNDER_SECRET"));
  await ensureFunderBalance(funder, BigInt(count) * xlmToStroops(STARTING_XLM));
  const accounts = Array.from({ length: count }, () => Keypair.random());

  await buildAndSubmit(funder, (builder) => {
    for (const kp of accounts) {
      builder.addOperation(
        Operation.createAccount({ destination: kp.publicKey(), startingBalance: STARTING_XLM }),
      );
    }
    return builder;
  });

  for (const kp of accounts) {
    await ensureUsdcTrustline(kp.secret());
  }
  return accounts;
}

/** Pago de una persona a la cuenta del proyecto, en USDC. */
export async function payToProject(opts: {
  payerSecret: string;
  projectPublicKey: string;
  amountStroops: bigint;
  memo: string;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  await ensureUsdcTrustline(opts.payerSecret);
  return buildAndSubmit(
    Keypair.fromSecret(opts.payerSecret),
    (builder) =>
      builder
        .addOperation(
          Operation.payment({
            destination: opts.projectPublicKey,
            asset: USDC,
            amount: stroopsToXlm(opts.amountStroops),
          }),
        )
        .addMemo(Memo.text(opts.memo)),
    opts.onSigned,
  );
}

/** true si la cuenta existe; null si Horizon no respondió. */
export async function accountExists(publicKey: string): Promise<boolean | null> {
  try {
    await loadAccount(publicKey);
    return true;
  } catch (err) {
    return err instanceof NotFoundError ? false : null;
  }
}

/** true si la cuenta puede recibir USDC (trustline abierta). */
export async function canReceiveUsdc(publicKey: string): Promise<boolean | null> {
  try {
    return hasUsdcTrustline(await loadAccount(publicKey));
  } catch (err) {
    return err instanceof NotFoundError ? false : null;
  }
}

function toMemo(memo: AnchorMemo): Memo {
  switch (memo.type) {
    case "id":
      return Memo.id(memo.value);
    case "hash":
      return Memo.hash(Buffer.from(memo.value, "base64").toString("hex"));
    default:
      return Memo.text(memo.value);
  }
}

/**
 * Retiro: USDC de la cuenta de una persona a otra. No crea cuentas nuevas (hace falta
 * trustline USDC en el destino, que solo puede abrir el dueño de esa cuenta).
 */
export async function sendNative(opts: {
  sourceSecret: string;
  destination: string;
  amountStroops: bigint;
  createAccount: boolean;
  memo: AnchorMemo | null;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  if (opts.createAccount) {
    throw new TxError("Para recibir USDC la cuenta destino ya debe existir y aceptar USDC.", false, [
      "op_no_trust",
    ]);
  }
  await ensureUsdcTrustline(opts.sourceSecret);
  const amount = stroopsToXlm(opts.amountStroops);
  return buildAndSubmit(
    Keypair.fromSecret(opts.sourceSecret),
    (builder) => {
      builder.addOperation(
        Operation.payment({ destination: opts.destination, asset: USDC, amount }),
      );
      return opts.memo ? builder.addMemo(toMemo(opts.memo)) : builder;
    },
    opts.onSigned,
  );
}

/**
 * Reparte desde la cuenta del proyecto a cada integrante en UNA transacción
 * (todo o nada). Es el único punto a cambiar si en v2 se usa la API de SDP.
 */
export async function distribute(opts: {
  projectSecret: string;
  splits: { publicKey: string; amountStroops: bigint }[];
  memo: string;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  return payMany({
    payerSecret: opts.projectSecret,
    splits: opts.splits,
    memo: opts.memo,
    onSigned: opts.onSigned,
  });
}

/**
 * Varios pagos USDC desde una sola cuenta (hotel cierra lote, o proyecto reparte).
 * Máx. ~100 ops/tx en Stellar; el MVP de lotes limita a 40 filas.
 */
export async function payMany(opts: {
  payerSecret: string;
  splits: { publicKey: string; amountStroops: bigint }[];
  memo: string;
  onSigned?: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  await ensureUsdcTrustline(opts.payerSecret);
  return buildAndSubmit(
    Keypair.fromSecret(opts.payerSecret),
    (builder) => {
      for (const s of opts.splits) {
        if (s.amountStroops <= 0n) continue;
        builder.addOperation(
          Operation.payment({
            destination: s.publicKey,
            asset: USDC,
            amount: stroopsToXlm(s.amountStroops),
          }),
        );
      }
      return builder.addMemo(Memo.text(opts.memo));
    },
    opts.onSigned,
  );
}
