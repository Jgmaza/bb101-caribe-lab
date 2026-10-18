import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availableStroops,
  copToStroops,
  parseCop,
  stroopsToCop,
  stroopsToXlm,
  xlmToStroops,
} from "./money";

test("xlmToStroops y stroopsToXlm son inversas y exactas", () => {
  assert.equal(xlmToStroops("10000.0000000"), 100_000_000_000n);
  assert.equal(xlmToStroops("1.5"), 15_000_000n);
  assert.equal(xlmToStroops("0.0000001"), 1n);
  assert.equal(xlmToStroops("922337203685.4775807"), 9_223_372_036_854_775_807n);
  assert.equal(stroopsToXlm(15_000_000n), "1.5");
  assert.equal(stroopsToXlm(1n), "0.0000001");
  assert.equal(stroopsToXlm(100_000_000_000n), "10000");
  assert.equal(stroopsToXlm(9_223_372_036_854_775_807n), "922337203685.4775807");
  assert.throws(() => xlmToStroops("1.00000001"));
  assert.throws(() => xlmToStroops("abc"));
});

test("pesos ↔ stroops con una tasa fija", () => {
  // 1 XLM = 1.250 COP → 1.000.000 COP = 800 XLM
  assert.equal(copToStroops(1_000_000, 1250), 8_000_000_000n);
  assert.equal(stroopsToCop(8_000_000_000n, 1250), 1_000_000);
  // redondeo al stroop más cercano
  assert.equal(copToStroops(1, 3), 3_333_333n);
  assert.equal(stroopsToCop(3_333_333n, 3), 1);
  assert.throws(() => copToStroops(100, 0));
  assert.throws(() => copToStroops(1.5, 1000));
});

test("parseCop acepta puntos de miles y rechaza decimales o basura", () => {
  assert.equal(parseCop("1.000.000"), 1_000_000);
  assert.equal(parseCop("$ 25.000"), 25_000);
  assert.equal(parseCop("0"), null);
  assert.equal(parseCop("12,5"), null);
  assert.equal(parseCop("abc"), null);
  assert.equal(parseCop(""), null);
});

test("saldo disponible = balance − reserva mínima − margen de comisiones", () => {
  // cuenta sin subentradas: reserva 2 × 0,5 XLM = 1 XLM; margen 0,01 XLM
  assert.equal(
    availableStroops({ balance: "1.5000000", subentries: 0, sponsoring: 0, sponsored: 0, sellingLiabilities: "0" }),
    4_900_000n,
  );
  // con una subentrada la reserva sube a 1,5 XLM
  assert.equal(
    availableStroops({ balance: "11.5000000", subentries: 1, sponsoring: 0, sponsored: 0, sellingLiabilities: "0" }),
    99_900_000n,
  );
  // nunca negativo
  assert.equal(
    availableStroops({ balance: "1.0000000", subentries: 0, sponsoring: 0, sponsored: 0, sellingLiabilities: "0" }),
    0n,
  );
});
