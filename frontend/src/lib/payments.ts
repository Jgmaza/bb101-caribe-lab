// Estados de un pago y reglas para confirmarlo o revertirlo. Lógica pura (sin red ni base).
//
// El hash de cada transacción se guarda ANTES de enviarla. Así, si el request se corta o la red
// no responde, se puede preguntar a Horizon por ese hash y saber con certeza si salió:
//   pending      sin hash: recargando o a punto de firmar; con hash: pago enviado sin confirmar
//   received     el pago llegó a la cuenta del proyecto; falta repartir
//   distributing reparto enviado (filas de distributions ya escritas) sin confirmar
//   distributed  repartido
//   failed       sin payment_tx_hash: el pago no salió; con él: el reparto falló y se puede reintentar

export type PaymentStatus = "pending" | "received" | "distributing" | "distributed" | "failed";

export type PaymentState = {
  status: PaymentStatus;
  payment_tx_hash: string | null;
  distribution_tx_hash: string | null;
  /** Hasta cuándo puede entrar a la red la transacción en curso (su timebound). */
  tx_deadline: string | null;
  created_at: string;
};

export type PaymentPhase =
  | "processing"
  | "confirming"
  | "received"
  | "distributing"
  | "distributed"
  | "payment_failed"
  | "distribution_failed";

/** Resultado de buscar una transacción por hash en Horizon. */
export type TxLookup = "success" | "failed" | "missing" | "unknown";

/** Pasado el plazo de la transacción, margen para que Horizon termine de registrarla. */
const DEADLINE_GRACE_MS = 2 * 60_000;
/** Un pago sin transacción firmada puede estar recargando: 5 rondas de friendbot caben de sobra. */
const UNSIGNED_STALE_MS = 15 * 60_000;
/** Un pago "recibido" se reparte en el mismo request; si sigue así después de esto, se quedó a medias. */
const RECEIVED_STALE_MS = 2 * 60_000;

export function paymentPhase(p: PaymentState): PaymentPhase {
  switch (p.status) {
    case "pending":
      return p.payment_tx_hash ? "confirming" : "processing";
    case "failed":
      return p.payment_tx_hash ? "distribution_failed" : "payment_failed";
    default:
      return p.status;
  }
}

/** Cuánto hay que recargar para cubrir `amount`; 0 si el saldo alcanza. */
export function topUpShortfall(available: bigint, amount: bigint): bigint {
  return available >= amount ? 0n : amount - available;
}

/** La transacción enviada que aún no sabemos si entró. */
export function inFlightHash(p: PaymentState): string | null {
  if (p.status === "pending") return p.payment_tx_hash;
  if (p.status === "distributing") return p.distribution_tx_hash;
  return null;
}

const age = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime();

/**
 * Solo se reintenta un reparto que seguro no salió: "failed" (Stellar lo rechazó o venció sin
 * entrar) o "received" que lleva un rato quieto. Un reparto en curso nunca: pagaría dos veces.
 * La base vuelve a exigirlo al reclamar el pago (begin_distribution).
 */
export function canRetryDistribution(p: PaymentState, now: Date): boolean {
  if (!p.payment_tx_hash) return false;
  if (p.status === "failed") return true;
  return p.status === "received" && age(p.created_at, now) > RECEIVED_STALE_MS;
}

/**
 * Qué hacer con un pago en vuelo según lo que dice la red:
 * - confirm: la transacción entró → avanzar el estado.
 * - revert: seguro no entró (falló, o venció su plazo y no aparece) → marcar como fallido.
 * - wait: todavía no se sabe.
 */
export function reconcileDecision(
  p: PaymentState,
  lookup: TxLookup | null,
  now: Date,
): TxDecision {
  if (p.status !== "pending" && p.status !== "distributing") return "wait";
  return inFlightTxDecision(
    { hash: inFlightHash(p), deadline: p.tx_deadline, since: p.created_at },
    lookup,
    now,
  );
}

export type TxDecision = "confirm" | "revert" | "wait";

/**
 * La regla de arriba para cualquier operación en vuelo (pagos, retiros). `hash` null = aún no
 * se firmó nada; `since` = desde cuándo está en vuelo.
 */
export function inFlightTxDecision(
  tx: { hash: string | null; deadline: string | null; since: string },
  lookup: TxLookup | null,
  now: Date,
): TxDecision {
  if (!tx.hash) {
    // Sin transacción firmada nunca se envió nada: se puede dar por fallido sin riesgo.
    return age(tx.since, now) > UNSIGNED_STALE_MS ? "revert" : "wait";
  }
  if (lookup === "success") return "confirm";
  if (lookup === "failed") return "revert";
  if (lookup === "missing" && tx.deadline && age(tx.deadline, now) > DEADLINE_GRACE_MS) {
    return "revert";
  }
  return "wait";
}
