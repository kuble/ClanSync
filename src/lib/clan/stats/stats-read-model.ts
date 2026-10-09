import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { OW_HEROES } from "@/lib/balance/ow-hero-ban";
import { EMPTY_INTRA_OVERVIEW, type IntraOverview } from "./intra-overview";
import { normalizeClanMatchRecords, type StoredClanMatch, type CompletedBalanceSession } from "./normalize-clan-match-records";

export type StatsAggregate = {
  totals: { sessions: number; days: number; matches: number };
  players: { userId: string; played: number; wins: number; draws: number; losses: number; days: number; longest: number; lastPlayedAt: string }[];
  predictions: { userId: string; valid: number; correct: number }[];
  summary: { totalMatches: number; intraCount: number; scrimCount: number; eventCount: number };
  overview: IntraOverview;
  archive: { datesKst: string[]; maps: string[] };
};
export type StatsSummary = {
  periods: Record<string, StatsAggregate>;
  directory: Record<string, Pick<IntraOverview, "sessions" | "completed" | "participants">>;
};
export const EMPTY_STATS_AGGREGATE: StatsAggregate = {
  totals: { sessions: 0, days: 0, matches: 0 }, players: [], predictions: [],
  summary: { totalMatches: 0, intraCount: 0, scrimCount: 0, eventCount: 0 },
  overview: EMPTY_INTRA_OVERVIEW, archive: { datesKst: [], maps: [] },
};

/** Call only after a fresh membership/permission check. RPCs are service-only. */
export async function readStatsSummary(clanId: string, periods: string[]): Promise<StatsSummary> {
  const client: SupabaseClient<Database> = createServiceRoleClient();
  const { data, error } = await client.rpc("read_clan_stats_summary", { p_clan_id: clanId, p_periods: periods });
  if (error) throw new Error("통계 요약을 불러오지 못했습니다.", { cause: error });
  const summary = data as unknown as StatsSummary;
  for (const value of Object.values(summary.periods)) {
    const rank = (a: { name: string; value: number }, b: { name: string; value: number }) => b.value - a.value || a.name.localeCompare(b.name, "ko");
    value.overview.maps.sort(rank);
    value.overview.mapVotes.sort(rank);
    value.overview.bans = value.overview.bans.map(({ id, value }) => {
      const hero = OW_HEROES.find((hero) => hero.id === id);
      return { id, value, name: hero?.nameKo ?? id, role: hero?.role ?? null };
    // The reference ranks ties by hero id before looking up its display name.
    }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id, "ko"));
  }
  return summary;
}

/** Indexed date/member selection. Pagination applies only to that selection. */
export async function readStatsRecords(clanId: string, filter: { day?: string; userId?: string }) {
  const client: SupabaseClient<Database> = createServiceRoleClient();
  const matches: StoredClanMatch[] = [], sessions: CompletedBalanceSession[] = [];
  const revisions = new Map<string, string>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.rpc("read_clan_stats_records", {
      p_clan_id: clanId, p_day: filter.day, p_user_id: filter.userId, p_offset: offset,
    });
    if (error) throw new Error("통계 기록을 불러오지 못했습니다.", { cause: error });
    for (const row of data ?? []) {
      const payload = row.payload as unknown as { id: string; _revision?: string };
      if (payload._revision) revisions.set(payload.id, payload._revision);
      if (row.source === "match") matches.push(row.payload as unknown as StoredClanMatch);
      else sessions.push(row.payload as unknown as CompletedBalanceSession);
    }
    if (!data || data.length < 500) break;
  }
  return normalizeClanMatchRecords(matches, sessions).map((record) => ({ ...record, revision: revisions.get(record.id) }));
}
