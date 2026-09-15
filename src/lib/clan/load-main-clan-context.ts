import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";

export type MainClanPlan = "free" | "premium";

export type MainClanContext = {
  clanId: string;
  clanName: string;
  gameSlug: string;
  gameName: string;
  role: ClanMemberRole;
  plan: MainClanPlan;
  bannerUrl: string | null;
  iconUrl: string | null;
  memberCount: number | null;
  styleLabel: string | null;
  tags: string[];
  canStartBalance: boolean;
  sidebarDots: {
    balance: boolean;
    events: boolean;
    manage: boolean;
  };
};

/**
 * 활성 클랜 구성원의 레이아웃 정보와 진행 중 내전·가입 대기 알림.
 */
export async function loadMainClanContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  gameSlug: string,
  clanId: string,
): Promise<MainClanContext | null> {
  const { data: clan, error } = await supabase
    .from("clans")
    .select("id, name, subscription_tier, banner_url, icon_url, style, tags, games!inner(slug, name_ko)")
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
  const [members, balance, canStartBalance] = await Promise.all([
    supabase.from("clan_members").select("id", { count: "exact", head: true })
      .eq("clan_id", clanId).eq("status", "active"),
    supabase.from("balance_sessions").select("id", { count: "exact", head: true })
      .eq("clan_id", clanId).is("closed_at", null),
    hasClanPermission(supabase, userId, clanId, "manage_clan_events"),
  ]);
  const styles = { social: "친목", casual: "즐겜", tryhard: "빡겜", pro: "경쟁" };

  return {
    clanId: clan.id,
    clanName: clan.name,
    gameSlug: game.slug,
    gameName: game.name_ko,
    role,
    plan: tier === "premium" ? "premium" : "free",
    bannerUrl: clan.banner_url,
    iconUrl: clan.icon_url,
    memberCount: members.error ? null : members.count,
    styleLabel: clan.style ? styles[clan.style] : null,
    tags: clan.tags ?? [],
    canStartBalance,
    sidebarDots: {
      balance: !balance.error && (balance.count ?? 0) > 0,
      events: false,
      manage: manageDot,
    },
  };
}
