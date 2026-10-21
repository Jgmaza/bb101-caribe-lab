import * as XLSX from "xlsx";
import { normalizeRole } from "./roles";
import { parseCop } from "./money";
import { percentToBps, splitAmount, TOTAL_BPS } from "./split";

export type LoteMode = "amounts" | "percent";

export function spreadsheetFileError(file: { name: string; size: number }): string | null {
  if (!/\.(xlsx?|csv)$/i.test(file.name)) return "Usa un archivo Excel (.xlsx o .xls) o CSV UTF-8.";
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > 1_500_000) return "El archivo es demasiado grande (máx. 1,5 MB).";
  return null;
}

export type ParsedRow = {
  row: number;
  username: string;
  displayName: string;
  phone: string;
  role: string;
  amountCop: number | null;
  shareBps: number | null;
  raw: Record<string, string>;
  errors: string[];
};

export type ColumnMap = {
  username?: string;
  displayName?: string;
  phone?: string;
  role?: string;
  amount?: string;
  percent?: string;
};

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  username: ["username", "usuario", "user", "user_name", "@", "handle"],
  displayName: ["nombre", "name", "display_name", "nombre completo", "trabajador"],
  phone: ["celular", "telefono", "teléfono", "phone", "tel", "whatsapp", "móvil", "movil"],
  role: ["rol", "role", "cargo", "puesto", "funcion", "función"],
  amount: [
    "monto",
    "monto cop",
    "monto_cop",
    "montocop",
    "valor",
    "pago",
    "honorarios",
    "amount",
    "cop",
    "pesos",
    "pesos colombianos",
    "$",
    "total",
  ],
  percent: ["porcentaje", "percent", "%", "participacion", "participación", "pct", "share"],
};

function normHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9%@$]+/g, " ")
    .trim();
}

/** Detecta columnas típicas de un Excel de nómina de evento. */
export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const normalized = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ColumnMap, string[]][]) {
    const names = aliases.map(normHeader);
    const hit = normalized.find(({ n }) => names.includes(n)) ??
      normalized.find(({ n }) => names.some((a) => ` ${n} `.includes(` ${a} `)));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

/** Elige modo según qué columnas de pago encontró. */
export function detectMode(map: ColumnMap): LoteMode {
  if (map.percent && !map.amount) return "percent";
  if (map.amount && !map.percent) return "amounts";
  if (map.percent) return "percent";
  return "amounts";
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    if ((c === ";" || c === "\t") && !q && out.length === 0 && !line.includes(",")) {
      // leave for delimiter detect
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

/** Parsea CSV/TSV (Excel → Guardar como CSV). */
export function parseSpreadsheetText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n");
  if (!lines.some((l) => l.trim())) return { headers: [], rows: [] };
  const delim = detectDelimiter(lines[0]);
  const split = (line: string) => {
    if (delim === ",") return splitCsvLine(line);
    return line.split(delim).map((s) => s.trim().replace(/^"|"$/g, ""));
  };
  const headers = split(lines[0]).map((h) => h || "col");
  const rows = lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

/** Parsea .xlsx/.xls (primera hoja con datos; salta hojas «Instrucciones»). */
export function parseSpreadsheetBinary(data: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(data, { type: "array", cellDates: false });
  const sheetName =
    wb.SheetNames.find((n) => !/instruc/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number | boolean | null)[][];
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = matrix[0].map((h, i) => String(h ?? "").trim() || `col${i + 1}`);
  const rows = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = String(cells[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

/** CSV o Excel según extensión / MIME del File. */
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type === "application/vnd.ms-excel";
  if (isExcel) {
    return parseSpreadsheetBinary(await file.arrayBuffer());
  }
  return parseSpreadsheetText(await file.text());
}

function cell(row: Record<string, string>, key?: string) {
  if (!key) return "";
  return (row[key] ?? "").trim();
}

export function mapRows(
  rows: Record<string, string>[],
  map: ColumnMap,
  mode: LoteMode,
): ParsedRow[] {
  const parsed = rows.map((raw, i) => {
    const errors: string[] = [];
    const username = cell(raw, map.username).replace(/^@/, "").toLowerCase();
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      errors.push("Usuario inválido (3–20: a-z, 0-9, _)");
    }
    const displayName = cell(raw, map.displayName) || username;
    const phone = cell(raw, map.phone).replace(/\s+/g, "");
    const role = normalizeRole(cell(raw, map.role));
    let amountCop: number | null = null;
    let shareBps: number | null = null;

    if (mode === "amounts") {
      const parsed = parseCop(cell(raw, map.amount));
      if (parsed === null || parsed <= 0) errors.push("Monto inválido");
      else amountCop = parsed;
    } else {
      const pctRaw = cell(raw, map.percent).replace("%", "");
      const bps = percentToBps(pctRaw);
      if (bps === null || bps < 1) errors.push("% inválido");
      else shareBps = bps;
    }

    if (!username && !displayName && !phone) errors.push("Fila vacía");
    if (!username) errors.push("Falta usuario Orilla (@)");

    return {
      row: i + 2,
      username,
      displayName: displayName.slice(0, 60),
      phone: phone.slice(0, 20),
      role: role.slice(0, 60),
      amountCop,
      shareBps,
      raw,
      errors,
    };
  }).filter((r) => Object.values(r.raw).some((value) => value.trim()));
  const byUsername = new Map<string, number[]>();
  for (const r of parsed) {
    if (r.username) byUsername.set(r.username, [...(byUsername.get(r.username) ?? []), r.row]);
  }
  for (const r of parsed) {
    const duplicates = byUsername.get(r.username);
    if (duplicates && duplicates.length > 1) {
      r.errors.push(`@${r.username} está repetido en las filas ${duplicates.join(", ")}. Deja una sola fila por persona.`);
    }
  }
  return parsed;
}

/** La vista previa y el guardado aplican las mismas reglas al archivo completo. */
export function reviewLote(
  headers: string[],
  raw: Record<string, string>[],
  mode: LoteMode,
  totalCop: number | null,
) {
  const map = detectColumns(headers);
  const rows = mapRows(raw, map, mode);
  const errors = validateLote(rows, mode, totalCop);
  if (!map.username) errors.unshift("Falta la columna usuario. Agrega el @usuario Orilla de cada persona.");
  if (mode === "amounts" && !map.amount) errors.unshift("Falta la columna monto_cop con el pago en pesos de cada persona.");
  if (mode === "percent" && !map.percent) errors.unshift("Falta la columna porcentaje (%) de cada persona.");
  return { rows, errors };
}

export function validateLote(rows: ParsedRow[], mode: LoteMode, totalCop: number | null) {
  const errors: string[] = [];
  if (rows.length === 0) errors.push("No hay filas.");
  if (rows.length > 40) errors.push("Máximo 40 personas por lote. Divide el archivo en lotes más pequeños.");
  const withErr = rows.filter((r) => r.errors.length);
  if (withErr.length) errors.push(`${withErr.length} fila(s) con errores.`);
  if (mode === "percent") {
    const sum = rows.reduce((a, r) => a + (r.shareBps ?? 0), 0);
    if (sum !== TOTAL_BPS) errors.push(`Los % suman ${(sum / 100).toFixed(2)}%, deben ser 100%.`);
    if (totalCop === null || totalCop <= 0) errors.push("Indica el total del lote en pesos.");
    if (sum === TOTAL_BPS && !withErr.length && totalCop !== null && totalCop > 0 &&
        splitAmount(BigInt(totalCop), rows.map((r) => ({ id: String(r.row), shareBps: r.shareBps! })))
          .some((part) => part.amount === 0n)) {
      errors.push("El total deja personas con $0. Aumenta el total o ajusta los porcentajes.");
    }
  } else if (!Number.isSafeInteger(rows.reduce((sum, r) => sum + (r.amountCop ?? 0), 0))) {
    errors.push("El total es demasiado grande. Divide el archivo en lotes más pequeños.");
  }
  return errors;
}
