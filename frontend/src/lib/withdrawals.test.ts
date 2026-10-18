import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anchorTransition,
  parseAnchorMemo,
  parseDestination,
  parseMemoText,
  sendingResolution,
} from "./withdrawals";

const VALID = "GBHXFSA2T5JFFVUQ44G2SLESOZOPPAANWMAWJBWK7MKDQJQN4EVH4UYD";

test("parseDestination: dirección Stellar válida, sin espacios ni minúsculas", () => {
  assert.deepEqual(parseDestination(`  ${VALID.toLowerCase()} `), { ok: true, value: VALID });
  assert.equal(parseDestination("").ok, false);
  // checksum malo (último carácter cambiado)
  assert.equal(parseDestination(VALID.slice(0, -1) + "A").ok, false);
  // una clave secreta nunca es un destino
  assert.equal(parseDestination("SBHXFSA2T5JFFVUQ44G2SLESOZOPPAANWMAWJBWK7MKDQJQN4EVH4UYD").ok, false);
});

test("parseMemoText: opcional y de máximo 28 bytes", () => {
  assert.deepEqual(parseMemoText("   "), { ok: true, value: null });
  assert.deepEqual(parseMemoText(" 104223 "), { ok: true, value: "104223" });
  assert.deepEqual(parseMemoText("a".repeat(28)), { ok: true, value: "a".repeat(28) });
  assert.equal(parseMemoText("a".repeat(29)).ok, false);
  // 28 caracteres con tilde ocupan más de 28 bytes
  assert.equal(parseMemoText("á".repeat(15)).ok, false);
});

test("parseAnchorMemo: valida el memo que exige el banco según su tipo", () => {
  assert.deepEqual(parseAnchorMemo("1125919615150934917", "id"), { type: "id", value: "1125919615150934917" });
  assert.equal(parseAnchorMemo("18446744073709551616", "id"), null); // > uint64
  assert.equal(parseAnchorMemo("12a", "id"), null);
  assert.deepEqual(parseAnchorMemo("hola", "text"), { type: "text", value: "hola" });
  assert.equal(parseAnchorMemo("x".repeat(29), "text"), null);
  const hash = Buffer.alloc(32, 7).toString("base64");
  assert.deepEqual(parseAnchorMemo(hash, "hash"), { type: "hash", value: hash });
  assert.equal(parseAnchorMemo(Buffer.alloc(31).toString("base64"), "hash"), null);
  assert.equal(parseAnchorMemo("1", "otro"), null);
  // sin memo no se puede pagar al banco: no sabría de quién es la plata
  assert.equal(parseAnchorMemo(undefined, "id"), null);
});

test("anchorTransition: el estado del banco solo mueve los estados que le corresponden", () => {
  assert.equal(anchorTransition("interactive", "incomplete"), null);
  assert.equal(anchorTransition("interactive", "pending_user_transfer_start"), "ready");
  assert.equal(anchorTransition("ready", "pending_user_transfer_start"), null);
  assert.equal(anchorTransition("interactive", "expired"), "failed");
  assert.equal(anchorTransition("ready", "error"), "failed");
  assert.equal(anchorTransition("processing", "pending_anchor"), null);
  assert.equal(anchorTransition("processing", "completed"), "completed");
  assert.equal(anchorTransition("processing", "refunded"), "failed");
  // antes de que enviemos el pago, el banco no puede dar el retiro por completado
  assert.equal(anchorTransition("ready", "completed"), null);
  // lo que está enviándose se decide con Horizon, no con el banco
  assert.equal(anchorTransition("sending", "error"), null);
  assert.equal(anchorTransition("completed", "error"), null);
  assert.equal(anchorTransition("cancelled", "pending_user_transfer_start"), null);
});

test("sendingResolution: a dónde va un retiro en vuelo según lo que diga la red", () => {
  assert.equal(sendingResolution("wallet", "confirm"), "completed");
  assert.equal(sendingResolution("banco", "confirm"), "processing");
  assert.equal(sendingResolution("wallet", "revert"), "failed");
  // el banco sigue esperando el pago: se puede volver a confirmar
  assert.equal(sendingResolution("banco", "revert"), "ready");
  assert.equal(sendingResolution("banco", "wait"), null);
});
