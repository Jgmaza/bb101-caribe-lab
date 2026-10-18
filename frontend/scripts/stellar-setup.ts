// Crea las cuentas base de Orilla en Stellar testnet e imprime las variables para .env.local.
// Uso: npm run stellar:setup
//
// - issuer: emite el activo de prueba COP
// - funder: paga el XLM inicial de cada cuenta custodial que crea Orilla
// - organizador demo: cuenta con COP de prueba para simular al bar/hotel que paga

import { randomBytes } from "node:crypto";
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const INITIAL_ORGANIZER_COP = "20000000";

async function friendbot(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot falló para ${publicKey}: ${res.status} ${await res.text()}`);
}

async function main() {
  const server = new Horizon.Server(HORIZON_URL);
  const issuer = Keypair.random();
  const funder = Keypair.random();
  const organizer = Keypair.random();

  console.error("Fondeando cuentas con friendbot…");
  for (const kp of [issuer, funder, organizer]) await friendbot(kp.publicKey());

  const cop = new Asset("COP", issuer.publicKey());

  console.error("Trustline del organizador y emisión inicial de COP…");
  const tx = new TransactionBuilder(await server.loadAccount(issuer.publicKey()), {
    fee: "1000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: cop, source: organizer.publicKey() }))
    .addOperation(
      Operation.payment({ destination: organizer.publicKey(), asset: cop, amount: INITIAL_ORGANIZER_COP }),
    )
    .setTimeout(60)
    .build();
  tx.sign(issuer, organizer);
  await server.submitTransaction(tx);

  console.error("Listo. Copia estas líneas en frontend/.env.local:\n");
  console.log(`STELLAR_HORIZON_URL=${HORIZON_URL}`);
  console.log(`COP_ISSUER_SECRET=${issuer.secret()}`);
  console.log(`FUNDER_SECRET=${funder.secret()}`);
  console.log(`ORGANIZER_DEMO_SECRET=${organizer.secret()}`);
  console.log(`ORILLA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
}

main().catch((err) => {
  console.error(err?.response?.data?.extras?.result_codes ?? err);
  process.exit(1);
});
