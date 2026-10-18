// Borra todos los objetos de Orilla (supabase/reset.sql) en la base de DATABASE_URL.
// Irreversible: exige --yes. Después corre `npm run db:apply`.
// Uso: npm run db:reset -- --yes   (lee frontend/.env.local)

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

if (!process.argv.includes("--yes")) {
  console.error(
    "Esto BORRA todas las tablas y datos de Orilla. Para confirmar: npm run db:reset -- --yes",
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (connection string de Supabase: Project Settings → Database).");
  process.exit(1);
}

const resetPath = fileURLToPath(new URL("../../supabase/reset.sql", import.meta.url));
const sql = postgres(url, { max: 1, ssl: "require", onnotice: () => {} });

try {
  await sql.unsafe(await readFile(resetPath, "utf8"));
  console.log(`Base reiniciada: ${resetPath}. Ahora corre npm run db:apply.`);
} catch (err) {
  console.error("No se pudo reiniciar la base:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
