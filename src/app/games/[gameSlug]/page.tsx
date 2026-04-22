import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/**
 * MainGame 커뮤니티 허브 (M7). M3에서는 미들웨어 D-AUTH-01(게임 인증만) 통과용 스텁.
 */
export default async function MainGameStubPage({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}) {
  const { gameSlug } = await params;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">게임 커뮤니티 (M7)</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        게임 <code className="text-xs">{gameSlug}</code> 홍보·LFG·순위 탭은 M7에서
        연결합니다. 클랜 소속이 있으면 아래에서 클랜 허브로 이동할 수 있습니다.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/games/${gameSlug}/clan`}
          className={cn(buttonVariants({ variant: "default" }), "inline-flex justify-center")}
        >
          클랜 온보딩
        </Link>
        <Link
          href="/games"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex justify-center")}
        >
          ← 게임 선택
        </Link>
      </div>
    </main>
  );
}
