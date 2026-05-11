import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ClanOnboardingStatus = "none" | "pending" | "member";

/** 대기 중 가입 신청 — PostgREST `clans!inner` 임베드 없이 채워 RLS·조인 불일치로 행 소실되는 것 방지 */
export type PendingJoinBrief = {
  requestId: string;
  clanId: string;
  clanName: string | null;
  message: string;
};

export type GameOnboardingState = {
  gameId: string;
  slug: string;
  authVerified: boolean;
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

  const { data: myClanRows } = await supabase.rpc("my_active_clan_for_game", {
    p_game_id: game.id,
  });
  const myClan = myClanRows?.[0];
  if (myClan?.clan_id) {
    return {
      gameId: game.id,
      slug: game.slug,
      authVerified,
      clanStatus: "member",
      clanId: myClan.clan_id,
      clanName: myClan.clan_name,
      pendingJoin: null,
    };
  }

  /* embed 없음: 조인 결과 0건으로 신청 행 통째로 사라지는 케이스 방지 */
  const { data: pendingRows, error: pendingErr } = await supabase
    .from("clan_join_requests")
    .select("id, clan_id, message")
    .eq("user_id", userId)
    .eq("game_id", game.id)
    .eq("status", "pending")
    .order("applied_at", { ascending: false })
    .limit(2);

  if (pendingErr) {
    console.error("[loadGameOnboarding] pending join:", pendingErr.message);
  }

  const pendingRow = pendingRows?.[0];
  if (!pendingRow?.clan_id) {
    return {
      gameId: game.id,
      slug: game.slug,
      authVerified,
      clanStatus: "none",
      clanId: null,
      clanName: null,
      pendingJoin: null,
    };
  }

  if ((pendingRows?.length ?? 0) > 1) {
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
    message: pendingRow.message ?? "",
  };

  return {
    gameId: game.id,
    slug: game.slug,
    authVerified,
    clanStatus: "pending",
    clanId: pendingRow.clan_id,
    clanName,
    pendingJoin: brief,
  };
}
