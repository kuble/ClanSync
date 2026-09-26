import type { ClanArchiveMatch } from "./load-clan-stats";

export type ArchiveDayStats = {
  userId: string;
  nickname: string;
  wins: number;
  draws: number;
  losses: number;
  rate: number | null;
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
};

/** Supply all matches for the selected archive day, before map/name filtering. */
export function buildArchiveDayStats(records: readonly ClanArchiveMatch[]): ArchiveDayStats[] {
  const totals = new Map<string, ArchiveDayStats>();
  const chronological = [...records].sort((a, b) =>
    Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id),
  );
  for (const record of chronological) {
    if (record.matchType !== "intra" || record.outcome === "void" || record.outcome === "unrecorded") continue;
    for (const player of record.players) {
      const row = totals.get(player.userId) ?? {
        userId: player.userId, nickname: player.nickname, wins: 0, draws: 0, losses: 0,
        rate: null, currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0,
      };
      if (record.outcome === "draw") {
        row.draws += 1;
        row.currentStreak = 0;
      } else if (record.winnerTeam === player.team) {
        row.wins += 1;
        row.currentStreak = Math.max(0, row.currentStreak) + 1;
        row.maxWinStreak = Math.max(row.maxWinStreak, row.currentStreak);
      } else {
        row.losses += 1;
        row.currentStreak = Math.min(0, row.currentStreak) - 1;
        row.maxLossStreak = Math.max(row.maxLossStreak, -row.currentStreak);
      }
      row.rate = row.wins + row.losses ? row.wins / (row.wins + row.losses) : null;
      totals.set(player.userId, row);
    }
  }
  return [...totals.values()];
}

export type ArchiveDaySortKey = Exclude<keyof ArchiveDayStats, "userId">;

export function sortArchiveDayStats(rows: readonly ArchiveDayStats[], key: ArchiveDaySortKey, direction: "asc" | "desc") {
  return [...rows].sort((a, b) => {
    const left = a[key], right = b[key];
    // A draw-only player has no win rate and stays last in either direction.
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1;
    }
    const order = typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right, "ko") : Number(left) - Number(right);
    return order * (direction === "asc" ? 1 : -1) || b.wins - a.wins || a.nickname.localeCompare(b.nickname, "ko") || a.userId.localeCompare(b.userId);
  });
}
