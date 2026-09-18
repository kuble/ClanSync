import {
  calculateBalanceHistoryStats,
  type BalanceHistoryRound,
} from "./history";
import { parseRoster } from "./roster-schema";

export type PlayerSessionRound = Pick<
  BalanceHistoryRound,
  "id" | "round_number" | "opened_at" | "match_outcome"
> & { roster: unknown };

export type PlayerSessionInfo = {
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  currentStreak: number;
  micAvailable: boolean | null;
};

export type PlayerSessionInfoMap = Record<string, PlayerSessionInfo>;

export const EMPTY_PLAYER_SESSION_INFO: PlayerSessionInfo = {
  wins: 0,
  draws: 0,
  losses: 0,
  winRate: null,
  currentStreak: 0,
  micAvailable: null,
};

/** The caller must authorize history access and supply rounds from this series only. */
export function buildPlayerSessionInfo(
  rounds: readonly PlayerSessionRound[],
  playerIds: readonly string[],
): PlayerSessionInfoMap {
  const info: PlayerSessionInfoMap = Object.fromEntries(
    playerIds.map((id) => [id, { ...EMPTY_PLAYER_SESSION_INFO }]),
  );
  const stats = calculateBalanceHistoryStats(
    rounds.map((round) => ({ ...round, roster: parseRoster(round.roster) })),
  );
  for (const player of stats) {
    info[player.userId] = {
      wins: player.wins,
      draws: player.draws,
      losses: player.losses,
      winRate: player.winRate,
      currentStreak: player.currentStreak,
      // Profiles do not yet store microphone availability. A party application
      // describes a different context and must not be used as a profile default.
      micAvailable: null,
    };
  }
  return info;
}
