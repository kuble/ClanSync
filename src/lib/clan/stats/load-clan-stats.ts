import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import type { Database } from "@/lib/supabase/database.types";
import {
  currentKstYearMonth,
  isHofMonthTabUndisclosed,
  isHofYearTabUndisclosed,
  minGamesToQualify,
  resolveHofConfig,
  type ResolvedHofConfig,
} from "./hof-config";
import { inKstMonth, inKstYear, isoToKstYmd, toKstParts } from "./kst";
import { buildIntraStats, buildPersonalMatches, type IntraStats, type PersonalMatch } from "./clan-stats-analytics";
import { personalPredictions, predictionTotals, type PredictionRecord } from "./clan-prediction-stats";

import {
  normalizeClanMatchRecords,
  type ClanMatchRecord,
  type StoredClanMatch,
} from "./normalize-clan-match-records";

type MatchRow = ClanMatchRecord;

/** Keep lifetime totals complete beyond the API's default row limit. */
async function loadAllStatsRows<T>(
  loadPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const pageSize = 500;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await loadPage(from, from + pageSize - 1);
    if (page.error) throw new Error("통계 데이터를 불러오지 못했습니다.");
    rows.push(...(page.data ?? []));
    if (!page.data || page.data.length < pageSize) return rows;
  }
}

export type ClanArchiveMatch = {
  id: string;
  matchType: string;
  mapLabel: string | null;
  playedAt: string;
  source: ClanMatchRecord["source"];
  outcome: ClanMatchRecord["outcome"];
  winnerTeam: number | null;
  players: {
    userId: string;
    nickname: string;
    team: number;
    role: string | null;
    m: number | null;
    a: number | null;
  }[];
};

export type HofRowWinRate = {
  userId: string;
  nickname: string;
  wins: number;
  draws: number;
  losses: number;
  ratePct: number | null;
};

export type HofRowParticipation = {
  userId: string;
  nickname: string;
  played: number;
  ratePct: number;
};

export type HofRowCumulative = {
  userId: string;
  nickname: string;
  played: number;
};

export type HofRowWins = { userId: string; nickname: string; wins: number; played: number };
export type HofRowStreak = { userId: string; nickname: string; longest: number };
export type HofRowPrediction = { userId: string; nickname: string; correct: number; valid: number; ratePct: number | null };

export type HofPeriodPayload = {
  totals: { sessions: number; days: number; matches: number };
  undisclosed: boolean;
  undisclosedHint: string | null;
  winRate: HofRowWinRate[];
  wins: HofRowWins[];
  streaks: HofRowStreak[];
  participation: HofRowParticipation[];
  cumulative: HofRowCumulative[];
  predictionCorrect: HofRowPrediction[];
};

export type ClanStatsPageModel = {
  clanId: string;
  intra: IntraStats;
  personal: {
    viewerId: string;
    canSeePeers: boolean;
    people: { userId: string; nickname: string; matches: PersonalMatch[]; predictions: ReturnType<typeof personalPredictions> }[];
  };
  summary: {
    totalMatches: number;
    intraCount: number;
    scrimCount: number;
    eventCount: number;
    memberCount: number;
    clanCreatedAt: string;
  };
  hof: {
    exposeHof: boolean;
    config: ResolvedHofConfig;
    periods: {
      all: HofPeriodPayload;
      month: HofPeriodPayload;
      year: HofPeriodPayload;
    };
    historyMonths: Record<string, HofPeriodPayload>;
    historyYears: Record<string, HofPeriodPayload>;
  };
  rankmap: {
    personDaysByYearMonth: Record<string, Record<string, number>>;
    intraMatchesByYearMonth: Record<string, Record<string, number>>;
    intraParticipantsByYearMonth: Record<string, Record<string, number>>;
    years: string[];
  };
  archive: {
    datesKst: string[];
    sampleByDate: Record<string, ClanArchiveMatch[]>;
  };
  permissions: {
    viewPersonalRecords: boolean;
    setHofRules: boolean;
    isLeader: boolean;
    isStaff: boolean;
    viewMatchRecords: boolean;
    viewMscore: boolean;
    exportCsv: boolean;
  };
};

function getWinnerTeam(m: MatchRow): number | null {
  const r = m.match_results;
  if (!r) return null;
  const row = Array.isArray(r) ? r[0] : r;
  if (!row || row.winner_team == null) return null;
  return row.winner_team;
}

function isCompletedIntra(m: MatchRow): boolean {
  return (
    m.status === "finished" && m.match_type === "intra" &&
    (m.outcome === "team1" || m.outcome === "team2" || m.outcome === "draw")
  );
}

function filterMatches(
  rows: MatchRow[],
  period: "all" | "month" | "year",
  now: Date,
): MatchRow[] {
  const base = rows.filter(isCompletedIntra);
  if (period === "all") return base;
  const { year: cy, month: cm } = currentKstYearMonth(now);
  if (period === "month") {
    return base.filter((m) => inKstMonth(m.played_at, cy, cm));
  }
  return base.filter((m) => inKstYear(m.played_at, cy));
}

function buildNickMap(
  rows: { user_id: string; nickname: string }[] | null,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) {
    m.set(r.user_id, r.nickname);
  }
  return m;
}

export function buildHofPeriod(
  allRows: MatchRow[],
  period: "all" | "month" | "year",
  cfg: ResolvedHofConfig,
  nick: Map<string, string>,
  now: Date,
  openedSessions: readonly { id: string; openedAt: string }[] = [],
  viewerIsStaff = false,
  historical = false,
  predictions: readonly PredictionRecord[] = [],
): HofPeriodPayload {
  const undisclosedMonth = !viewerIsStaff && !historical && period === "month" && isHofMonthTabUndisclosed(cfg);
  const undisclosedYear = !viewerIsStaff && !historical && period === "year" && isHofYearTabUndisclosed(cfg);
  const undisclosed = undisclosedMonth || undisclosedYear;
  const undisclosedHint = undisclosedMonth
    ? "월별 순위는 클랜 설정에 따라 다음 달 1일에 확정·공개됩니다."
    : undisclosedYear
      ? "연도별 순위는 클랜 설정에 따라 다음 해 1월 1일에 확정·공개됩니다."
      : null;

  if (undisclosed) {
    return {
      totals: { sessions: 0, days: 0, matches: 0 },
      undisclosed: true,
      undisclosedHint,
      winRate: [],
      wins: [],
      streaks: [],
      participation: [],
      cumulative: [],
      predictionCorrect: [],
    };
  }

  const matches = filterMatches(allRows, period, now);
  const totalIntra = matches.length;
  const minG =
    totalIntra > 0
      ? minGamesToQualify(totalIntra, cfg)
      : Number.MAX_SAFE_INTEGER;

  const wins = new Map<string, number>();
  const draws = new Map<string, number>();
  const losses = new Map<string, number>();
  const played = new Map<string, number>();
  const attendanceByPlayer = new Map<string, Set<string>>();

  for (const m of matches) {
    const wt = getWinnerTeam(m);
    const players = [...new Map((m.match_players ?? []).map((player) => [player.user_id, player])).values()];
    for (const p of players) {
      played.set(p.user_id, (played.get(p.user_id) ?? 0) + 1);
      if (!attendanceByPlayer.has(p.user_id)) attendanceByPlayer.set(p.user_id, new Set());
      attendanceByPlayer.get(p.user_id)!.add(isoToKstYmd(m.played_at));
      if (wt === null) {
        draws.set(p.user_id, (draws.get(p.user_id) ?? 0) + 1);
        continue;
      }
      if (p.team === wt) {
        wins.set(p.user_id, (wins.get(p.user_id) ?? 0) + 1);
      } else {
        losses.set(p.user_id, (losses.get(p.user_id) ?? 0) + 1);
      }
    }
  }

  const eligible = (uid: string) => (played.get(uid) ?? 0) >= minG;

  const winRate: HofRowWinRate[] = [];
  for (const uid of played.keys()) {
    if (!eligible(uid)) continue;
    const w = wins.get(uid) ?? 0;
    const d = draws.get(uid) ?? 0;
    const l = losses.get(uid) ?? 0;
    const dec = w + d + l;
    if (dec === 0) continue;
    winRate.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      wins: w,
      draws: d,
      losses: l,
      ratePct: Math.round((w / dec) * 1000) / 10,
    });
  }
  winRate.sort((a, b) => {
    const ar = a.ratePct ?? -1;
    const br = b.ratePct ?? -1;
    if (br !== ar) return br - ar;
    return b.wins - a.wins;
  });
  const winTop = viewerIsStaff || cfg.winRateVisibleTop === 999 ? winRate.length : cfg.winRateVisibleTop;
  const winSlice = winRate.slice(0, winTop);

  const winsRows: HofRowWins[] = [...played.keys()].map((uid) => ({
    userId: uid, nickname: nick.get(uid) ?? "알 수 없음", wins: wins.get(uid) ?? 0, played: played.get(uid) ?? 0,
  })).sort((a, b) => b.wins - a.wins || b.played - a.played || a.nickname.localeCompare(b.nickname, "ko"));
  const winsSlice = winsRows.slice(0, viewerIsStaff || cfg.winsVisibleTop === 999 ? winsRows.length : cfg.winsVisibleTop);

  const streakByPlayer = new Map<string, { current: number; longest: number }>();
  for (const match of [...matches].reverse()) {
    const winner = getWinnerTeam(match);
    for (const player of new Map(match.match_players.map((p) => [p.user_id, p])).values()) {
      const old = streakByPlayer.get(player.user_id) ?? { current: 0, longest: 0 };
      const current = winner !== null && player.team === winner ? old.current + 1 : 0;
      streakByPlayer.set(player.user_id, { current, longest: Math.max(old.longest, current) });
    }
  }
  const streaks: HofRowStreak[] = [...streakByPlayer].filter(([, row]) => row.longest > 0).map(([uid, row]) => ({
    userId: uid, nickname: nick.get(uid) ?? "알 수 없음", longest: row.longest,
  })).sort((a, b) => b.longest - a.longest || a.nickname.localeCompare(b.nickname, "ko"));
  const streakSlice = streaks.slice(0, viewerIsStaff || cfg.streakVisibleTop === 999 ? streaks.length : cfg.streakVisibleTop);

  const participation: HofRowParticipation[] = [];
  const eligibleSessions = openedSessions.filter((session) => {
    if (period === "all") return true;
    const { year, month } = currentKstYearMonth(now);
    return period === "month"
      ? inKstMonth(session.openedAt, year, month)
      : inKstYear(session.openedAt, year);
  });
  // Multiple regular gatherings on the same KST date count as one attendance day.
  const heldDays = new Set([
    ...eligibleSessions.map((session) => isoToKstYmd(session.openedAt)),
    ...matches.map((match) => isoToKstYmd(match.played_at)),
  ]);
  const totals = { sessions: new Set(eligibleSessions.map((session) => session.id)).size, days: heldDays.size, matches: totalIntra };
  const denom = Math.max(totals.days, 1);
  for (const uid of played.keys()) {
    const pl = attendanceByPlayer.get(uid)?.size ?? 0;
    if (pl === 0) continue;
    participation.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      played: pl,
      ratePct: Math.round((pl / denom) * 1000) / 10,
    });
  }
  participation.sort((a, b) => b.ratePct - a.ratePct || b.played - a.played);
  const partTop =
    viewerIsStaff || cfg.participationVisibleTop === 999
      ? participation.length
      : cfg.participationVisibleTop;
  const partSlice = participation.slice(0, partTop);

  const cumulative: HofRowCumulative[] = [];
  for (const uid of played.keys()) {
    cumulative.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      played: played.get(uid) ?? 0,
    });
  }
  cumulative.sort((a, b) => b.played - a.played);
  const cumTop =
    viewerIsStaff || cfg.cumulativeVisibleTop === 999
      ? cumulative.length
      : cfg.cumulativeVisibleTop;
  const cumSlice = cumulative.slice(0, cumTop);

  const periodPredictions = predictions.filter((row) => period === "all" || (
    period === "month" ? inKstMonth(row.playedAt, currentKstYearMonth(now).year, currentKstYearMonth(now).month)
      : inKstYear(row.playedAt, currentKstYearMonth(now).year)
  ));
  const predictionGroups = new Map<string, PredictionRecord[]>();
  for (const row of periodPredictions) {
    if (!predictionGroups.has(row.userId)) predictionGroups.set(row.userId, []);
    predictionGroups.get(row.userId)!.push(row);
  }
  const predictionRows: HofRowPrediction[] = [...predictionGroups].map(([uid, rows]) => {
    const total = predictionTotals(rows);
    return {
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      correct: total.correct,
      valid: total.valid,
      ratePct: total.rate,
    };
  }).filter((row) => row.valid > 0);
  const predictionTop = viewerIsStaff || cfg.predictionVisibleTop === 999
    ? predictionRows.length : cfg.predictionVisibleTop;
  const predictionCorrect = [...predictionRows].sort((a, b) => b.correct - a.correct || b.valid - a.valid || a.nickname.localeCompare(b.nickname, "ko")).slice(0, predictionTop);

  return {
    totals,
    undisclosed: false,
    undisclosedHint: null,
    winRate: winSlice,
    wins: winsSlice,
    streaks: streakSlice,
    participation: partSlice,
    cumulative: cumSlice,
    predictionCorrect,
  };
}

export async function loadClanStatsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  options?: { now?: Date; includeManagement?: boolean },
): Promise<ClanStatsPageModel | null> {
  const now = options?.now ?? new Date();

  const [{ data: clan }, { count: memberCount }, { data: settings }] =
    await Promise.all([
      supabase
        .from("clans")
        .select("id, created_at")
        .eq("id", clanId)
        .maybeSingle(),
      supabase
        .from("clan_members")
        .select("*", { count: "exact", head: true })
        .eq("clan_id", clanId)
        .eq("status", "active"),
      supabase
        .from("clan_settings")
        .select("hof_config, expose_hof")
        .eq("clan_id", clanId)
        .maybeSingle(),
    ]);

  if (!clan) return null;

  const { data: memRpc } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const role = memRpc?.[0]?.status === "active" ? memRpc[0].role : undefined;
  if (!role) return null;
  // Historical rows stay server-side. Member summaries are public within the
  // clan; detailed archive records are emitted only with viewMatchRecords below.
  const historyClient: SupabaseClient<Database> = createServiceRoleClient();

  const [
    setHofRules,
    viewMatchRecords,
    exportCsv,
    viewSynergy,
    viewMonthly,
    viewYearly,
    viewMaps,
    viewMscore,
    rawMatches,
    completedSessions,
    openedSessions,
    { data: nickRows },
  ] = await Promise.all([
    hasClanPermission(supabase, userId, clanId, "set_hof_rules"),
    hasClanPermission(supabase, userId, clanId, "view_match_records"),
    hasClanPermission(supabase, userId, clanId, "export_csv"),
    hasClanPermission(supabase, userId, clanId, "view_synergy_winrate"),
    hasClanPermission(supabase, userId, clanId, "view_monthly_stats"),
    hasClanPermission(supabase, userId, clanId, "view_yearly_stats"),
    hasClanPermission(supabase, userId, clanId, "view_map_winrate"),
    hasClanPermission(supabase, userId, clanId, "view_mscore"),
    loadAllStatsRows((from, to) =>
      supabase
        .from("matches")
        .select(
          `
        id,
        played_at,
        match_type,
        status,
        map_label,
        match_players ( user_id, team ),
        match_results ( winner_team )
      `,
        )
        .eq("clan_id", clanId)
        .order("played_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    loadAllStatsRows((from, to) =>
      historyClient
        .from("balance_sessions")
        .select(
          "id,series_id,opened_at,closed_at,predictions_settled_at,resolved_map_label,roster,ma_snapshot,formation_settings,formation_state,banned_heroes,hero_ban_enabled,map_candidates,match_outcome,balance_session_map_votes(choice_idx),balance_session_predictions(user_id,pick_team),balance_session_series!inner(opened_at,balance_rooms!inner(kind))",
        )
        .eq("clan_id", clanId)
        .eq("balance_session_series.balance_rooms.kind", "regular")
        .neq("match_outcome", "pending")
        .order("opened_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    loadAllStatsRows((from, to) =>
      historyClient
        .from("balance_session_series")
        .select("id,opened_at,balance_rooms!inner(kind)")
        .eq("clan_id", clanId)
        .eq("balance_rooms.kind", "regular")
        .order("opened_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase.rpc("clan_peer_nicknames", { p_clan_id: clanId }),
  ]);

  const records = normalizeClanMatchRecords(
    rawMatches as StoredClanMatch[],
    completedSessions,
  );
  // A void result remains visible in the archive but does not count as a played match.
  const matches = records.filter((record) => record.outcome !== "void" && record.outcome !== "unrecorded");
  const cfg = resolveHofConfig(settings?.hof_config);
  const exposeHof = settings?.expose_hof ?? false;
  const nick = buildNickMap(nickRows);

  let intraCount = 0;
  let scrimCount = 0;
  let eventCount = 0;
  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (m.match_type === "intra") intraCount++;
    else if (m.match_type === "scrim") scrimCount++;
    else eventCount++;
  }

  const intraMatchesByYearMonth: Record<string, Record<string, number>> = {};
  const intraParticipantsByYearMonth: Record<
    string,
    Record<string, Set<string>>
  > = {};
  for (const m of matches) {
    if (m.status !== "finished" || m.match_type !== "intra") continue;
    const { y, m: mo } = toKstParts(new Date(m.played_at));
    const ys = String(y);
    const ms = String(mo);
    if (!intraMatchesByYearMonth[ys]) intraMatchesByYearMonth[ys] = {};
    intraMatchesByYearMonth[ys][ms] =
      (intraMatchesByYearMonth[ys][ms] ?? 0) + 1;
    if (!intraParticipantsByYearMonth[ys])
      intraParticipantsByYearMonth[ys] = {};
    if (!intraParticipantsByYearMonth[ys][ms]) {
      intraParticipantsByYearMonth[ys][ms] = new Set();
    }
    for (const p of m.match_players ?? []) {
      intraParticipantsByYearMonth[ys][ms].add(p.user_id);
    }
  }

  const intraParticipantsFlat: Record<string, Record<string, number>> = {};
  for (const y of Object.keys(intraParticipantsByYearMonth)) {
    intraParticipantsFlat[y] = {};
    for (const mo of Object.keys(intraParticipantsByYearMonth[y]!)) {
      intraParticipantsFlat[y][mo] = intraParticipantsByYearMonth[y]![mo]!.size;
    }
  }

  const years = Array.from(
    new Set([
      ...Object.keys(intraMatchesByYearMonth),
    ]),
  ).sort((a, b) => Number(b) - Number(a));

  const datesKst = new Set<string>();
  const sampleByDate: Record<string, ClanArchiveMatch[]> = {};
  for (const m of viewMatchRecords ? records.filter((record) => record.match_type === "intra") : []) {
    const d = isoToKstYmd(m.played_at);
    datesKst.add(d);
    if (!sampleByDate[d]) sampleByDate[d] = [];
    sampleByDate[d].push({
      id: m.id,
      matchType: m.match_type,
      mapLabel: m.map_label,
      playedAt: m.played_at,
      source: m.source,
      outcome: m.outcome,
      winnerTeam: getWinnerTeam(m),
      players: m.match_players.map((player) => ({
        userId: player.user_id,
        nickname: nick.get(player.user_id) ?? "탈퇴한 멤버",
        team: player.team,
        role: player.role,
        m: viewMscore ? player.m : null,
        a: viewMscore ? player.a : null,
      })),
    });
  }
  const archiveDates = Array.from(datesKst).sort().reverse();
  const hofSessions = openedSessions.map((session) => ({ id: session.id, openedAt: session.opened_at }));
  const predictions: PredictionRecord[] = completedSessions.flatMap((session) => {
    const outcome = session.match_outcome;
    if (outcome === "pending") return [];
    return (session.balance_session_predictions ?? []).map((pick) => ({
      sessionId: session.id,
      userId: pick.user_id,
      playedAt: session.balance_session_series?.opened_at ?? session.opened_at,
      map: session.resolved_map_label,
      pickTeam: pick.pick_team,
      outcome,
    }));
  });
  // The personal privacy override is not persisted yet. Until it is, keep
  // other members' detailed records within staff access even if a member is
  // granted the broad aggregate-statistics permission set.
  const canSeeOthers = role !== "member" && viewMonthly && viewYearly && viewMaps && viewSynergy && viewMscore;
  const viewPersonalRecords = role !== "member" || cfg.memberPersonalRecords;
  const peopleIds = !viewPersonalRecords ? [] : canSeeOthers ? [...new Set([userId, ...nick.keys()])] : [userId];
  const personal = peopleIds.map((id) => ({
    userId: id,
    nickname: nick.get(id) ?? (id === userId ? "나" : "탈퇴한 멤버"),
    matches: buildPersonalMatches(matches, id, nick, viewSynergy && role !== "member"),
    predictions: id === userId ? personalPredictions(predictions, id) : [],
  }));

  const intra = buildIntraStats(records, hofSessions);
  if (!viewMatchRecords) {
    // The overview is available to members; individual round rows require
    // the separate match-records permission even when the aggregates do not.
    intra.scoreGaps = [];
    intra.recent = [];
  }
  if (!viewMscore || role === "member" || !options?.includeManagement) {
    intra.scoreGaps = [];
    intra.scoreGapSummary = {
      evaluation: { count: 0, average: null, ranges: [0, 0, 0, 0] },
      analysis: { count: 0, average: null, ranges: [0, 0, 0, 0] },
    };
  }
  const currentPeriod = currentKstYearMonth(now);
  const currentMonthKey = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")}`;
  const historicalMonths = [...new Set([
    ...matches.filter(isCompletedIntra).map((match) => isoToKstYmd(match.played_at).slice(0, 7)),
    ...hofSessions.map((session) => isoToKstYmd(session.openedAt).slice(0, 7)),
  ])].filter((key) => key < currentMonthKey).sort().reverse();
  const historicalYears = [...new Set(historicalMonths.map((key) => key.slice(0, 4)))]
    .filter((key) => Number(key) < currentPeriod.year).sort().reverse();
  const historyMonths = Object.fromEntries(historicalMonths.map((key) => [
    key, buildHofPeriod(matches, "month", cfg, nick, new Date(`${key}-15T12:00:00+09:00`), hofSessions, role !== "member", true, predictions),
  ]));
  const historyYears = Object.fromEntries(historicalYears.map((key) => [
    key, buildHofPeriod(matches, "year", cfg, nick, new Date(`${key}-06-15T12:00:00+09:00`), hofSessions, role !== "member", true, predictions),
  ]));

  return {
    clanId,
    intra,
    personal: { viewerId: userId, canSeePeers: viewSynergy && role !== "member", people: personal },
    summary: {
      totalMatches: matches.filter((m) => m.status === "finished").length,
      intraCount,
      scrimCount,
      eventCount,
      memberCount: memberCount ?? 0,
      clanCreatedAt: clan.created_at,
    },
    hof: {
      exposeHof,
      config: cfg,
      periods: {
        all: buildHofPeriod(matches, "all", cfg, nick, now, hofSessions, role !== "member", false, predictions),
        month: buildHofPeriod(matches, "month", cfg, nick, now, hofSessions, role !== "member", false, predictions),
        year: buildHofPeriod(matches, "year", cfg, nick, now, hofSessions, role !== "member", false, predictions),
      },
      historyMonths,
      historyYears,
    },
    rankmap: {
      personDaysByYearMonth: {},
      intraMatchesByYearMonth,
      intraParticipantsByYearMonth: intraParticipantsFlat,
      years,
    },
    archive: {
      datesKst: archiveDates,
      sampleByDate,
    },
    permissions: {
      viewPersonalRecords,
      setHofRules,
      isLeader: role === "leader",
      isStaff: role !== "member",
      viewMatchRecords,
      viewMscore,
      exportCsv,
    },
  };
}
