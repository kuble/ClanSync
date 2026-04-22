import Link from "next/link";
import { GameAuthConnect } from "@/components/onboarding/game-auth-connect";
import { buttonVariants } from "@/components/ui/button-variants";
import { getGameAuthConfig } from "@/lib/game-auth/game-auth-config";
import { cn } from "@/lib/utils";

export default async function GameAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ reauth?: string; next?: string }>;
}) {
  const { gameSlug } = await params;
  const { reauth, next } = await searchParams;
  const cfg = getGameAuthConfig(gameSlug);

  const devSimulator =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_GAME_LINK_SIMULATOR === "1";

  if (!cfg) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">지원하지 않는 게임</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          슬러그 <code className="text-xs">{gameSlug}</code> 는 카탈로그에 없습니다.
        </p>
        <Link
          href="/games"
          className={cn(buttonVariants({ variant: "outline" }), "mt-8 inline-flex")}
        >
          ← 게임 선택
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        게임 계정 연동
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{cfg.title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{cfg.hint}</p>
      {reauth ? (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          계정 재연동이 필요합니다. 연동을 다시 완료해 주세요.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <GameAuthConnect
          gameSlug={gameSlug}
          ctaLabel={cfg.ctaLabel}
          oauthReady={cfg.oauthReady}
          devSimulatorAvailable={devSimulator}
        />
        {!cfg.oauthReady ? (
          <p className="text-muted-foreground text-xs">이 게임은 아직 연동할 수 없습니다.</p>
        ) : null}
        {cfg.oauthReady && !devSimulator ? (
          <p className="text-muted-foreground text-xs">
            프로덕션에서는 Battle.net / Riot OAuth 콜백을 연결합니다. 로컬에서는{" "}
            <code className="text-[0.7rem]">DEV_GAME_LINK_SIMULATOR=1</code> 로 시뮬레이션할 수
            있습니다.
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-10 text-xs leading-relaxed">
        D-AUTH-05: ClanSync 로그인용 Discord는 <strong>identify·email</strong> 스코프만 사용합니다.
        클랜 알림용 봇 연동은 별도 동의입니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={next && next.startsWith("/") ? next : "/games"}
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
        >
          ← 돌아가기
        </Link>
        <Link href="/games" className={cn(buttonVariants({ variant: "ghost" }), "inline-flex")}>
          게임 선택
        </Link>
      </div>
    </main>
  );
}
