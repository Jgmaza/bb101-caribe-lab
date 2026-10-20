/**
 * Suite del flujo MVP: empresa (Excel → lote → cerrar) + trabajador (Te pagaron → banco).
 * Prueba la lógica pura de cada eslabón (sin red/DB).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  displayNameError,
  normalizeUsername,
  passwordError,
  safeNext,
  usernameError,
} from "./auth";
import {
  detectColumns,
  detectMode,
  mapRows,
  parseSpreadsheetText,
  validateLote,
} from "./excel";
import { copToStroops, parseCop, stroopsToCop } from "./money";
import { canRetryDistribution, paymentPhase, topUpShortfall } from "./payments";
import { normalizeRole } from "./roles";
import { splitAmount, TOTAL_BPS } from "./split";
import {
  anchorTransition,
  parseDestination,
  sendingResolution,
} from "./withdrawals";

const plantilla = join(dirname(fileURLToPath(import.meta.url)), "../../public/plantilla-lote-caribe.csv");

// --- 1. Registro / identidad (cuenta Orilla; wallet custodial detrás) ---

test("MVP · registro: username y contraseña válidos para cuenta Orilla", () => {
  assert.equal(normalizeUsername("@Laura"), "laura");
  assert.equal(usernameError("laura"), null);
  assert.equal(usernameError("ab"), "El username debe tener entre 3 y 20 letras sin tildes, números o _.");
  assert.equal(passwordError("OrillaStaff2026!"), null);
  assert.equal(passwordError("corta"), "La contraseña debe tener al menos 8 caracteres.");
  assert.equal(displayNameError("Laura Méndez"), null);
});

test("MVP · auth: safeNext solo vuelve a rutas internas (empresa o cobrar)", () => {
  assert.equal(safeNext("/lotes"), "/lotes");
  assert.equal(safeNext("/inicio"), "/inicio");
  assert.equal(safeNext("https://evil.com"), "/inicio");
});

// --- 2. Empresa: Excel / CSV ---

test("MVP · Excel: la plantilla pública de Caribe se interpreta en modo montos", () => {
  const csv = readFileSync(plantilla, "utf8");
  const { headers, rows } = parseSpreadsheetText(csv);
  const map = detectColumns(headers);
  assert.equal(detectMode(map), "amounts");
  assert.ok(map.username && map.amount && map.role && map.displayName);

  const parsed = mapRows(rows, map, "amounts");
  assert.equal(parsed.length, 5);
  assert.ok(parsed.every((r) => r.username && r.amountCop && r.amountCop > 0));
  for (const u of ["laura", "andres", "pedro", "athomserx", "jgmaza"]) {
    assert.ok(parsed.some((r) => r.username === u), `falta @${u}`);
  }
  assert.deepEqual(validateLote(parsed, "amounts", null), []);
});

test("MVP · Excel: modo porcentajes + total de noche", () => {
  const csv = `usuario,nombre,rol,%
laura,Laura Méndez,staff,40
andres,Andrés,músico,35
pedro,Pedro,sonido,25
`;
  const { headers, rows } = parseSpreadsheetText(csv);
  const map = detectColumns(headers);
  assert.equal(detectMode(map), "percent");
  const parsed = mapRows(rows, map, "percent");
  const sum = parsed.reduce((a, r) => a + (r.shareBps ?? 0), 0);
  assert.equal(sum, TOTAL_BPS);
  assert.deepEqual(validateLote(parsed, "percent", 1_000_000), []);
  assert.ok(validateLote(parsed, "percent", null).some((e) => /total/i.test(e)));
});

test("MVP · Excel: rechaza lotes > 40 filas (límite Horizon del MVP)", () => {
  const header = "usuario,monto\n";
  const body = Array.from({ length: 41 }, (_, i) => `user${String(i).padStart(2, "0")},1000`).join("\n");
  // usernames deben ser 3-20 chars válidos
  const bodyOk = Array.from({ length: 41 }, (_, i) => `u${String(i).padStart(3, "0")},1000`).join("\n");
  const { headers, rows } = parseSpreadsheetText(header + bodyOk);
  const map = detectColumns(headers);
  const parsed = mapRows(rows, map, "amounts");
  assert.ok(validateLote(parsed, "amounts", null).some((e) => /40/.test(e)));
});

test("MVP · roles: el Excel normaliza cargo a roles de evento", () => {
  assert.equal(normalizeRole("músico"), "músico");
  assert.equal(normalizeRole("Staff"), "staff");
  assert.equal(normalizeRole("sonido"), "sonido");
});

// --- 3. Cerrar la noche: montos → stroops → splits ---

test("MVP · cerrar noche (montos): cada fila se convierte a stroops con tasa fija", () => {
  const rate = 4000; // COP por USDC (demo)
  const rows = [
    { username: "laura", amountCop: 320_000 },
    { username: "andres", amountCop: 280_000 },
  ];
  const splits = rows.map((r) => ({
    username: r.username,
    stroops: copToStroops(r.amountCop, rate),
  }));
  assert.ok(splits[0].stroops > 0n);
  assert.equal(stroopsToCop(splits[0].stroops, rate), 320_000);
  const total = splits.reduce((a, s) => a + s.stroops, 0n);
  assert.equal(stroopsToCop(total, rate), 600_000);
});

test("MVP · cerrar noche (%): splitAmount reparte el total exacto entre integrantes", () => {
  const totalCop = 1_000_000n;
  const parts = splitAmount(totalCop, [
    { id: "laura", shareBps: 4000 },
    { id: "andres", shareBps: 3500 },
    { id: "pedro", shareBps: 2500 },
  ]);
  assert.equal(parts.reduce((a, p) => a + p.amount, 0n), totalCop);
  assert.equal(parts.find((p) => p.id === "laura")!.amount, 400_000n);
});

test("MVP · cerrar noche: si el saldo no alcanza, topUpShortfall pide la diferencia", () => {
  assert.equal(topUpShortfall(100n, 500n), 400n);
  assert.equal(topUpShortfall(500n, 500n), 0n);
});

test("MVP · parseCop entiende formatos de Excel colombiano", () => {
  assert.equal(parseCop("320000"), 320000);
  assert.equal(parseCop("$ 320.000"), 320000);
  assert.equal(parseCop("1.000.000"), 1000000);
});

// --- 4. Trabajador: Te pagaron / estados de pago ---

test("MVP · Te pagaron: paymentPhase distingue pago ok vs fallo de reparto", () => {
  assert.equal(
    paymentPhase({
      status: "distributed",
      payment_tx_hash: "a".repeat(64),
      distribution_tx_hash: "b".repeat(64),
      tx_deadline: null,
      created_at: new Date().toISOString(),
    }),
    "distributed",
  );
  assert.equal(
    paymentPhase({
      status: "failed",
      payment_tx_hash: "a".repeat(64),
      distribution_tx_hash: null,
      tx_deadline: null,
      created_at: new Date().toISOString(),
    }),
    "distribution_failed",
  );
});

test("MVP · admin puede reintentar reparto fallido", () => {
  const now = new Date();
  assert.equal(
    canRetryDistribution(
      {
        status: "failed",
        payment_tx_hash: "a".repeat(64),
        distribution_tx_hash: null,
        tx_deadline: null,
        created_at: now.toISOString(),
      },
      now,
    ),
    true,
  );
});

// --- 5. Pasar a mi banco / otra cuenta ---

test("MVP · retiro: valida destino y flujo banco de prueba (SEP-24)", () => {
  const dest = parseDestination("GDXMMYHS2LW6GTRW6FKV2IBYIBN5OKTJFFE6AUGLZ2EKAVPZDQY4EYPH");
  assert.equal(dest.ok, true);
  assert.equal(anchorTransition("interactive", "pending_user_transfer_start"), "ready");
  assert.equal(sendingResolution("banco", "confirm"), "processing");
  assert.equal(sendingResolution("wallet", "confirm"), "completed");
});
