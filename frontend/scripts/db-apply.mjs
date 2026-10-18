// Aplica supabase/schema.sql (idempotente) a la base indicada en DATABASE_URL.
// Uso: npm run db:apply   (lee frontend/.env.local)

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (connection string de Supabase: Project Settings → Database).");
  process.exit(1);
}

const schemaPath = fileURLToPath(new URL("../../supabase/schema.sql", import.meta.url));
const sql = postgres(url, { max: 1, ssl: "require", onnotice: () => {} });

try {
  await sql.unsafe(await readFile(schemaPath, "utf8"));
  console.log(`Esquema aplicado: ${schemaPath}`);
} catch (err) {
  console.error("No se pudo aplicar el esquema:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
