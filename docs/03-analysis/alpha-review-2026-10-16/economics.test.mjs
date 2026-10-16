import { test } from "node:test";
import assert from "node:assert/strict";
import { estimate } from "./economics.mjs";

test("one clan is one payer; free alpha and cash/economic break-even differ", () => {
  const alpha = estimate({ paidClans: 0, price: 9900, fixedCost: 100000, hours: 20 });
  assert.equal(alpha.grossRevenue, 0);
  assert.equal(alpha.cashProfit, -100000);
  assert.equal(alpha.economicProfit, -500000);
  assert.ok(Math.abs(alpha.contribution - 8403.3) < 0.01);
  assert.equal(alpha.cashBreakEven, 12);
  assert.equal(alpha.economicBreakEven, 60);
  const paid = estimate({ paidClans: 1, price: 9900, fixedCost: 100000, hours: 0 });
  assert.equal(paid.grossRevenue, 9900);
  assert.ok(paid.cashProfit < 0);
});
test("zero price has no paid break-even and invalid assumptions are rejected", () => {
  assert.equal(estimate({ paidClans: 0, price: 0, fixedCost: 100, hours: 0 }).cashBreakEven, null);
  for (const paidClans of [-1, 0.5, Infinity, NaN]) {
    assert.throws(() => estimate({ paidClans, price: 9900, fixedCost: 100000, hours: 0 }), RangeError);
  }
});
