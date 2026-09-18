import {
  parseRoster,
  type BalanceRoster,
  type TeamRoster,
} from "./roster-schema";

export type BalanceHistorySeries = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  session_date: string;
};

export type PublicDrawSettings = {
  roles?: "manual" | "lottery";
  teams?: "keep" | "random" | "draft" | "auction";
  auctionBudget?: number;
  minBid?: number;
  durationSeconds?: number;
  captains?: string[];
};

export type PublicDrawEvent = {
  event: "start" | "reset";
  at: string;
  draw: {
    id: string;
    startedAt: number;
    roleMode: "manual" | "lottery";
  } | null;
  order: string[];
  players: { id: string; role: "tank" | "dmg" | "sup" }[];
  mode: "keep" | "random" | "draft" | "auction" | null;
  settings: PublicDrawSettings | null;
};

export type BalanceHistoryRound = {
  id: string;
  round_number: number;
  opened_at: string;
  closed_at: string | null;
  match_outcome: "pending" | "team1" | "team2" | "draw" | "void";
  phase: string;
  resolved_map_label: string | null;
  roster: BalanceRoster;
  drawHistory: PublicDrawEvent[];
};

export type BalanceHistoryData = {
  series: BalanceHistorySeries[];
  selectedSeriesId: string | null;
  rounds: BalanceHistoryRound[];
};

export type BalanceMemberStats = {
  userId: string;
  appearances: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  /** Positive for consecutive wins, negative for losses; a draw resets the streak. */
  currentStreak: number;
};

export type BalanceStatsSort =
  | "appearances"
  | "wins"
  | "draws"
  | "losses"
  | "winRate"
  | "currentStreak";
export type BalanceStatsSortDirection = "asc" | "desc";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (item): item is string => typeof item === "string" && Boolean(item),
          ),
        ),
      ]
    : [];
}

function isMode(value: unknown): value is NonNullable<PublicDrawEvent["mode"]> {
  return (
    value === "keep" ||
    value === "random" ||
    value === "draft" ||
    value === "auction"
  );
}

function publicSettings(value: unknown): PublicDrawSettings | null {
  const input = record(value);
  if (!input) return null;
  const result: PublicDrawSettings = {};
  if (input.roles === "manual" || input.roles === "lottery")
    result.roles = input.roles;
  if (isMode(input.teams)) result.teams = input.teams;
  for (const key of ["auctionBudget", "minBid", "durationSeconds"] as const) {
    if (
      typeof input[key] === "number" &&
      Number.isFinite(input[key]) &&
      input[key] > 0
    )
      result[key] = input[key];
  }
  if (Array.isArray(input.captains))
    result.captains = strings(input.captains).slice(0, 2);
  return result;
}

/** Explicit projection prevents preferences, bets, or future private fields leaking to the drawer. */
export function parsePublicDrawHistory(value: unknown): PublicDrawEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): PublicDrawEvent[] => {
    const input = record(raw);
    if (
      !input ||
      (input.event !== "start" && input.event !== "reset") ||
      typeof input.at !== "string" ||
      !Number.isFinite(Date.parse(input.at))
    )
      return [];
    const rawDraw = record(input.draw);
    const draw: PublicDrawEvent["draw"] =
      rawDraw &&
      typeof rawDraw.id === "string" &&
      typeof rawDraw.startedAt === "number" &&
      Number.isFinite(rawDraw.startedAt) &&
      (rawDraw.roleMode === "manual" || rawDraw.roleMode === "lottery")
        ? {
            id: rawDraw.id,
            startedAt: rawDraw.startedAt,
            roleMode: rawDraw.roleMode,
          }
        : null;
    const players: PublicDrawEvent["players"] = Array.isArray(input.players)
      ? input.players.flatMap((rawPlayer): PublicDrawEvent["players"] => {
          const player = record(rawPlayer);
          return player &&
            typeof player.id === "string" &&
            (player.role === "tank" ||
              player.role === "dmg" ||
              player.role === "sup")
            ? [{ id: player.id, role: player.role }]
            : [];
        })
      : [];
    return [
      {
        event: input.event,
        at: input.at,
        draw,
        order: strings(input.order),
        players,
        mode: isMode(input.mode) ? input.mode : null,
        settings: publicSettings(input.settings),
      },
    ];
  });
}

/** A session keeps its opening date even when its last round ends after midnight. */
export function balanceSessionDate(
  sessionDate: string | null,
  openedAt: string,
): string {
  if (sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(sessionDate))
    return sessionDate;
  const opened = new Date(openedAt);
  if (!Number.isFinite(opened.getTime())) return "날짜 미상";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(opened);
  return ["year", "month", "day"]
    .map((part) => parts.find((p) => p.type === part)?.value)
    .join("-");
}

export function sortHistoryRounds<
  T extends Pick<BalanceHistoryRound, "id" | "round_number" | "opened_at">,
>(rounds: readonly T[]): T[] {
  return [...rounds].sort(
    (a, b) =>
      a.round_number - b.round_number ||
      a.opened_at.localeCompare(b.opened_at) ||
      a.id.localeCompare(b.id),
  );
}

function teamIds(team: TeamRoster): Set<string> {
  return new Set(
    [team.tank, ...team.dmg, ...team.sup].filter((id): id is string =>
      Boolean(id),
    ),
  );
}

export function calculateBalanceHistoryStats(
  rounds: readonly Pick<
    BalanceHistoryRound,
    "id" | "round_number" | "opened_at" | "match_outcome" | "roster"
  >[],
): BalanceMemberStats[] {
  const members = new Map<string, BalanceMemberStats>();
  const seenRounds = new Set<string>();
  for (const round of sortHistoryRounds(rounds)) {
    if (seenRounds.has(round.id)) continue;
    seenRounds.add(round.id);
    const roster = parseRoster(round.roster);
    const teams = {
      team1: teamIds(roster.team1),
      team2: teamIds(roster.team2),
    };
    for (const id of new Set([...teams.team1, ...teams.team2])) {
      if (!members.has(id))
        members.set(id, {
          userId: id,
          appearances: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          winRate: null,
          currentStreak: 0,
        });
    }
    if (
      round.match_outcome !== "team1" && round.match_outcome !== "team2" &&
      round.match_outcome !== "draw"
    )
      continue;
    for (const team of ["team1", "team2"] as const) {
      for (const id of teams[team]) {
        // Corrupt legacy rosters must not award both a win and a loss to one person.
        if (teams[team === "team1" ? "team2" : "team1"].has(id)) continue;
        const stats = members.get(id)!;
        const win = team === round.match_outcome;
        stats.appearances++;
        if (round.match_outcome === "draw") stats.draws++;
        else if (win) stats.wins++;
        else stats.losses++;
        stats.currentStreak = round.match_outcome === "draw"
          ? 0
          : win
            ? Math.max(0, stats.currentStreak) + 1
            : Math.min(0, stats.currentStreak) - 1;
        stats.winRate = (stats.wins / stats.appearances) * 100;
      }
    }
  }
  return [...members.values()];
}

export function sortBalanceHistoryStats(
  stats: readonly BalanceMemberStats[],
  sort: BalanceStatsSort,
  direction: BalanceStatsSortDirection = "desc",
): BalanceMemberStats[] {
  return [...stats].sort((a, b) => {
    if (sort === "winRate" && (a.winRate === null || b.winRate === null)) {
      if (a.winRate === null && b.winRate !== null) return 1;
      if (a.winRate !== null && b.winRate === null) return -1;
    }
    const aValue = sort === "winRate" ? (a.winRate ?? 0) : a[sort];
    const bValue = sort === "winRate" ? (b.winRate ?? 0) : b[sort];
    const primary = (aValue - bValue) * (direction === "asc" ? 1 : -1);
    return (
      primary ||
      b.appearances - a.appearances ||
      a.userId.localeCompare(b.userId)
    );
  });
}
