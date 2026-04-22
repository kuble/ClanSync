import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ClanOnboardingStatus = "none" | "pending" | "member";

export type GameOnboardingState = {
  gameId: string;
  slug: string;
  authVerified: boolean;
  clanStatus: ClanOnboardingStatus;
  clanId: string | null;
  clanName: string | null;
};

/**
 * D-AUTH-01 — 게임 단위 인증·클랜 소속 상태. 미들웨어·페이지에서 공통 사용.
 */
export async function loadGameOnboarding(
  supabase: SupabaseClient<Database>,
  userId: string,
  gameSlug: string,
): Promise<GameOnboardingState | null> {
  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id, slug")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (gErr || !game) return null;

  const { data: ugp } = await supabase
    .from("user_game_profiles")
    .select("is_verified")
    .eq("user_id", userId)
    .eq("game_id", game.id)
    .maybeSingle();

  const authVerified = ugp?.is_verified === true;

  const { data: activeRows } = await supabase
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .eq("status", "active");

  const activeIds = [...new Set((activeRows ?? []).map((r) => r.clan_id))];
  if (activeIds.length > 0) {
    const { data: clan } = await supabase
      .from("clans")
      .select("id, name")
      .eq("game_id", game.id)
      .in("id", activeIds)
      .limit(1)
      .maybeSingle();

    if (clan) {
      return {
        gameId: game.id,
        slug: game.slug,
        authVerified,
        clanStatus: "member",
        clanId: clan.id,
        clanName: clan.name,
      };
    }
  }

  const { data: pendingRow } = await supabase
    .from("clan_join_requests")
    .select("clan_id, clans!inner(name)")
    .eq("user_id", userId)
    .eq("game_id", game.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRow?.clan_id) {
    const joined = pendingRow.clans as unknown as { name: string };
    return {
      gameId: game.id,
      slug: game.slug,
      authVerified,
      clanStatus: "pending",
      clanId: pendingRow.clan_id,
      clanName: joined?.name ?? null,
    };
  }

  return {
    gameId: game.id,
    slug: game.slug,
    authVerified,
    clanStatus: "none",
    clanId: null,
    clanName: null,
  };
}
