"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { resolveHofConfig } from "@/lib/clan/stats/hof-config";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function parseIntField(
  formData: FormData,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTop(formData: FormData, key: string, fallback: number): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") return fallback;
  const n = Number.parseInt(raw, 10);
  const ok = new Set([3, 5, 10, 20, 999]);
  return ok.has(n) ? n : fallback;
}

/** set_hof_rules 보유자 — HoF 규칙 JSON 저장 (클랜장 전용 expose_hof 는 별도 액션) */
export async function saveClanHofConfigFormAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "set_hof_rules",
  );
  if (!allowed) throw new Error("명예의 전당 설정 권한이 없습니다.");

  const payload = {
    win_rate_visible_top: parseTop(formData, "win_rate_visible_top", 10),
    participation_visible_top: parseTop(
      formData,
      "participation_visible_top",
      10,
    ),
    cumulative_visible_top: parseTop(formData, "cumulative_visible_top", 10),
    monthly_rank_visibility:
      formData.get("monthly_rank_visibility") === "month_start"
        ? "month_start"
        : "always",
    yearly_rank_visibility:
      formData.get("yearly_rank_visibility") === "year_start"
        ? "year_start"
        : "always",
    eligibility_game_threshold: parseIntField(
      formData,
      "eligibility_game_threshold",
      100,
      1,
      5000,
    ),
    eligibility_below_pct: parseIntField(
      formData,
      "eligibility_below_pct",
      30,
      1,
      100,
    ),
    eligibility_above_min_games: parseIntField(
      formData,
      "eligibility_above_min_games",
      30,
      1,
      2000,
    ),
  };

  resolveHofConfig(payload);

  const { data: m } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const exposeHof =
    m?.role === "leader" &&
    (formData.get("expose_hof") === "on" ||
      formData.get("expose_hof") === "true");

  const svc = createServiceRoleClient();
  const updateBody =
    m?.role === "leader"
      ? {
          hof_config: payload,
          expose_hof: exposeHof,
          updated_by: user.id,
        }
      : { hof_config: payload, updated_by: user.id };

  const { error } = await svc
    .from("clan_settings")
    .update(updateBody)
    .eq("clan_id", clanId);

  if (error) throw new Error(error.message);

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/stats`);
}
