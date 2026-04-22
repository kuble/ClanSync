import Link from "next/link";
import { redirect } from "next/navigation";
import { MainGameCommunityTabs } from "@/components/main-game/main-game-community-tabs";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import {
  loadClanRankPreview,
  loadOpenLfgPosts,
  loadPromotionFeed,
  type PromoSort,
} from "@/lib/main-game/load-main-game-hub";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { cn } from "@/lib/utils";

/**
 * MainGame 커뮤니티 허브 (M7 경량) — 홍보·LFG·순위 실데이터.
 */
export default async function MainGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ promoSort?: string }>;
}) {
  const { gameSlug } = await params;
  const sp = await searchParams;
  const promoSort: PromoSort = sp.promoSort === "space" ? "space" : "newest";

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

  let clanSummary: { label: string; href: string; tone: "muted" | "ok" | "warn" };
  if (state.clanStatus === "member" && state.clanId) {
    clanSummary = {
      label: `소속: ${state.clanName ?? "클랜"}`,
      href: `${base}/clan/${state.clanId}`,
      tone: "ok",
    };
  } else if (state.clanStatus === "pending") {
    clanSummary = {
      label: `가입 신청 중: ${state.clanName ?? "클랜"}`,
      href: `${base}/clan?pending=1`,
      tone: "warn",
    };
  } else {
    clanSummary = {
      label: "아직 클랜에 속해 있지 않습니다.",
      href: `${base}/clan`,
      tone: "muted",
    };
  }

  const clanHubHref =
    state.clanStatus === "member" && state.clanId
      ? `${base}/clan/${state.clanId}`
      : `${base}/clan`;

  const [promos, lfgBundle, rankClans] = await Promise.all([
    loadPromotionFeed(supabase, game.id, promoSort),
    loadOpenLfgPosts(supabase, game.id, user.id),
    loadClanRankPreview(supabase, game.id),
  ]);

  const canPostPromo = state.clanStatus === "member" && !!state.clanId;
  const canCreateLfg = state.authVerified;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          게임 커뮤니티
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {game.name_ko}
        </h1>
        {!game.is_active ? (
          <p className="text-muted-foreground mt-2 text-sm">
            이 게임은 현재 비활성 상태입니다.
          </p>
        ) : null}
      </header>

      <section
        className={cn(
          "mb-8 rounded-xl border p-4 text-sm shadow-sm",
          clanSummary.tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
          clanSummary.tone === "warn" && "border-amber-500/30 bg-amber-500/5",
          clanSummary.tone === "muted" && "bg-card",
        )}
      >
        <p className="font-medium">{clanSummary.label}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          게임 계정: {state.authVerified ? "연동됨" : "미연동"}
        </p>
        <Link
          href={clanSummary.href}
          className={cn(
            buttonVariants({ size: "sm", variant: "secondary" }),
            "mt-3 inline-flex",
          )}
        >
          클랜 허브 / 온보딩
        </Link>
      </section>

      <MainGameCommunityTabs
        gameSlug={gameSlug}
        promoSort={promoSort}
        promos={promos}
        lfgs={lfgBundle.posts}
        applicantsByPost={lfgBundle.applicantsByPost}
        rankClans={rankClans}
        canPostPromo={canPostPromo}
        canCreateLfg={canCreateLfg}
        userId={user.id}
        clanHubHref={clanHubHref}
      />

      <Link
        href="/games"
        className={cn(buttonVariants({ variant: "ghost" }), "mt-10 inline-flex")}
      >
        ← 게임 선택
      </Link>
    </main>
  );
}
