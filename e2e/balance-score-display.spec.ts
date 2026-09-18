import { expect, test } from "@playwright/test";
import { formatBalanceScore, scoreComparisonShare, teamScoreTotal } from "../src/lib/balance/score-display";
import type { TeamRoster } from "../src/lib/balance/roster-schema";

test("점수 합계는 소수·음수·미등록을 구분한다", () => {
  const team: TeamRoster = { tank: "a", dmg: ["b", null], sup: [null, null] };
  const scores = { a: { m: 1.75, a: 0.1 }, b: { m: -3.25, a: 0.2 } };
  expect(formatBalanceScore(teamScoreTotal(team, scores, "m"))).toBe("-1.5점");
  expect(formatBalanceScore(teamScoreTotal(team, scores, "a"))).toBe("+0.3점");
  expect(formatBalanceScore(0)).toBe("0점");
  expect(teamScoreTotal(team, { a: scores.a }, "m")).toBeNull();
  expect(teamScoreTotal(team, { ...scores, b: { m: 0, a: null } }, "a")).toBeNull();
  expect(formatBalanceScore(null)).toBe("—");
});

test("서로 다른 부호의 팀 점수도 VS 막대 비율로 비교한다", () => {
  expect(scoreComparisonShare(2, 2)).toBe(50);
  expect(scoreComparisonShare(3, 1)).toBe(75);
  expect(scoreComparisonShare(-1, 1)).toBe(0);
  expect(scoreComparisonShare(null, 1)).toBeNull();
});
