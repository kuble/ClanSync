import "server-only";

import type {
  ClanStatsArchiveRow,
  ClanStatsKpi,
  ClanStatsMapRow,
  ClanStatsMatchRow,
  ClanStatsMatchTypeFilter,
  ClanStatsParticipationRow,
  ClanStatsPeriod,
  ClanStatsViewModel,
} from "./clan-stats-types";

/** SSR·목업 재현용 고정 앵커 (실연동 시 제거) */
const MOCK_TODAY = new Date("2026-03-23T12:00:00.000Z");

const MS_DAY = 86_400_000;

const RAW_MATCHES: ClanStatsMatchRow[] = [
  {
    id: "m01",
    playedAt: "2026-03-22T18:00:00.000Z",
    matchType: "intra",
    mapName: "서킷 로얄",
    mapType: "클래시",
    clanWon: true,
    scoreLabel: "3-2",
  },
  {
    id: "m02",
    playedAt: "2026-03-20T19:30:00.000Z",
    matchType: "scrim",
    mapName: "파라이소",
    mapType: "호위",
    clanWon: false,
    scoreLabel: "2-3",
  },
  {
    id: "m03",
    playedAt: "2026-03-18T21:00:00.000Z",
    matchType: "intra",
    mapName: "뉴 정크 시티",
    mapType: "제어",
    clanWon: true,
    scoreLabel: "3-1",
  },
  {
    id: "m04",
    playedAt: "2026-03-15T20:00:00.000Z",
    matchType: "intra",
    mapName: "부산",
    mapType: "밀기",
    clanWon: true,
    scoreLabel: "3-0",
  },
  {
    id: "m05",
    playedAt: "2026-03-12T21:00:00.000Z",
    matchType: "scrim",
    mapName: "서킷 로얄",
    mapType: "클래시",
    clanWon: true,
    scoreLabel: "3-1",
  },
  {
    id: "m06",
    playedAt: "2026-03-08T20:00:00.000Z",
    matchType: "intra",
    mapName: "엔터테인먼트",
    mapType: "돌격",
    clanWon: false,
    scoreLabel: "1-3",
  },
  {
    id: "m07",
    playedAt: "2026-03-05T21:30:00.000Z",
    matchType: "event",
    mapName: "감시 기지: 지브롤터",
    mapType: "제어",
    clanWon: true,
    scoreLabel: "2-0",
  },
  {
    id: "m08",
    playedAt: "2026-03-01T19:00:00.000Z",
    matchType: "intra",
    mapName: "할리우드",
    mapType: "호위",
    clanWon: true,
    scoreLabel: "3-2",
  },
  {
    id: "m09",
    playedAt: "2026-02-25T20:00:00.000Z",
    matchType: "scrim",
    mapName: "스리아",
    mapType: "돌격",
    clanWon: false,
    scoreLabel: "2-3",
  },
  {
    id: "m10",
    playedAt: "2026-02-20T21:00:00.000Z",
    matchType: "intra",
    mapName: "부산",
    mapType: "밀기",
    clanWon: true,
    scoreLabel: "3-1",
  },
  {
    id: "m11",
    playedAt: "2026-02-14T18:00:00.000Z",
    matchType: "intra",
    mapName: "뉴 정크 시티",
    mapType: "제어",
    clanWon: false,
    scoreLabel: "1-3",
  },
  {
    id: "m12",
    playedAt: "2026-02-08T20:00:00.000Z",
    matchType: "scrim",
    mapName: "파라이소",
    mapType: "호위",
    clanWon: true,
    scoreLabel: "3-2",
  },
  {
    id: "m13",
    playedAt: "2026-02-01T21:00:00.000Z",
    matchType: "intra",
    mapName: "서킷 로얄",
    mapType: "클래시",
    clanWon: true,
    scoreLabel: "3-0",
  },
  {
    id: "m14",
    playedAt: "2026-01-28T19:30:00.000Z",
    matchType: "intra",
    mapName: "엔터테인먼트",
    mapType: "돌격",
    clanWon: true,
    scoreLabel: "3-2",
  },
  {
    id: "m15",
    playedAt: "2026-01-20T20:00:00.000Z",
    matchType: "scrim",
    mapName: "할리우드",
    mapType: "호위",
    clanWon: false,
    scoreLabel: "1-3",
  },
  {
    id: "m16",
    playedAt: "2026-01-12T21:00:00.000Z",
    matchType: "intra",
    mapName: "스리아",
    mapType: "돌격",
    clanWon: true,
    scoreLabel: "3-1",
  },
  {
    id: "m17",
    playedAt: "2026-01-05T18:00:00.000Z",
    matchType: "intra",
    mapName: "부산",
    mapType: "밀기",
    clanWon: true,
    scoreLabel: "3-2",
  },
  {
    id: "m18",
    playedAt: "2025-12-22T20:00:00.000Z",
    matchType: "event",
    mapName: "감시 기지: 지브롤터",
    mapType: "제어",
    clanWon: true,
    scoreLabel: "2-1",
  },
  {
    id: "m19",
    playedAt: "2025-12-10T19:00:00.000Z",
    matchType: "scrim",
    mapName: "뉴 정크 시티",
    mapType: "제어",
    clanWon: false,
    scoreLabel: "0-3",
  },
  {
    id: "m20",
    playedAt: "2025-11-28T21:00:00.000Z",
    matchType: "intra",
    mapName: "파라이소",
    mapType: "호위",
    clanWon: true,
    scoreLabel: "3-2",
  },
];

/** 클랜 경기 데이터 기준 참여율 순위 목업 (실연동 시 match_players 집계로 대체) */
const RAW_PARTICIPATION: Omit<
  ClanStatsParticipationRow,
  "rank" | "belowMinSample"
>[] = [
  { displayName: "IronWall", gamesPlayed: 18, participationRatePct: 94 },
  { displayName: "Mender", gamesPlayed: 17, participationRatePct: 89 },
  { displayName: "Pulse", gamesPlayed: 16, participationRatePct: 86 },
  { displayName: "Violet", gamesPlayed: 14, participationRatePct: 78 },
  { displayName: "Anchor", gamesPlayed: 12, participationRatePct: 71 },
  { displayName: "Bloom", gamesPlayed: 9, participationRatePct: 65 },
  { displayName: "Rift", gamesPlayed: 6, participationRatePct: 52 },
  { displayName: "NovaKid", gamesPlayed: 3, participationRatePct: 38 },
];

const MIN_GAMES_RANK = 5;

export function parseClanStatsQuery(
  raw: Record<string, string | string[] | undefined>,
): { period: ClanStatsPeriod; matchType: ClanStatsMatchTypeFilter } {
  const p = typeof raw.period === "string" ? raw.period : undefined;
  const t = typeof raw.type === "string" ? raw.type : undefined;
  const period: ClanStatsPeriod =
    p === "all" || p === "90d" ? p : "30d";
  const matchType: ClanStatsMatchTypeFilter =
    t === "intra" || t === "scrim" ? t : "all";
  return { period, matchType };
}

function startOfPeriod(period: ClanStatsPeriod): Date | null {
  if (period === "all") return null;
  const days = period === "90d" ? 90 : 30;
  return new Date(MOCK_TODAY.getTime() - days * MS_DAY);
}

function filterMatches(
  rows: ClanStatsMatchRow[],
  period: ClanStatsPeriod,
  matchType: ClanStatsMatchTypeFilter,
): ClanStatsMatchRow[] {
  const start = startOfPeriod(period);
  return rows.filter((m) => {
    const d = new Date(m.playedAt);
    if (start && d < start) return false;
    if (matchType === "all") return true;
    return m.matchType === matchType;
  });
}

function buildKpi(matches: ClanStatsMatchRow[]): ClanStatsKpi {
  const wins = matches.filter((m) => m.clanWon).length;
  const losses = matches.length - wins;
  const intraCount = matches.filter((m) => m.matchType === "intra").length;
  const scrimCount = matches.filter((m) => m.matchType === "scrim").length;
  const eventCount = matches.filter((m) => m.matchType === "event").length;
  return {
    totalMatches: matches.length,
    wins,
    losses,
    winRatePct:
      matches.length === 0 ? null : Math.round((wins / matches.length) * 1000) / 10,
    intraCount,
    scrimCount,
    eventCount,
  };
}

function toArchiveRows(matches: ClanStatsMatchRow[]): ClanStatsArchiveRow[] {
  return [...matches]
    .sort(
      (a, b) =>
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    )
    .map((m) => ({
      id: m.id,
      playedAt: m.playedAt,
      matchType: m.matchType,
      mapName: m.mapName,
      clanWon: m.clanWon,
      scoreLabel: m.scoreLabel,
    }));
}

function buildMapBreakdown(matches: ClanStatsMatchRow[]): ClanStatsMapRow[] {
  const byKey = new Map<
    string,
    { mapName: string; mapType: string; games: number; wins: number }
  >();
  for (const m of matches) {
    const key = `${m.mapName}|${m.mapType}`;
    const cur = byKey.get(key) ?? {
      mapName: m.mapName,
      mapType: m.mapType,
      games: 0,
      wins: 0,
    };
    cur.games += 1;
    if (m.clanWon) cur.wins += 1;
    byKey.set(key, cur);
  }
  return [...byKey.values()]
    .map((row) => ({
      mapName: row.mapName,
      mapType: row.mapType,
      games: row.games,
      wins: row.wins,
      winRatePct:
        row.games === 0
          ? null
          : Math.round((row.wins / row.games) * 1000) / 10,
    }))
    .sort((a, b) => b.games - a.games);
}

function buildParticipation(): ClanStatsParticipationRow[] {
  const sorted = [...RAW_PARTICIPATION].sort(
    (a, b) => b.participationRatePct - a.participationRatePct,
  );
  return sorted.map((row, i) => ({
    rank: i + 1,
    displayName: row.displayName,
    gamesPlayed: row.gamesPlayed,
    participationRatePct: row.participationRatePct,
    belowMinSample: row.gamesPlayed < MIN_GAMES_RANK,
  }));
}

export function buildClanStatsViewModel(
  period: ClanStatsPeriod,
  matchType: ClanStatsMatchTypeFilter,
): ClanStatsViewModel {
  const filtered = filterMatches(RAW_MATCHES, period, matchType);
  return {
    kpi: buildKpi(filtered),
    archive: toArchiveRows(filtered),
    participation: buildParticipation(),
    mapBreakdown: buildMapBreakdown(filtered),
    period,
    matchType,
    minGamesForRanking: MIN_GAMES_RANK,
  };
}

/** 대시보드 통계 카드용 짧은 요약 (최근 30일·전 유형) */
export function getClanStatsDashboardSummary(): {
  games: number;
  winRatePct: number | null;
  record: string;
} {
  const m = buildClanStatsViewModel("30d", "all");
  const { kpi } = m;
  return {
    games: kpi.totalMatches,
    winRatePct: kpi.winRatePct,
    record: `${kpi.wins}승 ${kpi.losses}패`,
  };
}
