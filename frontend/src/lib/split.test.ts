import assert from "node:assert/strict";
import { test } from "node:test";
import { percentToBps, splitAmount } from "./split";

const sum = (xs: { amount: bigint }[]) => xs.reduce((a, x) => a + x.amount, 0n);

test("banda de 6: cinco al 19% y staff al 5%", () => {
  const shares = [
    ...["a", "b", "c", "d", "e"].map((id) => ({ id, shareBps: 1900 })),
    { id: "staff", shareBps: 500 },
  ];
  const result = splitAmount(1_000_000n, shares);
  assert.equal(sum(result), 1_000_000n);
  assert.deepEqual(
    result.map((r) => r.amount),
    [190_000n, 190_000n, 190_000n, 190_000n, 190_000n, 50_000n],
  );
});

test("las unidades sobrantes van a las mayores fracciones y la suma es exacta", () => {
  const shares = [
    { id: "a", shareBps: 3333 },
    { id: "b", shareBps: 3333 },
    { id: "c", shareBps: 3334 },
  ];
  const result = splitAmount(100n, shares);
  assert.equal(sum(result), 100n);
  assert.deepEqual(
    result.map((r) => r.amount),
    [33n, 33n, 34n],
  );

  for (const total of [1n, 7n, 99n, 101n, 999_999n, 1_234_567n]) {
    assert.equal(sum(splitAmount(total, shares)), total);
  }
});

test("montos grandes en stroops: total * bps supera 2^53 y sigue siendo exacto", () => {
  // 50.000 XLM en stroops = 5e11; × 3333 bps ≈ 1,7e15. Con 10M XLM ≈ 3e20, muy por encima de 2^53.
  const shares = [
    { id: "laura", shareBps: 4500 },
    { id: "andres", shareBps: 4500 },
    { id: "pedro", shareBps: 1000 },
  ];
  for (const total of [500_000_000_000n, 100_000_000_000_000_001n, 2n ** 70n + 3n]) {
    const result = splitAmount(total, shares);
    assert.equal(sum(result), total);
    assert.ok(result.every((r) => r.amount >= 0n));
  }
  const big = splitAmount(100_000_000_000_000_001n, shares);
  assert.deepEqual(
    big.map((r) => r.amount),
    // empate de residuo entre laura y andres: el stroop sobrante va al primero
    [45_000_000_000_000_001n, 45_000_000_000_000_000n, 10_000_000_000_000_000n],
  );
});

test("rechaza porcentajes que no suman 100% y montos negativos", () => {
  assert.throws(() => splitAmount(100n, [{ id: "a", shareBps: 9_999 }]));
  assert.throws(() => splitAmount(-1n, [{ id: "a", shareBps: 10_000 }]));
});

test("percentToBps", () => {
  assert.equal(percentToBps("19"), 1900);
  assert.equal(percentToBps("12,5"), 1250);
  assert.equal(percentToBps("33.33"), 3333);
  assert.equal(percentToBps("abc"), null);
  assert.equal(percentToBps("1.234"), null);
});
