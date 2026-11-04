import { cache } from "react";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { readClanCommunityLinks } from "./community-links";

export const getOwnInitializedRoles = cache(async (clanId: string) => {
  const client = await getRequestClient();
  const { data, error } = await client.rpc("read_own_initialized_roles", { p_clan_id: clanId });
  if (error) throw new Error("초기 분석점수가 반영된 역할을 불러오지 못했습니다.", { cause: error });
  return data ?? [];
});

export const getRequestClanWelcomeMembership = cache(async (clanId: string) => {
  const user = await getRequestUser();
  if (!user) return null;
  const supabase = await getRequestClient();
  const { data } = await supabase.from("clan_members").select("joined_at,created_at,welcome_completed_at").eq("clan_id", clanId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  return data;
});

/** Call after the layout has confirmed active clan membership. */
export async function loadClanWelcomeContent(clanId: string) {
  const supabase = await getRequestClient();
  const [clan, settings, notices, discord] = await Promise.all([
    supabase.from("clans").select("rules").eq("id", clanId).maybeSingle(),
    supabase.from("clan_settings").select("community_links").eq("clan_id", clanId).maybeSingle(),
    supabase.from("clan_notices").select("id,title,content").eq("clan_id", clanId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
    createServiceRoleClient().from("clan_discord_connections").select("clan_id").eq("clan_id", clanId).maybeSingle(),
  ]);
  return {
    rules: clan.data?.rules ?? null,
    communityLinks: readClanCommunityLinks(settings.data?.community_links),
    notices: notices.data ?? [],
    discordConnected: discord.error ? null : !!discord.data,
    errors: { rules: !!clan.error, notices: !!notices.error },
  };
}
