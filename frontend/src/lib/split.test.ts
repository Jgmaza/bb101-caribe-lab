import assert from "node:assert/strict";
import { test } from "node:test";
import { percentToBps, splitAmount } from "./split";

const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0);

test("banda de 6: cinco al 19% y staff al 5%", () => {
  const shares = [
    ...["a", "b", "c", "d", "e"].map((id) => ({ id, shareBps: 1900 })),
    { id: "staff", shareBps: 500 },
  ];
  const result = splitAmount(1_000_000, shares);
  assert.equal(sum(result), 1_000_000);
  assert.deepEqual(
    result.map((r) => r.amount),
    [190_000, 190_000, 190_000, 190_000, 190_000, 50_000],
  );
});

test("los pesos sobrantes van a las mayores fracciones y la suma es exacta", () => {
  const shares = [
    { id: "a", shareBps: 3333 },
    { id: "b", shareBps: 3333 },
    { id: "c", shareBps: 3334 },
  ];
  const result = splitAmount(100, shares);
  assert.equal(sum(result), 100);
  assert.deepEqual(
    result.map((r) => r.amount),
    [33, 33, 34],
  );

  for (const total of [1, 7, 99, 101, 999_999, 1_234_567]) {
    assert.equal(sum(splitAmount(total, shares)), total);
  }
});

test("rechaza porcentajes que no suman 100% y montos inválidos", () => {
  assert.throws(() => splitAmount(100, [{ id: "a", shareBps: 9_999 }]));
  assert.throws(() => splitAmount(10.5, [{ id: "a", shareBps: 10_000 }]));
  assert.throws(() => splitAmount(-1, [{ id: "a", shareBps: 10_000 }]));
});

test("percentToBps", () => {
  assert.equal(percentToBps("19"), 1900);
  assert.equal(percentToBps("12,5"), 1250);
  assert.equal(percentToBps("33.33"), 3333);
  assert.equal(percentToBps("abc"), null);
  assert.equal(percentToBps("1.234"), null);
});
