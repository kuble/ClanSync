import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { gameProfileIdentity } from "@/lib/game-auth/game-profile-identity";
import {
  fetchMyClanJoinRequests,
  filterPendingJoinsForGame,
} from "@/lib/clan/fetch-my-clan-join-requests";

export type ClanOnboardingStatus = "none" | "pending" | "member";

export type PendingJoinBrief = {
  requestId: string;
  clanId: string;
  clanName: string | null;
};

export type GameOnboardingState = {
  gameId: string;
  slug: string;
  authVerified: boolean;
  identityRegistered: boolean;
  clanStatus: ClanOnboardingStatus;
  clanId: string | null;
  clanName: string | null;
  /** `clanStatus === "pending"` 일 때 신청 행 세부(UI·캔슬 근거) */
  pendingJoin: PendingJoinBrief | null;
};

/**
 * D-AUTH-01 — 게임 단위 인증·클랜 소속 상태. 미들웨어·페이지에서 공통 사용.
 */
export async function loadGameOnboarding(
  supabase: SupabaseClient<Database>,
  userId: string,
  gameSlug: string,
): Promise<GameOnboardingState | null> {
  const [{ data: game, error: gErr }, { data: profiles }, { data: myClanRows }] = await Promise.all([
    supabase.from("games").select("id, slug").eq("slug", gameSlug).maybeSingle(),
    supabase
      .from("user_game_profiles")
      .select("game_id,is_verified,battle_tag,riot_id,game_uid")
      .eq("user_id", userId),
    supabase.rpc("my_active_clans_by_game"),
  ]);
  if (gErr || !game) return null;
  const ugp = profiles?.find(profile => profile.game_id === game.id);

  const authVerified = ugp?.is_verified === true;
  const identityRegistered = gameProfileIdentity(game.slug, ugp) !== null;

  const myClan = myClanRows?.find(clan => clan.game_id === game.id);
  if (myClan?.clan_id) {
    return {
      gameId: game.id,
      slug: game.slug,
      authVerified,
      identityRegistered,
      clanStatus: "member",
      clanId: myClan.clan_id,
      clanName: myClan.clan_name,
      pendingJoin: null,
    };
  }

  const { data: myJoinRows, error: joinErr } =
    await fetchMyClanJoinRequests(supabase);

  if (joinErr) {
    console.error("[loadGameOnboarding] select_my_clan_join_requests:", joinErr.message);
  }

  const pendingForGame = filterPendingJoinsForGame(myJoinRows, game.id);

  const pendingRow = pendingForGame[0];

  if (!pendingRow?.clan_id) {
    return {
      gameId: game.id,
      slug: game.slug,
      authVerified,
      identityRegistered,
      clanStatus: "none",
      clanId: null,
      clanName: null,
      pendingJoin: null,
    };
  }

  if (pendingForGame.length > 1) {
    console.warn(
      "[loadGameOnboarding] game",
      game.id,
      ": multiple pending joins for user — using latest",
    );
  }

  const { data: clanRow } = await supabase
    .from("clans")
    .select("name")
    .eq("id", pendingRow.clan_id)
    .maybeSingle();

  const clanName = clanRow?.name ?? null;
  const brief: PendingJoinBrief = {
    requestId: pendingRow.id,
    clanId: pendingRow.clan_id,
    clanName,
  };

  return {
    gameId: game.id,
    slug: game.slug,
    authVerified,
    identityRegistered,
    clanStatus: "pending",
    clanId: pendingRow.clan_id,
    clanName,
    pendingJoin: brief,
  };
}
