import { redirect } from "next/navigation";
import { MainGameCommunityTabs } from "@/components/main-game/main-game-community-tabs";
import { createClient } from "@/lib/supabase/server";
import {
  loadClanRankPreview,
  loadOpenLfgPosts,
  loadPromotionFeed,
  loadScrimGuestClanOptions,
  loadScrimRoomsForGame,
} from "@/lib/main-game/load-main-game-hub";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";

/**
 * 게임별 커뮤니티 — 홍보·LFG·스크림과 공개 클랜 활동.
 */
export default async function MainGamePage({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}) {
  const { gameSlug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const state = await loadGameOnboarding(supabase, user.id, gameSlug);
  if (!state) redirect("/games");

  const { data: game } = await supabase
    .from("games")
    .select("id, name_ko, slug, is_active")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (!game?.id) redirect("/games");

  const base = `/games/${encodeURIComponent(gameSlug)}`;

  const clanHubHref =
    state.clanStatus === "member" && state.clanId
      ? `${base}/clan/${state.clanId}`
      : `${base}/clan`;

  const [promos, lfgBundle, rankClans, scrimRooms, scrimGuestClans] =
    await Promise.all([
      loadPromotionFeed(supabase, game.id, "newest"),
      loadOpenLfgPosts(supabase, game.id, user.id),
      loadClanRankPreview(supabase, game.id),
      loadScrimRoomsForGame(supabase, game.id),
      loadScrimGuestClanOptions(supabase, game.id),
    ]);

  let canConfirmScrim = false;
  if (state.clanStatus === "member" && state.clanId) {
    canConfirmScrim = await hasClanPermission(
      supabase,
      user.id,
      state.clanId,
      "confirm_scrim",
    );
  }

  const myClanId =
    state.clanStatus === "member" ? (state.clanId ?? null) : null;

  const canPostPromo = state.clanStatus === "member" && !!state.clanId;
  const canCreateLfg = state.authVerified;

  return (
    <MainGameCommunityTabs
      gameSlug={gameSlug}
      gameName={game.name_ko}
      clanLabel={
        state.clanName ??
        (state.clanStatus === "pending" ? "가입 신청 확인" : "클랜 찾기")
      }
      gameActive={game.is_active}
      promos={promos}
      lfgs={lfgBundle.posts}
      applicantsByPost={lfgBundle.applicantsByPost}
      rankClans={rankClans}
      scrimRooms={scrimRooms}
      scrimGuestClans={scrimGuestClans}
      myClanId={myClanId}
      canConfirmScrim={canConfirmScrim}
      canPostPromo={canPostPromo}
      canCreateLfg={canCreateLfg}
      userId={user.id}
      clanHubHref={clanHubHref}
    />
  );
}
