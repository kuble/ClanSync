"use server";

import { revalidatePath } from "next/cache";
import { CLAN_STYLES, OVERWATCH_POSITIONS, readRecruitmentYears, recruitmentTiers } from "@/lib/clan/recruitment";
import { managedPromotionClan } from "@/lib/clan/promotion-access";
import { parsePromotionBlocks } from "@/lib/clan/promotion";
import { uuidPattern } from "@/lib/clan/board";
import type { Json } from "@/lib/supabase/database.types";

export async function saveClanPromotionAction(gameSlug: string, clanId: string, form: FormData) {
  const access = await managedPromotionClan(gameSlug, clanId);
  if (!access) return { ok: false as const, error: "클랜 홍보를 저장할 권한이 없습니다." };
  const years = readRecruitmentYears(form);
  if (!years.ok) return years;
  const gender = String(form.get("gender_policy") ?? "");
  const tiers = [...new Set(form.getAll("tier_range").map(String))];
  const style = form.get("style");
  const positions = form.getAll("recruitment_positions").map(String);
  const allPositions = positions.length === 1 && positions[0] === "all";
  if (style != null && style !== "" && !CLAN_STYLES.some(option => option.value === style))
    return { ok: false as const, error: "클랜 지향을 확인해 주십시오." };
  if (positions.length && (gameSlug !== "overwatch" || (!allPositions && positions.some(value => !OVERWATCH_POSITIONS.some(option => option.value === value)))))
    return { ok: false as const, error: "모집할 주포지션을 확인해 주십시오." };
  const title = String(form.get("title") ?? "").trim();
  const postId = String(form.get("post_id") ?? "");
  const version = String(form.get("updated_at") ?? "");
  let blocks;
  try { blocks = parsePromotionBlocks(JSON.parse(String(form.get("blocks") ?? ""))); } catch { blocks = null; }
  if (!uuidPattern.test(postId) || (version && !Number.isFinite(Date.parse(version))) || !title || title.length > 200 || !blocks?.length)
    return { ok: false as const, error: "제목과 내용을 확인해 주십시오." };
  if (!["all", "male", "female"].includes(gender) || tiers.some(tier => !recruitmentTiers(gameSlug).some(([value]) => value === tier)))
    return { ok: false as const, error: "가입 조건을 확인해 주십시오." };
  const { data, error } = await access.client.rpc("save_clan_promotion", {
    p_clan_id: clanId, p_post_id: postId, p_expected_updated_at: version || undefined,
    p_title: title, p_blocks: blocks as Json, p_birth_year_limit: years.min_birth_year ?? undefined, p_birth_year_from: years.birth_year_from ?? undefined, p_gender_policy: gender, p_tiers: tiers,
    p_style: style == null ? undefined : String(style),
    p_positions: positions.length === 0 ? undefined : allPositions ? [] : positions,
  });
  if (error || !data?.[0]) return { ok: false as const, error: error?.code === "40001" ? "다른 운영진이 수정했습니다. 새로고침 후 다시 저장해 주십시오." : "저장하지 못했습니다. 입력 내용과 클랜 권한을 확인해 주십시오." };
  revalidatePath(`/games/${gameSlug}/clan`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true as const, postId: data[0].id, updatedAt: data[0].updated_at };
}
