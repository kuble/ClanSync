import type { SupabaseClient } from "@supabase/supabase-js";
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

export type HofPeriodPayload = {
  undisclosed: boolean;
  undisclosedHint: string | null;
  winRate: HofRowWinRate[];
  participation: HofRowParticipation[];
  cumulative: HofRowCumulative[];
};

export type ClanStatsPageModel = {
  clanId: string;
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
    setHofRules: boolean;
    isLeader: boolean;
    viewMatchRecords: boolean;
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
    m.status === "finished" && m.match_type === "intra" && m.outcome !== "void"
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
): HofPeriodPayload {
  const undisclosedMonth = period === "month" && isHofMonthTabUndisclosed(cfg);
  const undisclosedYear = period === "year" && isHofYearTabUndisclosed(cfg);
  const undisclosed = undisclosedMonth || undisclosedYear;
  const undisclosedHint = undisclosedMonth
    ? "월별 순위는 클랜 설정에 따라 다음 달 1일에 확정·공개됩니다."
    : undisclosedYear
      ? "연도별 순위는 클랜 설정에 따라 다음 해 1월 1일에 확정·공개됩니다."
      : null;

  if (undisclosed) {
    return {
      undisclosed: true,
      undisclosedHint,
      winRate: [],
      participation: [],
      cumulative: [],
    };
  }

  const matches = filterMatches(allRows, period, now);
  const totalIntra = matches.length;
  const minG =
    totalIntra > 0
      ? minGamesToQualify(totalIntra, cfg)
      : Number.MAX_SAFE_INTEGER;

  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const played = new Map<string, number>();

  for (const m of matches) {
    const wt = getWinnerTeam(m);
    const players = m.match_players ?? [];
    for (const p of players) {
      played.set(p.user_id, (played.get(p.user_id) ?? 0) + 1);
      // A draw or a finished game awaiting its result still counts as attendance.
      if (wt === null) continue;
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
    const l = losses.get(uid) ?? 0;
    const dec = w + l;
    if (dec === 0) continue;
    winRate.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      wins: w,
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
  const winTop =
    cfg.winRateVisibleTop === 999 ? winRate.length : cfg.winRateVisibleTop;
  const winSlice = winRate.slice(0, winTop);

  const participation: HofRowParticipation[] = [];
  const denom = Math.max(totalIntra, 1);
  for (const uid of played.keys()) {
    if (!eligible(uid)) continue;
    const pl = played.get(uid) ?? 0;
    participation.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      played: pl,
      ratePct: Math.round((pl / denom) * 1000) / 10,
    });
  }
  participation.sort((a, b) => b.ratePct - a.ratePct || b.played - a.played);
  const partTop =
    cfg.participationVisibleTop === 999
      ? participation.length
      : cfg.participationVisibleTop;
  const partSlice = participation.slice(0, partTop);

  const cumulative: HofRowCumulative[] = [];
  for (const uid of played.keys()) {
    if (!eligible(uid)) continue;
    cumulative.push({
      userId: uid,
      nickname: nick.get(uid) ?? "알 수 없음",
      played: played.get(uid) ?? 0,
    });
  }
  cumulative.sort((a, b) => b.played - a.played);
  const cumTop =
    cfg.cumulativeVisibleTop === 999
      ? cumulative.length
      : cfg.cumulativeVisibleTop;
  const cumSlice = cumulative.slice(0, cumTop);

  return {
    undisclosed: false,
    undisclosedHint: null,
    winRate: winSlice,
    participation: partSlice,
    cumulative: cumSlice,
  };
}

export async function loadClanStatsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  options?: { now?: Date },
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

  const [
    setHofRules,
    viewMatchRecords,
    exportCsv,
    rawMatches,
    completedSessions,
    activityRows,
    { data: nickRows },
  ] = await Promise.all([
    hasClanPermission(supabase, userId, clanId, "set_hof_rules"),
    hasClanPermission(supabase, userId, clanId, "view_match_records"),
    hasClanPermission(supabase, userId, clanId, "export_csv"),
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
      supabase
        .from("balance_sessions")
        .select(
          "id,opened_at,closed_at,predictions_settled_at,resolved_map_label,roster,ma_snapshot,match_outcome,balance_session_series!inner(opened_at,balance_rooms!inner(kind))",
        )
        .eq("clan_id", clanId)
        .eq("balance_session_series.balance_rooms.kind", "regular")
        .neq("match_outcome", "pending")
        .order("opened_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    loadAllStatsRows((from, to) =>
      supabase
        .from("clan_daily_member_activity")
        .select("activity_date")
        .eq("clan_id", clanId)
        .order("activity_date", { ascending: false })
        .order("user_id")
        .range(from, to),
    ),
    supabase.rpc("clan_peer_nicknames", { p_clan_id: clanId }),
  ]);

  const records = normalizeClanMatchRecords(
    rawMatches as StoredClanMatch[],
    completedSessions,
  );
  // A void result remains visible in the archive but does not count as a played match.
  const matches = records.filter((record) => record.outcome !== "void");
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

  const personDaysByYearMonth: Record<string, Record<string, number>> = {};
  for (const r of activityRows ?? []) {
    const d = r.activity_date;
    const [y, mo] = d.split("-").map(Number);
    const ys = String(y);
    const ms = String(mo);
    if (!personDaysByYearMonth[ys]) personDaysByYearMonth[ys] = {};
    personDaysByYearMonth[ys][ms] = (personDaysByYearMonth[ys][ms] ?? 0) + 1;
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
      ...Object.keys(personDaysByYearMonth),
      ...Object.keys(intraMatchesByYearMonth),
    ]),
  ).sort((a, b) => Number(b) - Number(a));

  const datesKst = new Set<string>();
  const sampleByDate: Record<string, ClanArchiveMatch[]> = {};
  for (const m of viewMatchRecords ? records : []) {
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
        m: player.m,
        a: player.a,
      })),
    });
  }
  const archiveDates = Array.from(datesKst).sort().reverse();

  return {
    clanId,
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
        all: buildHofPeriod(matches, "all", cfg, nick, now),
        month: buildHofPeriod(matches, "month", cfg, nick, now),
        year: buildHofPeriod(matches, "year", cfg, nick, now),
      },
    },
    rankmap: {
      personDaysByYearMonth,
      intraMatchesByYearMonth,
      intraParticipantsByYearMonth: intraParticipantsFlat,
      years,
    },
    archive: {
      datesKst: archiveDates,
      sampleByDate,
    },
    permissions: {
      setHofRules,
      isLeader: role === "leader",
      viewMatchRecords,
      exportCsv,
    },
  };
}
