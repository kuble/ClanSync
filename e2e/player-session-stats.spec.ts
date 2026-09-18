import { expect, test } from "@playwright/test";
import {
  buildPlayerSessionInfo,
  type PlayerSessionRound,
} from "../src/lib/balance/player-session-stats";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

function round(
  number: number,
  outcome: PlayerSessionRound["match_outcome"],
): PlayerSessionRound {
  const roster = structuredClone(EMPTY_ROSTER);
  roster.team1.tank = "player";
  roster.team2.tank = "opponent";
  return {
    id: `round-${number}`,
    round_number: number,
    opened_at: `2026-09-18T${String(number).padStart(2, "0")}:00:00Z`,
    match_outcome: outcome,
    roster,
  };
}

test("participant summaries keep draws separate from void rounds and do not invent microphone data", () => {
  const stats = buildPlayerSessionInfo(
    [round(4, "void"), round(2, "draw"), round(3, "team2"), round(1, "team1")],
    ["player"],
  );
  expect(stats.player).toEqual({
    wins: 1,
    draws: 1,
    losses: 1,
    winRate: (1 / 3) * 100,
    currentStreak: -1,
    micAvailable: null,
  });
  expect(stats.opponent).toMatchObject({ currentStreak: 1, micAvailable: null });
});

test("new and waiting participants have an empty session record with unknown win rate", () => {
  const stats = buildPlayerSessionInfo([round(1, "pending")], ["waiting"]);
  for (const id of ["player", "waiting"]) {
    expect(stats[id]).toEqual({
      wins: 0,
      draws: 0,
      losses: 0,
      winRate: null,
      currentStreak: 0,
      micAvailable: null,
    });
  }
});
