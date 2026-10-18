// Crea la cuenta base de Orilla en Stellar testnet e imprime las variables para .env.local.
// Uso: npm run stellar:setup
//
// - funder: paga el XLM inicial de cada cuenta custodial que crea Orilla (personas y proyectos).
//   Cuando baja de 500 XLM, Orilla lo recarga sola con friendbot.

import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

async function friendbot(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot falló para ${publicKey}: ${res.status} ${await res.text()}`);
}

async function main() {
  const funder = Keypair.random();

  console.error("Fondeando el funder con friendbot…");
  await friendbot(funder.publicKey());

  console.error("Listo. Copia estas líneas en frontend/.env.local:\n");
  console.log(`STELLAR_HORIZON_URL=${HORIZON_URL}`);
  console.log(`FUNDER_SECRET=${funder.secret()}`);
  console.log(`ORILLA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
