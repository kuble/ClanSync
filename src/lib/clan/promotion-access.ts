import "server-only";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/clan/board";

export async function managedPromotionClan(gameSlug: string, clanId: string) {
  if (!uuidPattern.test(clanId)) return null;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const [{ data, error }, clan] = await Promise.all([
    client.rpc("select_my_clan_membership", { p_clan_id: clanId }),
    client.from("clans").select("game_id,games!inner(slug)").eq("id", clanId).eq("lifecycle_status", "active").eq("moderation_status", "clean").single(),
  ]);
  const member = data?.[0];
  const game = Array.isArray(clan.data?.games) ? clan.data.games[0] : clan.data?.games;
  if (error || member?.status !== "active" || !["leader", "officer"].includes(member.role) || clan.error || game?.slug !== gameSlug) return null;
  return { client, user, gameId: clan.data!.game_id };
}
