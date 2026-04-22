import Link from "next/link";
import { redirect } from "next/navigation";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * MainGame 커뮤니티 허브 (M7 경량). 홍보·LFG·순위 본문은 후속.
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
    .select("name_ko, slug, is_active")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (!game) redirect("/games");

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

      <Tabs defaultValue="home" className="w-full">
        <TabsList variant="line" className="mb-6 w-full flex-wrap gap-1">
          <TabsTrigger value="home">홈</TabsTrigger>
          <TabsTrigger value="promo">홍보</TabsTrigger>
          <TabsTrigger value="lfg">LFG</TabsTrigger>
          <TabsTrigger value="rank">순위</TabsTrigger>
          <TabsTrigger value="scrim">스크림</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="text-muted-foreground space-y-3 text-sm">
          <p>
            {game.name_ko} 커뮤니티 허브입니다. 클랜 일정·통계·스토어는{" "}
            <Link href={clanSummary.href} className="text-primary underline-offset-4 hover:underline">
              클랜 화면
            </Link>
            에서 이용할 수 있습니다.
          </p>
          <p>
            홍보·모집·순위 보드는 M7 후속 슬라이스에서 실데이터로 연결합니다.
          </p>
        </TabsContent>

        <TabsContent value="promo" className="text-muted-foreground space-y-2 text-sm">
          <p>
            클랜 홍보 노출(D-RANK-01) — 랭킹·배너 연동 전입니다.
          </p>
        </TabsContent>

        <TabsContent value="lfg" className="text-muted-foreground space-y-2 text-sm">
          <p>
            루키 모집·파티 찾기(D-LFG-01) — 상태머신·신청 흐름은 후속
            마일스톤에서 구현합니다.
          </p>
        </TabsContent>

        <TabsContent value="rank" className="text-muted-foreground space-y-2 text-sm">
          <p>
            서버/클랜 순위 보드 — API·캐시 전략 확정 후 연결합니다.
          </p>
        </TabsContent>

        <TabsContent value="scrim" className="text-muted-foreground space-y-2 text-sm">
          <p>
            스크림 채팅·양측 확정(D-SCRIM-01/02)은 Phase 2+ 범위입니다. 이
            탭은 안내용입니다.
          </p>
        </TabsContent>
      </Tabs>

      <Link
        href="/games"
        className={cn(buttonVariants({ variant: "ghost" }), "mt-10 inline-flex")}
      >
        ← 게임 선택
      </Link>
    </main>
  );
}
