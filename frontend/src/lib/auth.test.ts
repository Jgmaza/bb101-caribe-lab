import assert from "node:assert/strict";
import { test } from "node:test";
import {
  displayNameError,
  normalizeUsername,
  passwordError,
  safeNext,
  usernameError,
} from "./auth";

test("el usuario se normaliza a minúsculas, sin espacios ni @", () => {
  assert.equal(normalizeUsername("  @Laura_99 "), "laura_99");
  assert.equal(normalizeUsername("BAR_LA_TROJA"), "bar_la_troja");
});

test("usuarios válidos: 3 a 20 letras minúsculas, números o _", () => {
  for (const u of ["abc", "laura", "bar_la_troja", "a1_", "x".repeat(20)]) {
    assert.equal(usernameError(u), null, u);
  }
});

test("usuarios inválidos", () => {
  for (const u of ["", "ab", "x".repeat(21), "laura.m", "laura-m", "Laura", "ñandú", "la ura"]) {
    assert.notEqual(usernameError(u), null, u);
  }
});

test("la contraseña necesita al menos 8 caracteres y máximo 72 bytes (límite de bcrypt)", () => {
  assert.notEqual(passwordError("1234567"), null);
  assert.equal(passwordError("12345678"), null);
  assert.equal(passwordError("a".repeat(72)), null);
  assert.notEqual(passwordError("a".repeat(73)), null);
  // 25 caracteres de 3 bytes = 75 bytes
  assert.notEqual(passwordError("€".repeat(25)), null);
});

test("el nombre visible va de 2 a 60 caracteres", () => {
  assert.notEqual(displayNameError("L"), null);
  assert.equal(displayNameError("Laura"), null);
  assert.notEqual(displayNameError("x".repeat(61)), null);
});

test("safeNext solo acepta rutas internas", () => {
  assert.equal(safeNext("/pagar/los-pescadores"), "/pagar/los-pescadores");
  assert.equal(safeNext("/inicio?x=1"), "/inicio?x=1");
  assert.equal(safeNext(null), "/inicio");
  assert.equal(safeNext(""), "/inicio");
  assert.equal(safeNext("https://malo.com"), "/inicio");
  assert.equal(safeNext("//malo.com"), "/inicio");
  assert.equal(safeNext("/\\malo.com"), "/inicio");
  assert.equal(safeNext("inicio"), "/inicio");
});
