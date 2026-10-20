/**
 * One-off: top up XLM + open USDC trustline for demo accounts (op_low_reserve).
 * Uso: node --dns-result-order=ipv4first --env-file=.env.local --import tsx scripts/fix-low-reserve.ts
 */
import { createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const FEE = "1000";
const FRIENDBOT = "https://friendbot.stellar.org";
const NAMES = ["danncarlton", "laura", "andres", "pedro", "athomserx"];

function encKey() {
  const raw = Buffer.from(process.env.ORILLA_ENCRYPTION_KEY!, "base64");
  if (raw.length !== 32) throw new Error("ORILLA_ENCRYPTION_KEY inválida");
  return raw;
}

function decryptSecret(payload: string) {
  const [v, ivB, tagB, ctB] = payload.split(".");
  if (v !== "v1") throw new Error("payload cifrado inválido");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB!, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB!, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB!, "base64url")), decipher.final()]).toString("utf8");
}

async function friendbotMergeInto(horizon: Horizon.Server, destination: string) {
  const temp = Keypair.random();
  const res = await fetch(`${FRIENDBOT}/?addr=${encodeURIComponent(temp.publicKey())}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Friendbot ${res.status}`);
  const tempAccount = await horizon.loadAccount(temp.publicKey());
  const tx = new TransactionBuilder(tempAccount, { fee: FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.accountMerge({ destination }))
    .setTimeout(60)
    .build();
  tx.sign(temp);
  await horizon.submitTransaction(tx);
}

async function ensureTrust(horizon: Horizon.Server, secret: string) {
  const kp = Keypair.fromSecret(secret);
  let account = await horizon.loadAccount(kp.publicKey());
  const has = account.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === "USDC" &&
      b.asset_issuer === USDC.getIssuer(),
  );
  if (has) return "already";

  const native = account.balances.find((b) => b.asset_type === "native")!;
  // Need ≥ ~2 XLM before ChangeTrust (1.5 reserve after + fee margin)
  if (parseFloat(native.balance) < 2.2) {
    await friendbotMergeInto(horizon, kp.publicKey());
    account = await horizon.loadAccount(kp.publicKey());
  }

  const tx = new TransactionBuilder(account, { fee: FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await horizon.submitTransaction(tx);
  return "opened";
}

async function main() {
  const horizon = new Horizon.Server(process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org");
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: users, error } = await db
    .from("users")
    .select("username,stellar_public_key,stellar_secret_enc")
    .in("username", NAMES);
  if (error) throw error;

  for (const u of users ?? []) {
    process.stdout.write(`@${u.username} … `);
    try {
      const status = await ensureTrust(horizon, decryptSecret(u.stellar_secret_enc));
      const acc = await horizon.loadAccount(u.stellar_public_key);
      const xlm = acc.balances.find((b) => b.asset_type === "native")!.balance;
      const usdc = acc.balances.find(
        (b) => b.asset_type !== "native" && "asset_code" in b && b.asset_code === "USDC",
      ) as { balance?: string } | undefined;
      console.log(`${status} | XLM=${xlm} USDC=${usdc?.balance ?? "—"}`);
    } catch (e) {
      console.log("FAIL", (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
