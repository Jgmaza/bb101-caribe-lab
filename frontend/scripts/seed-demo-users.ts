/**
 * Crea usuarios de demo con wallet custodial (la clave la guarda Orilla cifrada).
 * Uso: npm run seed:demo
 *
 * Idempotente: si el username ya existe, lo salta.
 */
import { createCipheriv, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { Keypair, Horizon, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const DEMO_USERS = [
  { username: "danncarlton", display_name: "Tesorería Dann Carlton", password: "OrillaHotel2026!", phone: "3001111001", role: "empresa" },
  { username: "laura", display_name: "Laura Méndez", password: "OrillaStaff2026!", phone: "3007654321", role: "staff" },
  { username: "andres", display_name: "Andrés Pérez", password: "OrillaDemo2026!", phone: "3002223344", role: "músico" },
  { username: "pedro", display_name: "Pedro Ruiz", password: "OrillaDemo2026!", phone: "3005556677", role: "sonido" },
  { username: "barlatroja", display_name: "Bar La Troja", password: "OrillaDemo2026!", phone: "3008889900", role: "empresa" },
] as const;

function encKey() {
  const raw = Buffer.from(process.env.ORILLA_ENCRYPTION_KEY!, "base64");
  if (raw.length !== 32) throw new Error("ORILLA_ENCRYPTION_KEY inválida");
  return raw;
}

function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((p) => p.toString("base64url")).join(".");
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const funderSecret = process.env.FUNDER_SECRET;
  const horizonUrl = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
  if (!url || !key || !funderSecret || !process.env.ORILLA_ENCRYPTION_KEY) {
    throw new Error("Faltan env: SUPABASE_*, FUNDER_SECRET, ORILLA_ENCRYPTION_KEY");
  }

  const db = createClient(url, key);
  const horizon = new Horizon.Server(horizonUrl);
  const funder = Keypair.fromSecret(funderSecret);

  console.log("Sembrando usuarios demo (wallet custodial por persona)…\n");

  for (const u of DEMO_USERS) {
    const { data: existing } = await db.from("users").select("id, username").eq("username", u.username).maybeSingle();
    if (existing) {
      console.log(`· @${u.username} ya existe — omitido`);
      continue;
    }

    const kp = Keypair.random();
    const account = await horizon.loadAccount(funder.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.createAccount({ destination: kp.publicKey(), startingBalance: "1.5" }))
      .setTimeout(60)
      .build();
    tx.sign(funder);
    await horizon.submitTransaction(tx);

    const password_hash = await bcrypt.hash(u.password, 12);
    const { error } = await db.from("users").insert({
      username: u.username,
      display_name: u.display_name,
      password_hash,
      stellar_public_key: kp.publicKey(),
      stellar_secret_enc: encryptSecret(kp.secret()),
    });
    if (error) throw new Error(`@${u.username}: ${error.message}`);
    console.log(`✓ @${u.username}  (${u.display_name})  pass: ${u.password}`);
  }

  console.log("\nListo. Cada usuario tiene saldo Orilla; la clave Stellar la administra el servidor.");
  console.log("CSV de lote: public/plantilla-lote-caribe.csv");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
