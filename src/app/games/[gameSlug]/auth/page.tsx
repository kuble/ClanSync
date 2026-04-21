import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function GameAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ reauth?: string }>;
}) {
  const { gameSlug } = await params;
  const { reauth } = await searchParams;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        게임 계정 연동 (M3)
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        슬러그: <code className="text-xs">{gameSlug}</code>
        {reauth ? (
          <span className="ml-2 rounded bg-amber-500/15 px-2 py-0.5 text-amber-200">
            재연동 모드
          </span>
        ) : null}
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        OAuth·Battle.net 등 실연동은 M3 S02에서 구현합니다.
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
