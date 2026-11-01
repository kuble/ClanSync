"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { managedPromotionClan } from "@/lib/clan/promotion-access";
import { uuidPattern } from "@/lib/clan/board";

export async function getClanJoinInvite(gameSlug: string, clanId: string) {
  const access = await managedPromotionClan(gameSlug, clanId);
  if (!access) return { ok: false as const, error: "초대 링크를 발급할 권한이 없습니다." };
  const { data, error } = await access.client.rpc("get_clan_join_invite", { p_clan_id: clanId });
  if (error || !data?.[0]) return { ok: false as const, error: "초대 링크를 불러오지 못했습니다. 다시 시도해 주십시오." };
  const invite = data[0];
  return { ok: true as const, path: `/games/${gameSlug}/invite/${invite.token}`, expiresAt: invite.expires_at, serverNow: invite.server_now };
}

export async function joinClanByInvite(_previous: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const token = String(form.get("token") ?? "");
  if (!uuidPattern.test(token)) return { error: "사용할 수 없는 초대 링크입니다." };
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return { error: "로그인이 필요합니다. 새로고침 후 로그인해 주십시오." };
  const { data, error } = await client.rpc("join_clan_by_invite", { p_token: token });
  if (error || !data?.[0]) return { error: error?.message ?? "클랜에 가입하지 못했습니다." };
  const joined = data[0];
  revalidatePath("/games", "layout");
  revalidatePath("/profile");
  redirect(`/games/${joined.game_slug}/clan/${joined.joined_clan_id}/balance`);
}
