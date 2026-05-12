import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadBoardPostDetail } from "@/lib/main-game/load-main-game-hub";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 게시판 글 상세 (M7 · `board_posts`).
 * 진입 조건은 MainGame 허브와 동일: 로그인 + 해당 게임 인증 (`middleware`).
 */
export default async function BoardPostDetailPage({
  params,
}: {
  params: Promise<{ gameSlug: string; postId: string }>;
}) {
  const { gameSlug, postId } = await params;

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

  if (!game?.id) notFound();

  const row = await loadBoardPostDetail(supabase, game.id, postId);
  if (!row) notFound();

  const base = `/games/${encodeURIComponent(gameSlug)}`;

  const typeLabel =
    row.post_type === "scrim" ? "스크림" : "홍보";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="text-muted-foreground mb-6 text-xs">
        <Link
          href={`${base}?tab=promo`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto px-0 py-0")}
        >
          ← {game.name_ko} · 홍보 탭으로
        </Link>
      </nav>

      <article
        className="bg-card rounded-xl border p-5 shadow-sm"
        data-board-post-detail={gameSlug}
        data-board-post-id={row.id}
      >
        <header className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-[11px] font-medium uppercase">
              게시판 · {typeLabel}
            </span>
            {row.is_pinned ?
              <span className="bg-primary/15 text-primary rounded px-2 py-0.5 text-[11px] font-medium">
                상단 고정
              </span>
            : null}
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">{row.title}</h1>
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>작성: {row.author_nickname}</span>
            <span>
              게시 시각{" "}
              {new Date(row.created_at).toLocaleString("ko-KR")}
            </span>
            <Link
              href={`${base}/clan/${row.clan_id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              「{row.clan_name}」 클랜
            </Link>
          </div>
        </header>
        <div className="mt-5 max-w-none">
          <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed md:text-[15px]">
            {row.content || "(내용 없음)"}
          </p>
        </div>
      </article>

      {!game.is_active ?
        <p className="text-muted-foreground mt-8 text-xs">
          이 게임은 현재 비활성 상태입니다.
        </p>
      : null}
    </main>
  );
}
