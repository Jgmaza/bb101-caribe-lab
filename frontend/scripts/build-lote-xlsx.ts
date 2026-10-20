/**
 * Genera Excel de demo con montos en pesos colombianos (COP).
 * Uso: node --import tsx scripts/build-lote-xlsx.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

const dir = join(import.meta.dirname, "../public");

const montos = [
  ["nombre", "usuario", "celular", "rol", "monto_cop"],
  ["Laura Méndez", "laura", "3007654321", "staff", 350000],
  ["Andrés Pérez", "andres", "3002223344", "músico", 300000],
  ["Pedro Ruiz", "pedro", "3005556677", "sonido", 200000],
  ["Sergio Mancilla", "athomserx", "3001112233", "músico", 250000],
  ["José Maza", "jgmaza", "3009998877", "staff", 200000],
];

const pct = [
  ["nombre", "usuario", "celular", "rol", "%"],
  ["Laura Méndez", "laura", "3007654321", "staff", 28],
  ["Andrés Pérez", "andres", "3002223344", "músico", 23],
  ["Pedro Ruiz", "pedro", "3005556677", "sonido", 15],
  ["Sergio Mancilla", "athomserx", "3001112233", "músico", 19],
  ["José Maza", "jgmaza", "3009998877", "staff", 15],
];

function write(name: string, rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "lote");
  const out = join(dir, name);
  writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  console.log("wrote", out);
}

write("Lote-pagos-Orilla-demo.xlsx", montos);
write("Lote-pagos-Orilla-porcentajes.xlsx", pct);
