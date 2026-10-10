"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { PERSONAL_RECORD_ACCESS_OPTIONS, PERSONAL_STATS_SECTIONS } from "@/lib/clan/stats/personal-visibility";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function numberField(fd: FormData, key: string, fallback: number, min: number, max: number) {
  const value = Number(fd.get(key) ?? fallback);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
function top(fd: FormData, key: string, fallback: number) {
  const value = Number(fd.get(key) ?? fallback);
  return [0, 3, 5, 10, 20, 999].includes(value) ? value : fallback;
}

/** DB rechecks the authenticated actor and merges a whitelisted patch under a row lock. */
export async function saveClanHofConfigFormAction(gameSlug: string, clanId: string, fd: FormData): Promise<void> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  const scope = fd.get("settings_scope") ?? "all";
  if (!["all", "hof", "personal", "records", "intra"].includes(String(scope))) throw new Error("설정 영역이 올바르지 않습니다.");
  const { data, error } = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  const member = !error ? data?.[0] : undefined;
  if (!member || member.status !== "active" || member.role === "member") throw new Error("운영진만 설정을 변경할 수 있습니다.");
  if (scope === "records" || scope === "intra") {
    if (member.role !== "leader") throw new Error("클랜장만 열람·작업 권한을 설정할 수 있습니다.");
  } else if (!await hasClanPermission(client, user.id, clanId, "set_hof_rules")) throw new Error("통계 설정 권한이 없습니다.");
  const patch: Record<string, Json> = {};
  if (scope === "records" || scope === "intra") {
    const keys = scope === "records" ? ["view_match_records", "create_match_records", "edit_match_records", "delete_match_records"] : ["view_intra_stats"];
    for (const key of keys) {
      const roles = fd.getAll(key);
      if (roles.some((role) => !["leader", "officer", "member"].includes(String(role)))) throw new Error("권한 대상이 올바르지 않습니다.");
      patch[key] = ["leader", ...["officer", "member"].filter((role) => roles.includes(role))];
    }
  } else {
    if (scope === "personal" || scope === "all") {
      patch.member_personal_records = fd.get("member_personal_records") === "on";
      if (scope === "personal") {
        const minimum = fd.get("personal_record_min_role");
        if (!PERSONAL_RECORD_ACCESS_OPTIONS.some(({ id }) => id === minimum)) throw new Error("공개 대상이 올바르지 않습니다.");
        patch.personal_record_min_role = String(minimum);
        patch.member_personal_records = minimum === "member";
        patch.member_personal_audience = "clan";
        patch.member_personal_sections = PERSONAL_STATS_SECTIONS.filter(({ id }) => fd.getAll("member_personal_sections").includes(id)).map(({ id }) => id);
      }
    }
    if (scope === "hof" || scope === "all") {
      for (const [key, fallback] of [["win_rate_visible_top", 10], ["wins_visible_top", 0], ["streak_visible_top", 0], ["prediction_visible_top", 0], ["participation_visible_top", 10], ["cumulative_visible_top", 10]] as const) patch[key] = top(fd, key, fallback);
      patch.monthly_rank_visibility = fd.get("monthly_rank_visibility") === "month_start" ? "month_start" : "always";
      patch.yearly_rank_visibility = fd.get("yearly_rank_visibility") === "year_start" ? "year_start" : "always";
      patch.eligibility_game_threshold = numberField(fd, "eligibility_game_threshold", 100, 1, 5000);
      patch.eligibility_below_pct = numberField(fd, "eligibility_below_pct", 30, 1, 100);
      patch.eligibility_above_min_games = numberField(fd, "eligibility_above_min_games", 30, 1, 2000);
      patch.eligibility_session_pct = numberField(fd, "eligibility_session_pct", 30, 1, 100);
      if (member.role === "leader") patch.expose_hof = fd.get("expose_hof") === "on" || fd.get("expose_hof") === "true";
    }
  }
  const { error: saveError } = await createServiceRoleClient().rpc("save_clan_stats_settings", {
    p_clan_id: clanId, p_actor_id: user.id, p_scope: String(scope), p_patch: patch,
  });
  if (saveError) throw new Error("설정을 저장하지 못했습니다.", { cause: saveError });
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/stats`);
}
