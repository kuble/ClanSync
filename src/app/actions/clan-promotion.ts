"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recruitmentTiers } from "@/lib/clan/recruitment";

async function managedClan(gameSlug: string, clanId: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  const member = data?.[0];
  if (error || member?.status !== "active" || !["leader", "officer"].includes(member.role)) return null;
  const clan = await client.from("clans").select("game_id,games!inner(slug)").eq("id", clanId).single();
  const game = Array.isArray(clan.data?.games) ? clan.data.games[0] : clan.data?.games;
  if (clan.error || game?.slug !== gameSlug) return null;
  return { client, user, gameId: clan.data!.game_id };
}

function refreshRecruitment(gameSlug: string, clanId: string) {
  revalidatePath(`/games/${gameSlug}`);
  revalidatePath(`/games/${gameSlug}/clan`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
}

export async function saveClanRecruitmentAction(gameSlug: string, clanId: string, form: FormData) {
  const access = await managedClan(gameSlug, clanId);
  if (!access) return { ok: false as const, error: "가입 조건을 변경할 권한이 없습니다." };
  const rawYear = String(form.get("min_birth_year") ?? "").trim();
  const year = rawYear ? Number(rawYear) : null;
  const gender = String(form.get("gender_policy") ?? "");
  const tiers = [...new Set(form.getAll("tier_range").map(String))];
  if ((year != null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() - 10)) || !["all", "male", "female"].includes(gender) || tiers.some(tier => !recruitmentTiers(gameSlug).some(([value]) => value === tier))) return { ok: false as const, error: "가입 조건을 확인해 주십시오." };
  const { error } = await access.client.rpc("update_clan_recruitment", { p_clan_id: clanId, p_birth_year_limit: year ?? undefined, p_gender_policy: gender, p_tiers: tiers });
  if (error) return { ok: false as const, error: "가입 조건을 저장하지 못했습니다. 권한과 입력값을 확인해 주십시오." };
  refreshRecruitment(gameSlug, clanId);
  return { ok: true as const };
}

export async function publishClanPromotionAction(gameSlug: string, clanId: string, form: FormData) {
  const access = await managedClan(gameSlug, clanId);
  if (!access) return { ok: false as const, error: "홍보글을 작성할 권한이 없습니다." };
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  if (!title || title.length > 200 || !content || content.length > 8000) return { ok: false as const, error: "제목(1~200자)과 내용(1~8,000자)을 입력해 주십시오." };
  const { data, error } = await access.client.from("board_posts").insert({ game_id: access.gameId, clan_id: clanId, post_type: "promotion", title, content, created_by: access.user.id }).select("id").single();
  if (error) return { ok: false as const, error: "홍보글을 게시하지 못했습니다. 잠시 후 다시 시도해 주십시오." };
  refreshRecruitment(gameSlug, clanId);
  return { ok: true as const, postId: data.id };
}
