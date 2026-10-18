import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canRetryDistribution,
  inFlightHash,
  paymentPhase,
  reconcileDecision,
  topUpShortfall,
  type PaymentState,
} from "./payments";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const NOW = new Date("2026-10-18T20:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

function payment(overrides: Partial<PaymentState>): PaymentState {
  return {
    status: "pending",
    payment_tx_hash: null,
    distribution_tx_hash: null,
    tx_deadline: null,
    created_at: minutesAgo(1),
    ...overrides,
  };
}

test("topUpShortfall: lo que falta para pagar, o 0 si el saldo alcanza", () => {
  assert.equal(topUpShortfall(100n, 30n), 0n);
  assert.equal(topUpShortfall(30n, 30n), 0n);
  assert.equal(topUpShortfall(10n, 30n), 20n);
  assert.equal(topUpShortfall(0n, 8_000_000_000n), 8_000_000_000n);
});

test("paymentPhase distingue un pago que no salió de un reparto fallido", () => {
  assert.equal(paymentPhase(payment({})), "processing");
  assert.equal(paymentPhase(payment({ payment_tx_hash: HASH_A })), "confirming");
  assert.equal(paymentPhase(payment({ status: "received", payment_tx_hash: HASH_A })), "received");
  assert.equal(
    paymentPhase(payment({ status: "distributing", payment_tx_hash: HASH_A, distribution_tx_hash: HASH_B })),
    "distributing",
  );
  assert.equal(
    paymentPhase(payment({ status: "distributed", payment_tx_hash: HASH_A, distribution_tx_hash: HASH_B })),
    "distributed",
  );
  assert.equal(paymentPhase(payment({ status: "failed" })), "payment_failed");
  assert.equal(paymentPhase(payment({ status: "failed", payment_tx_hash: HASH_A })), "distribution_failed");
});

test("inFlightHash: la transacción que hay que confirmar según el estado", () => {
  assert.equal(inFlightHash(payment({ payment_tx_hash: HASH_A })), HASH_A);
  assert.equal(inFlightHash(payment({})), null);
  assert.equal(
    inFlightHash(payment({ status: "distributing", payment_tx_hash: HASH_A, distribution_tx_hash: HASH_B })),
    HASH_B,
  );
  assert.equal(inFlightHash(payment({ status: "received", payment_tx_hash: HASH_A })), null);
  assert.equal(inFlightHash(payment({ status: "failed", payment_tx_hash: HASH_A })), null);
});

test("canRetryDistribution: fallido con pago recibido, o recibido hace rato sin reparto en curso", () => {
  assert.equal(canRetryDistribution(payment({ status: "failed", payment_tx_hash: HASH_A }), NOW), true);
  // nunca salió el pago: no hay nada que repartir
  assert.equal(canRetryDistribution(payment({ status: "failed" }), NOW), false);
  // recién recibido: el reparto del mismo request está por empezar
  assert.equal(
    canRetryDistribution(payment({ status: "received", payment_tx_hash: HASH_A, created_at: minutesAgo(0.5) }), NOW),
    false,
  );
  assert.equal(
    canRetryDistribution(payment({ status: "received", payment_tx_hash: HASH_A, created_at: minutesAgo(10) }), NOW),
    true,
  );
  // un reparto en curso o ya hecho nunca se reintenta: pagaría dos veces
  const distributing = payment({
    status: "distributing",
    payment_tx_hash: HASH_A,
    distribution_tx_hash: HASH_B,
    created_at: minutesAgo(60),
  });
  assert.equal(canRetryDistribution(distributing, NOW), false);
  assert.equal(canRetryDistribution({ ...distributing, status: "distributed" }, NOW), false);
});

test("reconcileDecision: confirma lo que está en la red y revierte solo lo que ya no puede entrar", () => {
  const inFlight = payment({ payment_tx_hash: HASH_A, tx_deadline: minutesAgo(1) });

  assert.equal(reconcileDecision(inFlight, "success", NOW), "confirm");
  // la transacción entró pero falló: sus operaciones no se aplicaron
  assert.equal(reconcileDecision(inFlight, "failed", NOW), "revert");
  // no aparece pero aún podría entrar (dentro del plazo + margen)
  assert.equal(reconcileDecision(inFlight, "missing", NOW), "wait");
  assert.equal(
    reconcileDecision({ ...inFlight, tx_deadline: minutesAgo(10) }, "missing", NOW),
    "revert",
  );
  // si Horizon no respondió no se decide nada
  assert.equal(reconcileDecision({ ...inFlight, tx_deadline: minutesAgo(10) }, "unknown", NOW), "wait");

  // reparto en curso: misma regla con su propio hash
  const distributing = payment({
    status: "distributing",
    payment_tx_hash: HASH_A,
    distribution_tx_hash: HASH_B,
    tx_deadline: minutesAgo(10),
  });
  assert.equal(reconcileDecision(distributing, "success", NOW), "confirm");
  assert.equal(reconcileDecision(distributing, "missing", NOW), "revert");
});

test("reconcileDecision: un pago sin transacción firmada solo se da por perdido tras un buen rato", () => {
  // puede estar recargando (hasta 5 rondas de friendbot)
  assert.equal(reconcileDecision(payment({ created_at: minutesAgo(5) }), null, NOW), "wait");
  assert.equal(reconcileDecision(payment({ created_at: minutesAgo(20) }), null, NOW), "revert");
  // los estados finales o sin nada en vuelo no cambian
  assert.equal(reconcileDecision(payment({ status: "received", payment_tx_hash: HASH_A }), null, NOW), "wait");
  assert.equal(reconcileDecision(payment({ status: "failed", created_at: minutesAgo(60) }), null, NOW), "wait");
});
