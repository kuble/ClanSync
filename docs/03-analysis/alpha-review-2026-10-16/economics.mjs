/** Planning assumptions, not a payment ledger or tax calculation. */
export function estimate({ paidClans, price, fixedCost, hours, hourlyRate = 20000 }) {
  for (const value of [paidClans, price, fixedCost, hours, hourlyRate]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Enter non-negative finite values");
  }
  if (!Number.isSafeInteger(paidClans)) throw new RangeError("Clan count must be an integer");
  const netPrice = price / 1.1;
  const contribution = netPrice - price * 0.033 - netPrice * 0.03;
  const labor = hours * hourlyRate;
  return {
    grossRevenue: paidClans * price,
    contribution,
    cashProfit: paidClans * contribution - fixedCost,
    economicProfit: paidClans * contribution - fixedCost - labor,
    cashBreakEven: contribution > 0 ? Math.ceil(fixedCost / contribution) : null,
    economicBreakEven: contribution > 0 ? Math.ceil((fixedCost + labor) / contribution) : null,
  };
}
