import { StrKey } from "@stellar/stellar-sdk";
import type { TxDecision } from "./payments";

// Retiros: a otra cuenta Stellar ("wallet") o a un banco de prueba vía anchor SEP-24 ("banco").
// Lógica pura (sin red ni base). Estados:
//   interactive  banco: la persona llena los datos de su banco en la página del anchor
//   ready        banco: el anchor espera nuestro pago (ya dio cuenta, memo y monto)
//   sending      pago firmado con su hash guardado, sin confirmar (sin hash: preparándose)
//   processing   banco: el pago llegó al anchor; falta que el banco lo complete
//   completed / failed / cancelled

export type WithdrawalKind = "wallet" | "banco";
export type WithdrawalStatus =
  | "interactive"
  | "ready"
  | "sending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export const FINAL_STATUSES: WithdrawalStatus[] = ["completed", "failed", "cancelled"];

/** Para crear una cuenta que no existe hay que mandarle al menos la reserva mínima (1 XLM). */
export const MIN_NEW_ACCOUNT_STROOPS = 10_000_000n;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseDestination(input: string): Parsed<string> {
  const value = input.trim().toUpperCase();
  if (!StrKey.isValidEd25519PublicKey(value)) {
    return { ok: false, error: "Esa dirección no es válida. Debe empezar con G y tener 56 caracteres." };
  }
  return { ok: true, value };
}

const MAX_MEMO_TEXT_BYTES = 28;
const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

/** Memo opcional para retiros a otra cuenta (los exchanges suelen pedirlo). */
export function parseMemoText(input: string): Parsed<string | null> {
  const value = input.trim();
  if (!value) return { ok: true, value: null };
  if (utf8Bytes(value) > MAX_MEMO_TEXT_BYTES) {
    return { ok: false, error: "El memo es muy largo: máximo 28 caracteres sin tildes." };
  }
  return { ok: true, value };
}

export type AnchorMemo = { type: "text" | "id" | "hash"; value: string };

const MAX_UINT64 = 2n ** 64n - 1n;

/** El memo que el anchor exige en el pago (withdraw_memo / withdraw_memo_type). null si no sirve. */
export function parseAnchorMemo(value: unknown, type: unknown): AnchorMemo | null {
  if (typeof value !== "string" || !value) return null;
  switch (type) {
    case "id":
      return /^\d{1,20}$/.test(value) && BigInt(value) <= MAX_UINT64 ? { type, value } : null;
    case "text":
      return utf8Bytes(value) <= MAX_MEMO_TEXT_BYTES ? { type, value } : null;
    case "hash":
      return Buffer.from(value, "base64").length === 32 ? { type, value } : null;
    default:
      return null;
  }
}

// Estados de SEP-24 que terminan el retiro sin éxito.
const ANCHOR_FAILED = new Set(["error", "expired", "refunded", "no_market", "too_small", "too_large"]);

/**
 * Cómo cambia nuestro estado según el estado del retiro en el anchor. null = sin cambio.
 * El anchor solo decide antes de que enviemos (interactive/ready) y después de que el pago
 * llegó (processing). Mientras se envía, decide Horizon.
 */
export function anchorTransition(current: WithdrawalStatus, anchorStatus: string): WithdrawalStatus | null {
  if (current === "interactive" || current === "ready") {
    if (ANCHOR_FAILED.has(anchorStatus)) return "failed";
    if (current === "interactive" && anchorStatus === "pending_user_transfer_start") return "ready";
    return null;
  }
  if (current === "processing") {
    if (anchorStatus === "completed") return "completed";
    if (ANCHOR_FAILED.has(anchorStatus)) return "failed";
  }
  return null;
}

/** Estado de un retiro "sending" según la decisión de reconciliar su transacción. */
export function sendingResolution(kind: WithdrawalKind, decision: TxDecision): WithdrawalStatus | null {
  if (decision === "confirm") return kind === "banco" ? "processing" : "completed";
  // Si el pago al banco no salió, el anchor sigue esperándolo: se puede confirmar de nuevo.
  if (decision === "revert") return kind === "banco" ? "ready" : "failed";
  return null;
}
