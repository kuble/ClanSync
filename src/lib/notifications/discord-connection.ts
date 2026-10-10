import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function discordConnectionLeader(clanId: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  if (error || data?.[0]?.role !== "leader" || data[0].status !== "active") return null;
  const svc = createServiceRoleClient();
  const { data: clan } = await svc.from("clans").select("subscription_tier,games!inner(slug)").eq("id", clanId).single();
  if (clan?.subscription_tier !== "premium") return null;
  const game = clan.games as unknown as { slug: string };
  return { user, client, svc, gameSlug: game.slug };
}
