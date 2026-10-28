"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CHAT_SERVICES, parseClanCommunityLinks } from "@/lib/clan/community-links";

export async function updateClanCommunityLinksAction(gameSlug: string, clanId: string, formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: memberships, error: membershipError } = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  const member = memberships?.[0];
  if (membershipError || member?.status !== "active" || member.role !== "leader") return { ok: false as const, error: "채팅방 링크는 클랜장만 변경할 수 있습니다." };
  const { data: clan, error: clanError } = await client.from("clans").select("games!inner(slug)").eq("id", clanId).single();
  const game = Array.isArray(clan?.games) ? clan.games[0] : clan?.games;
  if (clanError || !game || game.slug !== gameSlug) return { ok: false as const, error: "클랜을 확인할 수 없습니다." };
  const parsed = parseClanCommunityLinks(Object.fromEntries(CHAT_SERVICES.map(({ id }) => [id, formData.get(id) ?? ""])));
  if (!parsed.ok) return parsed;
  const { error } = await client.from("clan_settings").update({ community_links: parsed.links, updated_by: user.id }).eq("clan_id", clanId).select("clan_id").single();
  if (error) return { ok: false as const, error: "채팅방 링크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true as const, links: parsed.links };
}
