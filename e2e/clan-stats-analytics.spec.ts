import { expect, test } from "@playwright/test";
import { buildIntraStats, buildPersonalMatches, currentStreak, recordTotals, relationRows } from "../src/lib/clan/stats/clan-stats-analytics";
import { normalizeClanMatchRecords, type CompletedBalanceSession } from "../src/lib/clan/stats/normalize-clan-match-records";
import { summarizeVisits } from "../src/lib/clan/stats/clan-site-usage";
import { predictionTotals, personalPredictions, predictionPointHistory, type PredictionRecord } from "../src/lib/clan/stats/clan-prediction-stats";

function round(id: string, seriesId: string, result: "team1" | "team2" | "draw" | "void", swapped = false): CompletedBalanceSession {
  return {
    id,
    series_id: seriesId,
    opened_at: "2026-09-01T14:55:00Z",
    closed_at: null,
    predictions_settled_at: `2026-09-01T${14 + Number(id.slice(1))}:10:00Z`,
    resolved_map_label: "부산",
    match_outcome: result,
    roster: swapped
      ? { team1: { tank: "a", dmg: ["c", null], sup: [null, null] }, team2: { tank: "b", dmg: [null, null], sup: [null, null] } }
      : { team1: { tank: "a", dmg: [null, null], sup: ["b", null] }, team2: { tank: "c", dmg: [null, null], sup: [null, null] } },
    ma_snapshot: { a: { m: 1, a: 2 }, b: { m: 2, a: 1 }, c: { m: 3, a: 4 } },
    formation_settings: { teams: "keep", roles: "manual" },
    banned_heroes: ["ana"],
    balance_session_series: { opened_at: "2026-09-01T14:55:00Z" },
  };
}

test("정규 내전의 세션·출전·무승부와 역할별 아군/적군 관계를 각각 집계한다", () => {
  const records = normalizeClanMatchRecords([], [
    round("r1", "s1", "team1"),
    round("r2", "s1", "draw"),
    round("r3", "s2", "team2", true),
    round("r4", "s2", "void"),
  ]);
  const overview = buildIntraStats(records, [
    { id: "s1", openedAt: "2026-09-01T14:55:00Z" },
    { id: "s2", openedAt: "2026-09-01T14:55:00Z" },
    { id: "s3", openedAt: "2026-09-02T10:00:00Z" },
  ]);
  expect(overview).toMatchObject({ sessions: 3, completed: 3, participants: 3, averageMatchesPerSession: 1, averageParticipantsPerSession: 2, draws: 1, drawRate: 33.3 });
  expect(overview.bans).toMatchObject([{ hero: "ana", matches: 3 }]);
  expect(overview.scoreGaps).toHaveLength(0);
  const personal = buildPersonalMatches(records, "a", new Map([["b", "B"], ["c", "C"]]), true);
  expect(recordTotals(personal)).toMatchObject({ matches: 3, wins: 1, draws: 1, losses: 1, rate: 33.3, sessions: 2 });
  expect(currentStreak(personal)).toEqual({ result: "loss", count: 1 });
  expect(relationRows(personal, "tank", "sup", "ally")).toMatchObject([{ id: "b", matches: 2, wins: 1, draws: 1 }]);
  expect(relationRows(personal, "tank", "tank", "enemy").find((row) => row.id === "b")).toMatchObject({ matches: 1, losses: 1 });
  const repeatedAlly = personal.flatMap((match) => match.peers).filter((peer) => peer.id === "b" && peer.relation === "ally");
  expect(repeatedAlly).toHaveLength(2);
  expect(repeatedAlly[0]).toBe(repeatedAlly[1]);
  const fresh = buildPersonalMatches(records, "a", new Map([["b", "Renamed"]]), true);
  expect(fresh.flatMap((match) => match.peers).find((peer) => peer.id === "b")?.nickname).toBe("Renamed");
  expect(buildPersonalMatches(records, "a", new Map(), false).every((match) => match.peers.length === 0)).toBe(true);
});

test("기간 방문자는 고유 멤버, 활동일은 멤버별 일수로 구분한다", () => {
  const visits = [
    { date: "2026-09-01", userId: "a" },
    { date: "2026-09-02", userId: "a" },
    { date: "2026-09-02", userId: "b" },
  ];
  expect(summarizeVisits(visits, "2026-09-01", "2026-09-02")).toEqual({ visitors: 2, personDays: 3 });
});

test("승부예측 적중률은 승패 확정 표본만 사용하고 무승부·무효를 따로 보존한다", () => {
  const rows: PredictionRecord[] = (["team1", "team2", "draw", "void"] as const).map((outcome, index) => ({
    sessionId: String(index), userId: "member", playedAt: "2026-09-01T10:00:00Z", map: null,
    pickTeam: 1, outcome,
  }));
  expect(predictionTotals(rows)).toEqual({ correct: 1, valid: 2, rate: 50 });
  expect(personalPredictions(rows, "member").map((row) => row.result)).toEqual(["correct", "incorrect", "draw", "void"]);
});

test("예측 포인트는 실제 지급·차감 날짜로 집계하고 다른 클랜·멤버 거래와 미지급 보상을 제외한다", () => {
  const rows: PredictionRecord[] = ["paid", "unpaid"].map((sessionId) => ({ sessionId, userId: "me", playedAt: "2026-09-01T10:00:00Z", map: null, pickTeam: 1, outcome: "team1" }));
  const ledger = [
    { user_id: "me", reference_id: "paid", amount: 100, created_at: "2026-09-01T16:00:00Z" },
    { user_id: "me", reference_id: "paid", amount: -30, created_at: "2026-09-02T11:00:00Z" },
    { user_id: "someone", reference_id: "paid", amount: 999, created_at: "2026-09-02T11:00:00Z" },
    { user_id: "me", reference_id: "other-clan", amount: 999, created_at: "2026-09-02T11:00:00Z" },
  ];
  expect(predictionPointHistory(rows, ledger, "me")).toEqual([
    { date: "2026-09-01", earned: 0, lost: 0, net: 0 },
    { date: "2026-09-02", earned: 100, lost: 30, net: 70 },
  ]);
});

test("경매 통계는 보존된 낙찰·구매 로그만 세고 입찰은 가격에 넣지 않는다", () => {
  const record = round("r1", "s1", "team1");
  record.formation_settings = { teams: "auction", roles: "manual" };
  record.formation_state = {
    stage: "complete", budgets: { team1: 850, team2: 1000 },
    log: [
      { text: "입찰", player: "a", team: "team1", amount: 100 },
      { text: "낙찰", player: "a", team: "team1", amount: 100 },
      { text: "아이템 구매 · 맵 선정권", team: "team1", amount: 50 },
    ],
  };
  const stats = buildIntraStats(normalizeClanMatchRecords([], [record]), [{ id: "s1", openedAt: record.opened_at }]);
  expect(stats.auction).toMatchObject({ lots: 1, priceRanges: [0, 1, 0, 0], teamSpend: { team1: 100, team2: 0 }, teamRemaining: { team1: 850, team2: 1000 }, items: [{ name: "맵 선정권", purchases: 1, totalCost: 50 }] });
});
