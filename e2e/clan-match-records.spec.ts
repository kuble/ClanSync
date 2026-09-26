import { expect, test } from "@playwright/test";
import { buildHofPeriod } from "../src/lib/clan/stats/load-clan-stats";
import { HOF_CONFIG_DEFAULTS } from "../src/lib/clan/stats/hof-config";
import {
  normalizeClanMatchRecords,
  type CompletedBalanceSession,
  type StoredClanMatch,
} from "../src/lib/clan/stats/normalize-clan-match-records";

function session(
  overrides: Partial<CompletedBalanceSession> = {},
): CompletedBalanceSession {
  return {
    id: "session",
    series_id: "series",
    opened_at: "2026-09-01T10:00:00Z",
    closed_at: null,
    predictions_settled_at: "2026-09-01T11:00:00Z",
    resolved_map_label: "부산",
    roster: {
      team1: {
        tank: "blue-tank",
        dmg: ["blue-damage", null],
        sup: [null, null],
      },
      team2: { tank: null, dmg: [null, null], sup: ["red-support", null] },
    },
    ma_snapshot: {
      "blue-tank": { m: 2, a: 1 },
      "red-support": { m: 0, a: null },
    },
    formation_settings: { roles: "manual", teams: "keep" },
    banned_heroes: null,
    match_outcome: "team1",
    ...overrides,
  };
}

function match(overrides: Partial<StoredClanMatch> = {}): StoredClanMatch {
  return {
    id: "match",
    played_at: "2026-08-31T12:00:00Z",
    match_type: "intra",
    status: "finished",
    map_label: "네팔",
    match_players: [{ user_id: "red-support", team: 2 }],
    match_results: { winner_team: 2 },
    ...overrides,
  };
}

test("rounds after midnight retain the session opening date", () => {
  const openedAt = "2026-09-30T14:50:00Z";
  const records = normalizeClanMatchRecords([], [
    session({
      id: "round-1",
      opened_at: openedAt,
      predictions_settled_at: "2026-09-30T15:10:00Z",
      balance_session_series: { opened_at: openedAt },
    }),
    session({
      id: "round-2",
      opened_at: "2026-09-30T15:15:00Z",
      predictions_settled_at: "2026-09-30T15:40:00Z",
      balance_session_series: { opened_at: openedAt },
    }),
  ]);
  expect(records).toHaveLength(2);
  expect(records.map((record) => record.played_at)).toEqual([openedAt, openedAt]);
  expect(records.map((record) => new Date(record.played_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })))
    .toEqual(["2026-09-30", "2026-09-30"]);
});

test("규정 경기 미달자와 미출전자는 운영진에게만 전달하고 기간별로 기준을 계산한다", () => {
  const records = normalizeClanMatchRecords(Array.from({ length: 10 }, (_, i) => match({
    id: `qualification-${i}`, played_at: i === 0 ? "2026-08-01T10:00:00Z" : "2026-09-01T10:00:00Z",
    match_players: [{ user_id: "regular", team: 2 }, ...(i === 0 ? [{ user_id: "once", team: 1 }] : [])],
  })), []);
  const nick = new Map([["regular", "Regular"], ["once", "Once"], ["zero", "Zero"]]);
  const now = new Date("2026-09-26T00:00:00Z");
  const staff = buildHofPeriod(records, "all", HOF_CONFIG_DEFAULTS, nick, now, [], true);
  expect(staff.minimumGames).toBe(3);
  expect(staff.winRate.map((row) => row.userId)).toEqual(["regular"]);
  expect(staff.unqualified.map((row) => row.userId)).toEqual(["once", "zero"]);
  expect(staff.unqualified[1]).toMatchObject({ wins: 0, draws: 0, losses: 0, ratePct: null });
  expect(buildHofPeriod(records, "all", HOF_CONFIG_DEFAULTS, nick, now).unqualified).toEqual([]);
  const august = buildHofPeriod(records, "month", HOF_CONFIG_DEFAULTS, nick, new Date("2026-08-15T00:00:00Z"), [], true, true);
  expect(august.minimumGames).toBe(1);
  expect(august.winRate.map((row) => row.userId)).toContain("once");
  expect(august.unqualified.map((row) => row.userId)).toEqual(["zero"]);
});

function hofRecords() {
  return normalizeClanMatchRecords(
    [
      match({
        id: "win",
        played_at: "2026-09-01T10:00:00Z",
        match_players: [
          { user_id: "regular", team: 2 },
          { user_id: "once", team: 1 },
        ],
      }),
      match({
        id: "draw",
        played_at: "2026-09-02T10:00:00Z",
        match_players: [
          { user_id: "regular", team: 2 },
          { user_id: "draw-only", team: 1 },
        ],
        match_results: { winner_team: null },
      }),
      match({
        id: "missing",
        played_at: "2026-09-03T10:00:00Z",
        match_players: [{ user_id: "regular", team: 2 }],
        match_results: null,
      }),
    ],
    [session({ match_outcome: "void" })],
  );
}

test("명예의 전당: 무승부를 승률 분모에 포함하고 결과 미기록은 출전에서 제외한다", () => {
  const result = buildHofPeriod(
    hofRecords(),
    "month",
    HOF_CONFIG_DEFAULTS,
    new Map(),
    new Date("2026-09-15T00:00:00Z"),
  );
  expect(result.participation.find((row) => row.userId === "regular")).toMatchObject({ played: 2, ratePct: 100 });
  expect(
    result.cumulative.find((row) => row.userId === "draw-only"),
  ).toMatchObject({ played: 1 });
  expect(result.winRate.find((row) => row.userId === "regular")).toMatchObject({
    wins: 1,
    draws: 1,
    losses: 0,
    ratePct: 50,
  });
  expect(result.winRate.find((row) => row.userId === "once")).toMatchObject({
    wins: 0,
    losses: 1,
    ratePct: 0,
  });
  expect(result.winRate.find((row) => row.userId === "draw-only")).toMatchObject({ wins: 0, draws: 1, ratePct: 0 });
  expect(result.participation.some((row) => row.userId === "blue-tank")).toBe(
    false,
  );
});

test("명예의 전당: 여러 라운드 출전은 출석 하루로 집계한다", () => {
  const openedAt = "2026-09-01T10:00:00Z";
  const rows = normalizeClanMatchRecords([], [
    session({ id: "r1", series_id: "series", match_outcome: "team1" }),
    session({ id: "r2", series_id: "series", match_outcome: "draw" }),
  ]);
  const result = buildHofPeriod(rows, "all", HOF_CONFIG_DEFAULTS, new Map(), new Date("2026-09-15T00:00:00Z"), [{ id: "series", openedAt }]);
  expect(result.participation.find((row) => row.userId === "blue-tank")).toMatchObject({ played: 1, ratePct: 100 });
  expect(result.cumulative.find((row) => row.userId === "blue-tank")).toMatchObject({ played: 2 });
});

test("출석 일수는 같은 날의 여러 내전을 합치고 개최 일수와 출전 경기 분모를 구분한다", () => {
  const dates = ["2025-08-01T14:00:00Z", "2025-08-01T14:30:00Z", "2025-08-01T15:10:00Z", "2026-09-01T10:00:00Z"];
  const opened = dates.map((openedAt, index) => ({ id: `day-${index}`, openedAt }));
  const rows = normalizeClanMatchRecords([], dates.slice(0, 3).map((opened_at, index) => session({ id: `r-${index}`, series_id: opened[index].id, opened_at, balance_session_series: { opened_at }, match_outcome: "team1" })));
  const annual = buildHofPeriod(rows, "year", HOF_CONFIG_DEFAULTS, new Map(), new Date("2025-08-15T00:00:00Z"), opened, true, true);
  expect(annual.totals).toEqual({ sessions: 3, days: 2, matches: 3 });
  expect(annual.participation[0]).toMatchObject({ played: 2, ratePct: 100 });
  expect(annual.cumulative[0]).toMatchObject({ played: 3 });
  const all = buildHofPeriod(rows, "all", HOF_CONFIG_DEFAULTS, new Map(), new Date("2026-09-15T00:00:00Z"), opened, true);
  expect(all.totals).toEqual({ sessions: 4, days: 3, matches: 3 });
  expect(all.participation[0]).toMatchObject({ played: 2, ratePct: 66.7 });
});

test("명예의 전당: 공개 전인 이번 달 순위와 확정된 지난달 순위를 구분한다", () => {
  const rows = normalizeClanMatchRecords([], [session({ match_outcome: "team1" })]);
  const cfg = { ...HOF_CONFIG_DEFAULTS, monthlyRankVisibility: "month_start" as const };
  const thisMonth = buildHofPeriod(rows, "month", cfg, new Map(), new Date("2026-09-15T00:00:00Z"));
  const pastMonth = buildHofPeriod(rows, "month", cfg, new Map(), new Date("2026-09-15T00:00:00Z"), [], false, true);
  expect(thisMonth.undisclosed).toBe(true);
  expect(pastMonth.undisclosed).toBe(false);
  expect(pastMonth.cumulative.length).toBeGreaterThan(0);
});

test("명예의 전당: 예측 적중 횟수 순위는 공개 범위와 유효 표본을 따른다", () => {
  const picks = Array.from({ length: 5 }, (_, index) => ({
    sessionId: String(index), userId: "predictor", playedAt: "2026-09-01T10:00:00Z",
    map: null, pickTeam: 1, outcome: index === 4 ? "team2" as const : "team1" as const,
  }));
  const hidden = buildHofPeriod([], "all", HOF_CONFIG_DEFAULTS, new Map(), new Date("2026-09-15T00:00:00Z"), [], false, false, picks);
  const shown = buildHofPeriod([], "all", { ...HOF_CONFIG_DEFAULTS, predictionVisibleTop: 3 }, new Map(), new Date("2026-09-15T00:00:00Z"), [], false, false, picks);
  expect(hidden.predictionCorrect).toEqual([]);
  expect(shown.predictionCorrect[0]).toMatchObject({ correct: 4, valid: 5, ratePct: 80 });
});

test("명예의 전당: 등재 최소 경기 수도 무효를 제외한 전체 완료 경기로 판단한다", () => {
  const result = buildHofPeriod(
    hofRecords(),
    "all",
    { ...HOF_CONFIG_DEFAULTS, eligibilityBelowPct: 60 },
    new Map(),
    new Date("2026-09-15T00:00:00Z"),
  );
  expect(result.participation.find((row) => row.userId === "regular")).toMatchObject({ played: 2, ratePct: 100 });
  expect(result.cumulative.map((row) => row.userId)).toEqual(expect.arrayContaining(["regular", "once", "draw-only"]));
  expect(result.winRate.map((row) => row.userId)).toEqual(["regular"]);
});

test("경기 기록: 취소된 세션을 제외하고 닫기 전 확정 결과와 실제 라인업을 표시한다", () => {
  const records = normalizeClanMatchRecords(
    [],
    [
      session({
        id: "cancelled",
        match_outcome: "pending",
        predictions_settled_at: null,
        closed_at: "2026-09-01T12:00:00Z",
      }),
      session(),
    ],
  );

  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    id: "session",
    source: "balance",
    outcome: "team1",
    played_at: "2026-09-01T11:00:00Z",
    match_results: { winner_team: 1 },
    match_players: [
      { user_id: "blue-tank", team: 1, role: "tank", m: 2, a: 1 },
      { user_id: "blue-damage", team: 1, role: "dmg", m: null, a: null },
      { user_id: "red-support", team: 2, role: "sup", m: 0, a: null },
    ],
  });
});

test("경기 기록: 무효 결과는 승리나 무승부와 구분한 채 보존한다", () => {
  const [record] = normalizeClanMatchRecords(
    [],
    [session({ match_outcome: "void" })],
  );
  expect(record.outcome).toBe("void");
  expect(record.match_results?.winner_team).toBeNull();
});

test("경기 기록: 결과 없는 경기와 무승부를 구분하고 이전 조인 응답도 지원한다", () => {
  const records = normalizeClanMatchRecords(
    [
      match({ id: "missing", match_results: null }),
      match({ id: "empty", match_results: [] }),
      match({ id: "draw", match_results: [{ winner_team: null }] }),
      match({ id: "winner", match_results: [{ winner_team: 2 }] }),
    ],
    [],
  );
  expect(
    Object.fromEntries(records.map((record) => [record.id, record.outcome])),
  ).toEqual({
    missing: "unrecorded",
    empty: "unrecorded",
    draw: "draw",
    winner: "team2",
  });
  expect(
    records.find((record) => record.id === "winner")?.match_players,
  ).toEqual([
    { user_id: "red-support", team: 2, role: null, m: null, a: null },
  ]);
});

test("경기 기록: 같은 ID의 정정된 경기 결과를 한 번만 집계하고 초안을 되살리지 않는다", () => {
  const records = normalizeClanMatchRecords(
    [
      match({ id: "corrected", match_results: { winner_team: 2 } }),
      match({ id: "draft", status: "draft" }),
    ],
    [session({ id: "corrected" }), session({ id: "draft" })],
  );
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    id: "corrected",
    source: "match",
    outcome: "team2",
    map_label: "네팔",
  });
});

test("경기 기록: 확정 시각을 우선 사용하며 시각이 없던 기존 결과도 날짜 순서로 표시한다", () => {
  const records = normalizeClanMatchRecords(
    [match()],
    [
      session({
        id: "older",
        predictions_settled_at: null,
        closed_at: null,
        opened_at: "2026-08-01T10:00:00Z",
      }),
      session({
        id: "closed",
        predictions_settled_at: null,
        closed_at: "2026-09-02T10:00:00Z",
      }),
      session({
        id: "settled",
        predictions_settled_at: "2026-09-01T10:00:00Z",
        closed_at: "2026-09-03T10:00:00Z",
      }),
    ],
  );
  expect(records.map((record) => record.id)).toEqual([
    "closed",
    "settled",
    "match",
    "older",
  ]);
});
