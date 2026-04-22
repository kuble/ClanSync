import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";

export type MainClanPlan = "free" | "premium";

export type MainClanContext = {
  clanId: string;
  clanName: string;
  gameSlug: string;
  gameName: string;
  role: ClanMemberRole;
  plan: MainClanPlan;
  sidebarDots: {
    balance: boolean;
    events: boolean;
    manage: boolean;
  };
};

/**
 * MainClan 레이아웃용 컨텍스트. D-SHELL-03 알림 점은 M4 에서 manage(pending 가입)만 실데이터.
 */
export async function loadMainClanContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  gameSlug: string,
  clanId: string,
): Promise<MainClanContext | null> {
  void userId;
  const { data: clan, error } = await supabase
    .from("clans")
    .select("id, name, subscription_tier, games!inner(slug, name_ko)")
    .eq("id", clanId)
    .maybeSingle();

  if (error || !clan) return null;

  const game = clan.games as unknown as { slug: string; name_ko: string };
  if (game.slug !== gameSlug) return null;

  const { data: memRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const member = memRows?.[0];
  if (!member || member.status !== "active") return null;

  const role = member.role as ClanMemberRole;
  let manageDot = false;

  if (role === "leader" || role === "officer") {
    const { count } = await supabase
      .from("clan_join_requests")
      .select("*", { count: "exact", head: true })
      .eq("clan_id", clanId)
      .eq("status", "pending");
    manageDot = (count ?? 0) > 0;
  }

  const tier = clan.subscription_tier as MainClanPlan | null;

  return {
    clanId: clan.id,
    clanName: clan.name,
    gameSlug: game.slug,
    gameName: game.name_ko,
    role,
    plan: tier === "premium" ? "premium" : "free",
    sidebarDots: {
      balance: false,
      events: false,
      manage: manageDot,
    },
  };
}
