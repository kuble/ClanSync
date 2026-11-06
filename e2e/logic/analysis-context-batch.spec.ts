import { expect, test } from "@playwright/test";
import { analysisValue, contextualScores, type AnalysisContext } from "../../src/lib/balance/analysis-context";
import { EMPTY_ROSTER, type BalanceRoster } from "../../src/lib/balance/roster-schema";

test("분석 점수 일괄 조회는 역할·맵·초기점수 우선순위와 동률의 첫 항목을 보존한다", () => {
  const context: AnalysisContext = [];
  for (let index = 0; index < 80; index++) for (const role of [null, "tank", "dmg", "sup"] as const) for (const map of [null, "부산", "리장 타워"] as const) {
    context.push({ userId: `player-${index}`, role, map, games: 10, score: index / 10 });
    context.push({ userId: `player-${index}`, role, map, games: 11, score: -1 });
  }
  context.push({ userId: "player-0", role: "tank", map: null, games: 0, score: 3, tierBased: true });
  context.push({ userId: "player-1", role: "sup", map: "부산", games: 5, score: -3, tierBased: true });
  const roster: BalanceRoster = { team1: { tank: "player-0", dmg: ["player-1", null], sup: [null, null] }, team2: EMPTY_ROSTER.team2 };
  const assignedRoles = [{ id: "player-1", role: "sup" as const }, { id: "outside", role: "tank" as const }];
  for (const map of [null, "부산", "리장 타워", "해당 없음"]) {
    const result = contextualScores({ outside: { m: 2, a: null } }, context, roster, map, assignedRoles);
    for (const [id, score] of Object.entries(result)) {
      const role = id === "player-0" || id === "outside" ? "tank" : id === "player-1" ? "sup" : null;
      expect(score.a).toBe(analysisValue(context, id, role, map));
    }
    expect(result.outside.m).toBe(2);
  }
});
