import assert from "node:assert/strict";
import { test } from "node:test";
import { detectColumns, detectMode, mapRows, parseSpreadsheetText, validateLote } from "./excel";

test("detecta columnas de un Excel típico de hotel", () => {
  const headers = ["Nombre", "Usuario", "Celular", "Rol", "Valor"];
  const map = detectColumns(headers);
  assert.equal(map.displayName, "Nombre");
  assert.equal(map.username, "Usuario");
  assert.equal(map.phone, "Celular");
  assert.equal(map.role, "Rol");
  assert.equal(map.amount, "Valor");
  assert.equal(detectMode(map), "amounts");
});

test("parsea CSV y valida montos", () => {
  const csv = `nombre,usuario,celular,rol,monto
Laura,athomserx,3001112233,músico,450000
José,jgmaza,3007654321,staff,550000
`;
  const { headers, rows } = parseSpreadsheetText(csv);
  const map = detectColumns(headers);
  const parsed = mapRows(rows, map, "amounts");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].amountCop, 450000);
  assert.deepEqual(validateLote(parsed, "amounts", null), []);
});

test("modo porcentaje exige suma 100", () => {
  const csv = `usuario,%,nombre
athomserx,50,Laura
jgmaza,40,José
`;
  const { headers, rows } = parseSpreadsheetText(csv);
  const map = detectColumns(headers);
  assert.equal(detectMode(map), "percent");
  const parsed = mapRows(rows, map, "percent");
  const errs = validateLote(parsed, "percent", 1_000_000);
  assert.ok(errs.some((e) => e.includes("100%")));
});
