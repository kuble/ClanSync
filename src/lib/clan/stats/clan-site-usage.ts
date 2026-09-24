import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ClanSiteVisit = { date: string; userId: string };

/** Call only after the management page has verified an active officer or leader. */
export async function loadClanSiteVisits(
  client: SupabaseClient<Database>,
  clanId: string,
): Promise<ClanSiteVisit[]> {
  const pageSize = 500;
  const visits: ClanSiteVisit[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("clan_daily_member_activity")
      .select("activity_date,user_id")
      .eq("clan_id", clanId)
      .order("activity_date", { ascending: false })
      .order("user_id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error("사이트 이용 통계를 불러오지 못했습니다.");
    visits.push(...(data ?? []).map((row) => ({ date: row.activity_date, userId: row.user_id })));
    if (!data || data.length < pageSize) break;
  }
  return visits;
}

export function summarizeVisits(visits: readonly ClanSiteVisit[], start: string, end: string) {
  const selected = visits.filter((visit) => visit.date >= start && visit.date <= end);
  return { visitors: new Set(selected.map((visit) => visit.userId)).size, personDays: selected.length };
}
