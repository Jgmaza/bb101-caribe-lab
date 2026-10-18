// Montos: en Stellar todo va en stroops (1 XLM = 10.000.000), siempre BigInt.
// En pantalla todo va en pesos, convertidos con una tasa COP por XLM.

export const STROOPS_PER_XLM = 10_000_000n;
/** Tope por pago: cabe en las recargas automáticas (5 × 10.000 XLM) con margen. */
export const MAX_PAYMENT_COP = 20_000_000;

const BASE_RESERVE = 5_000_000n; // 0,5 XLM por entrada de la cuenta
const FEE_MARGIN = 100_000n; // 0,01 XLM: alcanza para ~100 comisiones de testnet

/** "10000.5" → 100005000000n. Exacto: no pasa por números de punto flotante. */
export function xlmToStroops(xlm: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(xlm.trim());
  if (!match) throw new Error(`Monto XLM inválido: ${xlm}`);
  return BigInt(match[1]) * STROOPS_PER_XLM + BigInt((match[2] ?? "").padEnd(7, "0"));
}

/** 15000000n → "1.5": el formato que espera el SDK de Stellar. */
export function stroopsToXlm(stroops: bigint): string {
  if (stroops < 0n) throw new Error("Monto negativo");
  const whole = stroops / STROOPS_PER_XLM;
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function copToStroops(cop: number, copPerXlm: number): bigint {
  if (!Number.isSafeInteger(cop) || cop < 0) throw new Error("Monto en pesos inválido");
  if (!(copPerXlm > 0)) throw new Error("Tasa inválida");
  return BigInt(Math.round((cop * 1e7) / copPerXlm));
}

export function stroopsToCop(stroops: bigint, copPerXlm: number): number {
  return Math.round((Number(stroops) * copPerXlm) / 1e7);
}

/** "$ 1.000.000" → 1000000. null si no es un entero positivo. */
export function parseCop(value: string): number | null {
  const cleaned = value.replace(/[\s$.]/g, "");
  if (!/^\d{1,15}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Lo que la cuenta puede gastar: balance − reserva mínima − liabilities − margen de comisiones.
 * Reserva mínima de Stellar = (2 + subentradas + patrocinando − patrocinadas) × 0,5 XLM.
 */
export function availableStroops(account: {
  balance: string;
  subentries: number;
  sponsoring: number;
  sponsored: number;
  sellingLiabilities: string;
}): bigint {
  const entries = BigInt(2 + account.subentries + account.sponsoring - account.sponsored);
  const free =
    xlmToStroops(account.balance) -
    entries * BASE_RESERVE -
    xlmToStroops(account.sellingLiabilities) -
    FEE_MARGIN;
  return free > 0n ? free : 0n;
}
