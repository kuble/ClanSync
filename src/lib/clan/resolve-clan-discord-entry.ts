import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createDiscordGuildInvite } from "@/lib/notifications/discord-bot";
import { readClanCommunityLinks } from "./community-links";

/** Only an active member can mint an invite; guild/channel IDs never come from the browser. */
export async function resolveClanDiscordEntry(client: SupabaseClient<Database>, gameSlug: string, clanId: string): Promise<
  { ok: true; href: string } | { ok: false; reason: "forbidden" | "unavailable" | "no-link" }
> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clanId)) return { ok: false, reason: "forbidden" };
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { ok: false, reason: "forbidden" };
  const membership = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  if (membership.error || membership.data?.[0]?.status !== "active") return { ok: false, reason: "forbidden" };
  const clan = await client.from("clans").select("discord_url,kakao_url,games!inner(slug)").eq("id", clanId).single();
  const game = Array.isArray(clan.data?.games) ? clan.data.games[0] : clan.data?.games;
  if (clan.error || !game || game.slug !== gameSlug) return { ok: false, reason: "forbidden" };
  const connection = await createServiceRoleClient().from("clan_discord_connections").select("guild_id,channel_id").eq("clan_id", clanId).maybeSingle();
  if (connection.error) return { ok: false, reason: "unavailable" };
  if (connection.data) {
    try {
      return { ok: true, href: await createDiscordGuildInvite(connection.data.guild_id, connection.data.channel_id) };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }
  const settings = await client.from("clan_settings").select("community_links").eq("clan_id", clanId).single();
  if (settings.error) return { ok: false, reason: "unavailable" };
  const href = readClanCommunityLinks(settings.data.community_links, clan.data).discord;
  return href ? { ok: true, href } : { ok: false, reason: "no-link" };
}
