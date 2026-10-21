import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { detectColumns, detectMode, mapRows, parseSpreadsheetBinary, parseSpreadsheetText, reviewLote, spreadsheetFileError, validateLote } from "./excel";

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

function reviewCsv(csv: string, mode: "amounts" | "percent" = "amounts", total: number | null = null) {
  const { headers, rows } = parseSpreadsheetText(csv);
  return reviewLote(headers, rows, mode, total);
}

test("no omite un pago que no tiene destinatario", () => {
  const result = reviewCsv("usuario,monto_cop\nlaura,1000\n,2000");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1].amountCop, 2000);
  assert.ok(result.rows[1].errors.includes("Falta usuario Orilla (@)"));
  assert.ok(result.errors.length);
});

test("ignora filas totalmente vacías y conserva la fila del error en CSV y Excel", () => {
  const csv = "usuario,monto_cop\nlaura,1000\n\npedro,no es un monto";
  const csvResult = reviewCsv(csv);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["usuario", "monto_cop"], ["laura", 1000], [], ["pedro", "no es un monto"],
  ]), "Pagos");
  const parsed = parseSpreadsheetBinary(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  const excelResult = reviewLote(parsed.headers, parsed.rows, "amounts", null);
  for (const result of [csvResult, excelResult]) {
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[1].row, 4);
    assert.ok(result.rows[1].errors.includes("Monto inválido"));
  }
});

test("detecta duplicados incluso con mayúsculas y @, sin sumar pagos repetidos como válidos", () => {
  const result = reviewCsv("usuario,monto_cop\n@Laura,1000\nLAURA,2000");
  assert.ok(result.errors.length);
  assert.ok(result.rows.every((r) => r.errors.some((e) => e.includes("filas 2, 3"))));
});

test("no recorta usuarios inválidos hasta convertirlos en otro destinatario", () => {
  const username = "usuario_demasiado_largo_para_orilla";
  const result = reviewCsv(`usuario,monto_cop\n${username},1000`);
  assert.equal(result.rows[0].username, username);
  assert.ok(result.rows[0].errors.some((e) => e.includes("Usuario inválido")));
});

test("explica las columnas requeridas y evita coincidencias parciales de encabezados", () => {
  const map = detectColumns(["Control", "Usuarios pendientes", "Monto anterior", "monto_cop", "usuario"]);
  assert.equal(map.role, undefined);
  assert.equal(map.amount, "monto_cop");
  assert.equal(map.username, "usuario");
  const result = reviewCsv("nombre,valor\nLaura,1000");
  assert.ok(result.errors.some((e) => e.includes("columna usuario")));
  assert.ok(reviewCsv("usuario,porcentaje\nlaura,100").errors.some((e) => e.includes("columna monto_cop")));
  assert.ok(reviewCsv("usuario,monto\nlaura,1000", "percent", 1000).errors.some((e) => e.includes("columna porcentaje")));
});

test("porcentajes requieren total explícito y ninguna persona puede recibir cero pesos", () => {
  const csv = "usuario,porcentaje\nlaura,99\npedro,1";
  assert.ok(reviewCsv(csv, "percent").errors.some((e) => e.includes("total")));
  assert.ok(reviewCsv(csv, "percent", 2).errors.some((e) => e.includes("$0")));
  assert.deepEqual(reviewCsv(csv, "percent", 100).errors, []);
});

test("rechaza totales que pierden precisión al sumar montos grandes", () => {
  const csv = "usuario,monto_cop\n" + Array.from({ length: 10 }, (_, i) => `user${i},999999999999999`).join("\n");
  assert.ok(reviewCsv(csv).errors.some((e) => e.includes("total es demasiado grande")));
});

test("rechaza archivos vacíos, extensiones incorrectas y archivos mayores al límite", () => {
  assert.match(spreadsheetFileError({ name: "pagos.csv", size: 0 })!, /vacío/);
  assert.match(spreadsheetFileError({ name: "pagos.txt", size: 100 })!, /Excel/);
  assert.match(spreadsheetFileError({ name: "pagos.xlsx", size: 1_500_001 })!, /1,5 MB/);
  for (const name of ["pagos.csv", "pagos.xlsx", "PAGOS.XLS"]) {
    assert.equal(spreadsheetFileError({ name, size: 1_500_000 }), null);
  }
});
