import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelClanJoinRequestFormAction } from "@/app/actions/game-clan-onboarding";
import { ClanCreateForm } from "@/components/onboarding/clan-create-form";
import { ClanJoinList } from "@/components/onboarding/clan-join-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 5;

export default async function ClanOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ pending?: string; q?: string; page?: string }>;
}) {
  const { gameSlug } = await params;
  const { pending: pendingQs, q = "", page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/games/${gameSlug}/clan`);

  const state = await loadGameOnboarding(supabase, user.id, gameSlug);
  if (!state) redirect("/games");

  if (state.clanStatus === "member" && state.clanId) {
    redirect(`/games/${gameSlug}/clan/${state.clanId}`);
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, name_ko")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (!game) redirect("/games");

  const { data: pendingRow } = await supabase
    .from("clan_join_requests")
    .select("id, clan_id, message, clans!inner(name)")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .eq("status", "pending")
    .maybeSingle();

  const pendingClan =
    pendingRow?.clans != null
      ? (pendingRow.clans as unknown as { name: string })
      : null;

  const showPendingBanner = Boolean(pendingRow && (pendingQs === "1" || pendingRow));

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const term = q.trim();

  let listQuery = supabase
    .from("clans")
    .select("id, name, description, tags, max_members", { count: "exact" })
    .eq("game_id", game.id)
    .eq("lifecycle_status", "active")
    .eq("moderation_status", "clean")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (term) {
    const safe = term.replace(/%/g, "").slice(0, 64);
    if (safe.length > 0) {
      listQuery = listQuery.ilike("name", `%${safe}%`);
    }
  }

  const { data: clanRows, count } = await listQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cancelBound = cancelClanJoinRequestFormAction.bind(null, gameSlug);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          클랜 온보딩
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {game.name_ko} · 가입 또는 생성
        </h1>
      </header>

      {showPendingBanner && pendingRow && pendingClan ? (
        <section className="border-border mb-8 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">가입 신청 대기 중</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            「{pendingClan.name}」 클랜에 신청했습니다. 운영진 승인을 기다려 주세요.
          </p>
          {pendingRow.message ? (
            <p className="text-muted-foreground mt-2 border-l-2 pl-3 text-sm italic">
              {pendingRow.message}
            </p>
          ) : null}
          <form action={cancelBound} className="mt-4">
            <Button type="submit" variant="outline" size="sm">
              신청 취소
            </Button>
          </form>
        </section>
      ) : null}

      <Tabs defaultValue="join" className="w-full">
        <TabsList variant="line" className="mb-6 w-full max-w-md">
          <TabsTrigger value="join">클랜 가입</TabsTrigger>
          <TabsTrigger value="create">클랜 생성</TabsTrigger>
        </TabsList>

        <TabsContent value="join" className="space-y-6">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" method="get">
            <div className="flex-1 space-y-1">
              <label htmlFor="q" className="text-sm font-medium">
                검색
              </label>
              <Input
                id="q"
                name="q"
                defaultValue={term}
                placeholder="클랜명·소개"
                className="max-w-md"
              />
            </div>
            <input type="hidden" name="page" value="1" />
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>

          <ClanJoinList
            gameSlug={gameSlug}
            clans={(clanRows ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              tags: c.tags ?? [],
              max_members: c.max_members,
            }))}
          />

          {totalPages > 1 ? (
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {page > 1 ? (
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  href={`/games/${gameSlug}/clan?q=${encodeURIComponent(term)}&page=${page - 1}`}
                >
                  이전
                </Link>
              ) : null}
              <span className="text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  href={`/games/${gameSlug}/clan?q=${encodeURIComponent(term)}&page=${page + 1}`}
                >
                  다음
                </Link>
              ) : null}
            </nav>
          ) : null}

          <p className="text-muted-foreground text-xs">
            D-CLAN-01: 페이지당 {PAGE_SIZE}개. 필터·인덱스 고도화는 이후 마일스톤에서 진행합니다.
          </p>
        </TabsContent>

        <TabsContent value="create">
          <ClanCreateForm gameSlug={gameSlug} />
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
