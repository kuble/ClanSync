import { expect, test } from "@playwright/test";
import { balanceTeamHeadingResult } from "../src/components/main-clan/clan-balance-roster-board";
import {
  balanceSessionDate,
  calculateBalanceHistoryStats,
  parsePublicDrawHistory,
  sortBalanceHistoryStats,
  sortHistoryRounds,
  type BalanceHistoryRound,
} from "../src/lib/balance/history";
import {
  EMPTY_ROSTER,
  type BalanceRoster,
} from "../src/lib/balance/roster-schema";

function round(
  number: number,
  outcome: BalanceHistoryRound["match_outcome"],
  team1: string[],
  team2: string[] = [],
): BalanceHistoryRound {
  const roster: BalanceRoster = structuredClone(EMPTY_ROSTER);
  roster.team1.dmg = [team1[0] ?? null, team1[1] ?? null];
  roster.team2.dmg = [team2[0] ?? null, team2[1] ?? null];
  return {
    id: `round-${number}`,
    round_number: number,
    opened_at: `2026-09-16T${String(number).padStart(2, "0")}:00:00Z`,
    closed_at: null,
    match_outcome: outcome,
    phase: "match_live",
    resolved_map_label: null,
    roster,
    drawHistory: [],
  };
}

test("history counts only valid results and preserves streaks across absent, pending, and void rounds", () => {
  const rounds = [
    round(1, "team1", ["a"], ["b"]),
    round(2, "team1", ["a"], ["b"]),
    round(3, "team1", ["c"]),
    round(4, "void", ["a"], ["b"]),
    round(5, "pending", ["a", "new-player"], ["b"]),
    round(6, "team2", ["a"], ["b"]),
    round(7, "team2", ["a"], ["b"]),
  ];
  const stats = calculateBalanceHistoryStats(rounds.toReversed());
  expect(stats.find((member) => member.userId === "a")).toEqual({
    userId: "a",
    appearances: 4,
    wins: 2,
    draws: 0,
    losses: 2,
    winRate: 50,
    currentStreak: -2,
  });
  expect(stats.find((member) => member.userId === "b")?.currentStreak).toBe(2);
  expect(stats.find((member) => member.userId === "new-player")).toMatchObject({
    appearances: 0,
    winRate: null,
    currentStreak: 0,
  });
});

test("draws count as appearances and reset a streak without counting void rounds", () => {
  const rounds = [
    round(1, "team1", ["a"], ["b"]),
    round(2, "team1", ["a"], ["b"]),
    round(3, "draw", ["a"], ["b"]),
    round(4, "void", ["a"], ["b"]),
  ];
  const stats = calculateBalanceHistoryStats(rounds);
  expect(stats.find((member) => member.userId === "a")).toMatchObject({
    appearances: 3, wins: 2, draws: 1, losses: 0,
    winRate: (2 / 3) * 100, currentStreak: 0,
  });
  expect(stats.find((member) => member.userId === "b")).toMatchObject({
    appearances: 3, wins: 0, draws: 1, losses: 2,
    winRate: 0, currentStreak: 0,
  });
  expect(calculateBalanceHistoryStats([
    ...rounds, round(5, "team2", ["a"], ["b"]),
  ]).find((member) => member.userId === "a")?.currentStreak).toBe(-1);
});

test("history deduplicates slot appearances and repeated rounds without giving opposing-team duplicates contradictory outcomes", () => {
  const duplicated = round(1, "team1", ["a", "a"], ["b"]);
  const ambiguous = round(2, "team1", ["a"], ["a"]);
  const stats = calculateBalanceHistoryStats([
    duplicated,
    duplicated,
    ambiguous,
  ]);
  expect(stats.find((member) => member.userId === "a")).toMatchObject({
    appearances: 1,
    wins: 1,
    losses: 0,
    currentStreak: 1,
  });
  expect(stats.find((member) => member.userId === "b")).toMatchObject({
    appearances: 1,
    wins: 0,
    losses: 1,
    currentStreak: -1,
  });
});

test("history sorting supports every numeric column in both directions and leaves zero-game rates last", () => {
  const stats = calculateBalanceHistoryStats([
    round(1, "team1", ["a"], ["b"]),
    round(2, "team2", ["b"], ["c"]),
    round(3, "pending", ["d"]),
  ]);
  expect(sortBalanceHistoryStats(stats, "losses")[0].userId).toBe("b");
  expect(sortBalanceHistoryStats(stats, "appearances")[0].userId).toBe("b");
  expect(sortBalanceHistoryStats(stats, "wins")[0].userId).toBe("a");
  expect(sortBalanceHistoryStats(stats, "draws")[0].draws).toBe(0);
  expect(sortBalanceHistoryStats(stats, "currentStreak")[0].currentStreak).toBe(1);
  expect(sortBalanceHistoryStats(stats, "currentStreak", "asc")[0].currentStreak).toBe(-2);
  expect(
    sortBalanceHistoryStats(stats, "winRate").map((member) => member.userId),
  ).toEqual(["a", "c", "b", "d"]);
  expect(
    sortBalanceHistoryStats(stats, "winRate", "asc").map((member) => member.userId),
  ).toEqual(["b", "a", "c", "d"]);
});

test("history team heading marks the winner with a crown and labels a draw", () => {
  expect(balanceTeamHeadingResult("team1")).toEqual({
    team1Won: true,
    team2Won: false,
    centerLabel: "VS",
  });
  expect(balanceTeamHeadingResult("team2")).toEqual({
    team1Won: false,
    team2Won: true,
    centerLabel: "VS",
  });
  expect(balanceTeamHeadingResult("draw")).toEqual({
    team1Won: false,
    team2Won: false,
    centerLabel: "무승부",
  });
});

test("session date stays fixed at opening date and old records use the Korean opening date", () => {
  expect(balanceSessionDate("2026-09-15", "2026-09-15T23:30:00Z")).toBe(
    "2026-09-15",
  );
  expect(balanceSessionDate(null, "2026-09-15T14:59:59Z")).toBe("2026-09-15");
  expect(balanceSessionDate(null, "2026-09-15T15:00:00Z")).toBe("2026-09-16");
  expect(balanceSessionDate(null, "invalid")).toBe("날짜 미상");
});

test("round order uses round number rather than response order or close time", () => {
  const input = [
    round(3, "pending", []),
    round(1, "team1", []),
    round(2, "void", []),
  ];
  expect(sortHistoryRounds(input).map((item) => item.round_number)).toEqual([
    1, 2, 3,
  ]);
  expect(input[0].round_number).toBe(3);
});

test("public draw audit projects only public fields and retains resets plus start settings", () => {
  const draw = {
    id: "draw-1",
    startedAt: 1000,
    roleMode: "lottery",
    secret: "hidden",
  };
  const audit = parsePublicDrawHistory([
    {
      event: "start",
      at: "2026-09-16T00:00:00Z",
      actorId: "operator",
      draw,
      mode: "auction",
      order: ["a", "b"],
      players: [{ id: "a", role: "tank", preference: ["tank"] }],
      preferences: { a: ["tank"] },
      bets: { a: 100 },
      settings: {
        roles: "lottery",
        teams: "auction",
        auctionBudget: 1000,
        minBid: 10,
        durationSeconds: 20,
        captains: ["a", "b"],
        preferences: { a: ["tank"] },
      },
    },
    { event: "reset", at: "2026-09-16T00:01:00Z", draw },
    { event: "start", at: "invalid", draw },
  ]);
  expect(audit).toHaveLength(2);
  expect(audit[0].settings).toEqual({
    roles: "lottery",
    teams: "auction",
    auctionBudget: 1000,
    minBid: 10,
    durationSeconds: 20,
    captains: ["a", "b"],
  });
  expect(audit[1]).toMatchObject({
    event: "reset",
    order: [],
    players: [],
    draw: { id: "draw-1" },
  });
  expect(JSON.stringify(audit)).not.toMatch(/preference|bets|secret|actorId/);
  expect(parsePublicDrawHistory(null)).toEqual([]);
  expect(parsePublicDrawHistory([null, [], { event: "bid" }])).toEqual([]);
});
