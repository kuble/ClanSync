import { expect, test } from "@playwright/test";
import { buildArchiveDayStats, sortArchiveDayStats } from "../src/lib/clan/stats/archive-day-stats";
import type { ClanArchiveMatch } from "../src/lib/clan/stats/load-clan-stats";

function match(index: number, outcome: ClanArchiveMatch["outcome"], players = ["blue", "red"]): ClanArchiveMatch {
  return {
    id: String(index), source: "balance", matchType: "intra", mapLabel: "부산",
    // Rounds after midnight still belong to the same session opening date.
    playedAt: "2026-09-25T14:00:00Z", occurredAt: `2026-09-25T${String(14 + index).padStart(2, "0")}:00:00Z`,
    outcome, winnerTeam: outcome === "team1" ? 1 : outcome === "team2" ? 2 : null,
    players: players.map((userId) => ({ userId, nickname: userId, team: userId === "red" ? 2 : 1, role: null, m: null, a: null })),
  };
}

test("daily streaks follow actual round order, skip void/absent rounds, and stop on draws", () => {
  const records = [match(1, "team1"), match(2, "void"), match(3, "team1"), match(4, "team2"), match(5, "team2"), match(6, "draw"), match(7, "team1"), match(8, "team2", ["red"]), match(9, "unrecorded")];
  const rows = buildArchiveDayStats(records.reverse());
  expect(rows.find((row) => row.userId === "blue")).toMatchObject({ wins: 3, draws: 1, losses: 2, rate: 0.6, currentStreak: 1, maxWinStreak: 2, maxLossStreak: 2 });
  expect(rows.find((row) => row.userId === "red")).toMatchObject({ wins: 3, draws: 1, losses: 3, rate: 0.5, currentStreak: 1, maxWinStreak: 2, maxLossStreak: 2 });
  expect(buildArchiveDayStats([match(1, "team1"), match(2, "team2"), match(3, "team2")])[0].currentStreak).toBe(-2);
});

test("draw-only/void/other match types and sorting both directions", () => {
  const rows = buildArchiveDayStats([match(1, "team1"), match(2, "draw", ["draw-only"]), { ...match(3, "team2"), matchType: "scrim" }, match(4, "void", ["void-only"])]);
  expect(rows).toHaveLength(3);
  expect(rows.find((row) => row.userId === "draw-only")).toMatchObject({ rate: null, currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0 });
  expect(sortArchiveDayStats(rows, "rate", "desc").map((row) => row.userId)).toEqual(["blue", "red", "draw-only"]);
  expect(sortArchiveDayStats(rows, "rate", "asc").map((row) => row.userId)).toEqual(["red", "blue", "draw-only"]);
  expect(sortArchiveDayStats(rows, "nickname", "asc").map((row) => row.userId)).toEqual(["blue", "draw-only", "red"]);
  expect(sortArchiveDayStats(rows, "currentStreak", "asc").map((row) => row.userId)).toEqual(["red", "draw-only", "blue"]);
  expect(buildArchiveDayStats([])).toEqual([]);
});
