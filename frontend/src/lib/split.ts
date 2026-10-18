export const TOTAL_BPS = 10_000;
export const MAX_AMOUNT = 100_000_000_000;

export type Share = { id: string; shareBps: number };
export type Split = { id: string; shareBps: number; amount: number };

/**
 * Reparte un monto entero (COP) según puntos básicos con el método de mayor residuo:
 * cada parte se redondea hacia abajo y los pesos sobrantes van a quienes tenían mayor fracción.
 * La suma de las partes es siempre exactamente `total`.
 */
export function splitAmount(total: number, shares: Share[]): Split[] {
  if (!Number.isSafeInteger(total) || total < 0 || total > MAX_AMOUNT) {
    throw new Error("El monto debe ser un entero entre 0 y 100.000.000.000");
  }
  const sum = shares.reduce((acc, s) => acc + s.shareBps, 0);
  if (sum !== TOTAL_BPS) {
    throw new Error(`Los porcentajes deben sumar 100% (suman ${sum / 100}%)`);
  }

  const parts = shares.map((s, index) => {
    // total * shareBps ≤ 1e15 < 2^53: aritmética entera exacta.
    const product = total * s.shareBps;
    return {
      ...s,
      index,
      amount: Math.floor(product / TOTAL_BPS),
      remainder: product % TOTAL_BPS,
    };
  });

  let leftover = total - parts.reduce((acc, p) => acc + p.amount, 0);
  const byRemainder = [...parts].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (const p of byRemainder) {
    if (leftover === 0) break;
    p.amount += 1;
    leftover -= 1;
  }

  return parts.map(({ id, shareBps, amount }) => ({ id, shareBps, amount }));
}

/** "12.5" → 1250 bps. Acepta coma o punto decimal, hasta dos decimales. */
export function percentToBps(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
