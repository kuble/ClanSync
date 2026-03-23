/** 클랜 통계 집계 단위 — PRD §6.2 / clan-stats-plan.md */

export type ClanStatsPeriod = "30d" | "90d" | "all";

export type ClanStatsMatchTypeFilter = "all" | "intra" | "scrim";

export interface ClanStatsMatchRow {
  id: string;
  playedAt: string;
  matchType: "intra" | "scrim" | "event";
  mapName: string;
  mapType: string;
  clanWon: boolean;
  scoreLabel: string;
}

export interface ClanStatsKpi {
  totalMatches: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  intraCount: number;
  scrimCount: number;
  eventCount: number;
}

export interface ClanStatsArchiveRow {
  id: string;
  playedAt: string;
  matchType: "intra" | "scrim" | "event";
  mapName: string;
  clanWon: boolean;
  scoreLabel: string;
}

export interface ClanStatsParticipationRow {
  rank: number;
  displayName: string;
  gamesPlayed: number;
  participationRatePct: number;
  belowMinSample: boolean;
}

export interface ClanStatsMapRow {
  mapName: string;
  mapType: string;
  games: number;
  wins: number;
  winRatePct: number | null;
}

export interface ClanStatsViewModel {
  kpi: ClanStatsKpi;
  archive: ClanStatsArchiveRow[];
  participation: ClanStatsParticipationRow[];
  mapBreakdown: ClanStatsMapRow[];
  period: ClanStatsPeriod;
  matchType: ClanStatsMatchTypeFilter;
  /** 순위·승률 표기용 최소 경기 수 (플랜 문구) */
  minGamesForRanking: number;
}
