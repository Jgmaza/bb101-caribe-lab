export const TOTAL_BPS = 10_000;

export type Share = { id: string; shareBps: number };
export type Split = { id: string; shareBps: number; amount: bigint };

/**
 * Reparte un monto entero (stroops, o pesos en las vistas previas) según puntos básicos con el
 * método de mayor residuo: cada parte se redondea hacia abajo y las unidades sobrantes van a
 * quienes tenían mayor fracción. La suma de las partes es siempre exactamente `total`.
 * BigInt: en stroops, `total * shareBps` supera 2^53.
 */
export function splitAmount(total: bigint, shares: Share[]): Split[] {
  if (total < 0n) throw new Error("El monto no puede ser negativo");
  const sum = shares.reduce((acc, s) => acc + s.shareBps, 0);
  if (sum !== TOTAL_BPS || shares.some((s) => !Number.isInteger(s.shareBps) || s.shareBps < 0)) {
    throw new Error(`Los porcentajes deben sumar 100% (suman ${sum / 100}%)`);
  }

  const bps = BigInt(TOTAL_BPS);
  const parts = shares.map((s, index) => {
    const product = total * BigInt(s.shareBps);
    return { ...s, index, amount: product / bps, remainder: product % bps };
  });

  let leftover = total - parts.reduce((acc, p) => acc + p.amount, 0n);
  const byRemainder = [...parts].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const p of byRemainder) {
    if (leftover === 0n) break;
    p.amount += 1n;
    leftover -= 1n;
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
