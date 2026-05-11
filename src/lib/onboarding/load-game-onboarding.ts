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

  /* 프로필(D-PROFILE-02)과 동일: 테이블 RLS 조합 회피 — SECURITY DEFINER RPC 후 game·status 로 필터 */
  const { data: myJoinRows, error: joinErr } = await supabase.rpc(
    "select_my_clan_join_requests",
  );

  if (joinErr) {
    console.error("[loadGameOnboarding] select_my_clan_join_requests:", joinErr.message);
  }

  const pendingForGame =
    myJoinRows?.filter(
      (r) =>
        String(r.game_id) === String(game.id) &&
        String(r.status) === "pending",
    ) ?? [];

  pendingForGame.sort(
    (a, b) => Date.parse(b.applied_at) - Date.parse(a.applied_at),
  );

  const pendingRows = pendingForGame.slice(0, 2);
  const pendingRow = pendingRows[0];

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
