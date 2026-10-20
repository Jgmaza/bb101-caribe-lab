/**
 * Smoke: crea 2 cuentas, compra USDC en el DEX y paga 0.1 USDC.
 * Uso: npx tsx scripts/smoke-usdc.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const HORIZON = process.env.STELLAR_HORIZON_URL!;
const FUNDER = process.env.FUNDER_SECRET!;
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const server = new Horizon.Server(HORIZON);

async function friendbot(pk: string) {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(pk)}`);
  if (!res.ok) throw new Error(`friendbot ${res.status}`);
}

async function submit(source: Keypair, build: (b: TransactionBuilder) => TransactionBuilder) {
  const account = await server.loadAccount(source.publicKey());
  const tx = build(
    new TransactionBuilder(account, { fee: "1000", networkPassphrase: Networks.TESTNET }),
  )
    .setTimeout(60)
    .build();
  tx.sign(source);
  return server.submitTransaction(tx);
}

async function main() {
  const funder = Keypair.fromSecret(FUNDER);
  const a = Keypair.random();
  const b = Keypair.random();
  console.log("A", a.publicKey());
  console.log("B", b.publicKey());

  await submit(funder, (builder) =>
    builder
      .addOperation(Operation.createAccount({ destination: a.publicKey(), startingBalance: "2.5" }))
      .addOperation(Operation.createAccount({ destination: b.publicKey(), startingBalance: "2.5" })),
  );
  await submit(a, (builder) => builder.addOperation(Operation.changeTrust({ asset: USDC })));
  await submit(b, (builder) => builder.addOperation(Operation.changeTrust({ asset: USDC })));

  // XLM extra + swap a 0.2 USDC
  const temp = Keypair.random();
  await friendbot(temp.publicKey());
  await submit(temp, (builder) => builder.addOperation(Operation.accountMerge({ destination: a.publicKey() })));
  const swap = await submit(a, (builder) =>
    builder.addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "500",
        destination: a.publicKey(),
        destAsset: USDC,
        destAmount: "0.2",
        path: [],
      }),
    ),
  );
  console.log("swap", swap.hash);

  const pay = await submit(a, (builder) =>
    builder
      .addOperation(
        Operation.payment({ destination: b.publicKey(), asset: USDC, amount: "0.1" }),
      )
      .addMemo(Memo.text("orilla usdc smoke")),
  );
  console.log("pay", `https://stellar.expert/explorer/testnet/tx/${pay.hash}`);

  const accB = await server.loadAccount(b.publicKey());
  const usdc = accB.balances.find((x) => "asset_code" in x && x.asset_code === "USDC");
  console.log("B USDC", usdc && "balance" in usdc ? usdc.balance : "0");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
