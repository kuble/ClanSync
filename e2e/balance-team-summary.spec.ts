import { expect, test } from "@playwright/test";
import { isValidBalanceEstimate, predictionContext } from "../src/components/main-clan/balance-team-insights";
import type { BalanceRoster } from "../src/lib/balance/roster-schema";

const roster: BalanceRoster = { team1: { tank: "0", dmg: ["1", "2"], sup: ["3", "4"] }, team2: { tank: "5", dmg: ["6", "7"], sup: ["8", "9"] } };
const scores = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index), { m: 1, a: 2 }]));
const context = predictionContext(roster, scores, "m", null);
const estimate = { context, team1: 70, sampleSize: 30, confidence: "보통" as const };

test("예측 그래프는 현재 명단·점수 기준의 유효한 결과만 표시한다", () => {
  expect(isValidBalanceEstimate(undefined, context, true)).toBe(false);
  expect(isValidBalanceEstimate(estimate, context, true)).toBe(true);
  expect(isValidBalanceEstimate(estimate, context, false)).toBe(false);
  expect(isValidBalanceEstimate({ ...estimate, context: "stale" }, context, true)).toBe(false);
  expect(isValidBalanceEstimate(estimate, predictionContext(roster, scores, "a", null), true)).toBe(false);
  for (const invalid of [{ sampleSize: 0 }, { team1: 110 }, { team1: Number.NaN }])
    expect(isValidBalanceEstimate({ ...estimate, ...invalid }, context, true)).toBe(false);
});

test("선수 교환·점수 수정은 이전 예측 결과를 무효화한다", () => {
  const swapped = structuredClone(roster);
  [swapped.team1.tank, swapped.team2.tank] = [swapped.team2.tank, swapped.team1.tank];
  expect(isValidBalanceEstimate(estimate, predictionContext(swapped, scores, "m", null), true)).toBe(false);
  const updated = { ...scores, "0": { m: 2, a: 2 } };
  expect(isValidBalanceEstimate(estimate, predictionContext(roster, updated, "m", null), true)).toBe(false);
});
