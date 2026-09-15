import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Search } from "lucide-react";
import { cancelClanJoinRequestFormAction } from "@/app/actions/game-clan-onboarding";
import { AccountShell, OnboardingSteps } from "@/components/onboarding/account-shell";
import { ClanCreateForm } from "@/components/onboarding/clan-create-form";
import { ClanJoinList, type ClanListRow } from "@/components/onboarding/clan-join-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/onboarding/onboarding.module.css";

const PAGE_SIZE = 5;
const CLAN_FIELDS = "id, name, description, rules, tags, max_members, style, tier_range, created_at, discord_url, kakao_url, subscription_tier" as const;
const STYLES = [{ value: "social", label: "친목" }, { value: "casual", label: "즐겜" }, { value: "tryhard", label: "빡겜" }, { value: "pro", label: "프로" }] as const;
const TIERS = [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["challenger", "챌린저"]] as const;
export const metadata = { title: "클랜 참여 · ClanSync" };

export default async function ClanOnboardingPage({ params, searchParams }: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ pending?: string; q?: string; page?: string; style?: string; tier?: string }>;
}) {
  const [{ gameSlug }, { q = "", page: pageStr, style: styleQuery = "", tier: tierQuery = "" }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Math.min(10000, parseInt(pageStr ?? "1", 10) || 1));
  const term = q.trim().slice(0, 64);
  const style = STYLES.find((option) => option.value === styleQuery)?.value ?? "";
  const tier = TIERS.find(([value]) => value === tierQuery)?.[0] ?? "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/games/${encodeURIComponent(gameSlug)}/clan`);
  const state = await loadGameOnboarding(supabase, user.id, gameSlug);
  if (!state) redirect("/games");
  if (!state.authVerified) redirect(`/games/${encodeURIComponent(gameSlug)}/auth`);
  if (state.clanStatus === "member" && state.clanId) redirect(`/games/${gameSlug}/clan/${state.clanId}`);

  const { data: game } = await supabase.from("games").select("id, name_ko").eq("slug", gameSlug).maybeSingle();
  if (!game) redirect("/games");
  const pendingBrief = state.clanStatus === "pending" ? state.pendingJoin : null;
  const from = (page - 1) * PAGE_SIZE;
  let listQuery = supabase.from("clans").select(CLAN_FIELDS, { count: "exact" }).eq("game_id", game.id).eq("lifecycle_status", "active").eq("moderation_status", "clean").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const safeTerm = term.replace(/[%_]/g, "");
  if (safeTerm) listQuery = listQuery.ilike("name", `%${safeTerm}%`);
  if (style) listQuery = listQuery.eq("style", style);
  if (tier) listQuery = listQuery.contains("tier_range", [tier]);
  const [{ data: clanRows, count, error: listError }, pinnedResult] = await Promise.all([
    listQuery,
    pendingBrief?.clanId ? supabase.from("clans").select(CLAN_FIELDS).eq("id", pendingBrief.clanId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (listError) console.error("[clan-onboarding] 목록 조회 실패:", listError.message);
  const countIds = [...new Set([...(clanRows ?? []).map((clan) => clan.id), ...(pinnedResult.data ? [pinnedResult.data.id] : [])])];
  const countResult = countIds.length ? await supabase.rpc("clan_active_member_counts", { p_clan_ids: countIds }) : { data: [], error: null };
  const counts = new Map<string, number>((countResult.data ?? []).map((item: { clan_id: string; n: number }) => [item.clan_id, Number(item.n)]));
  const clans: ClanListRow[] = (clanRows ?? []).map((clan) => ({ ...clan, active_members: counts.get(clan.id) ?? null }));
  const pinnedPendingClan: ClanListRow | null = pinnedResult.data ? { ...pinnedResult.data, active_members: counts.get(pinnedResult.data.id) ?? null } : null;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cancelBound = cancelClanJoinRequestFormAction.bind(null, gameSlug);
  function pageHref(number: number) {
    const query = new URLSearchParams({ q: term, page: String(number) });
    if (style) query.set("style", style);
    if (tier) query.set("tier", tier);
    return `/games/${gameSlug}/clan?${query}`;
  }

  return <AccountShell><main className={styles.content}>
    <OnboardingSteps current={3} />
    <header><p className={styles.gameLabel}>{game.name_ko}</p><h1 className={styles.heading}>클랜에 참여하세요<span className="sr-only"> · 가입 또는 생성</span></h1><p className={styles.description}>기존 클랜에 가입하거나, 새로운 클랜을 만들어 보세요.</p></header>
    {pendingBrief ? <section className={styles.pending} aria-label="현재 신청 중인 클랜">
      <div className={styles.pendingTop}><div><h2 className="flex items-center gap-2"><Clock3 size={16} aria-hidden="true" />진행 중인 가입 신청</h2><p>「{pendingBrief.clanName ?? "클랜"}」 운영진의 승인을 기다리고 있습니다.</p></div><form action={cancelBound}><Button type="submit" variant="outline" size="sm">신청 취소</Button></form></div>
      {pendingBrief.message ? <blockquote>{pendingBrief.message}</blockquote> : null}
    </section> : null}
    <Tabs defaultValue="join" className={styles.tabs}>
      <TabsList variant="line" className={styles.tabList}><TabsTrigger value="join">클랜 가입</TabsTrigger><TabsTrigger value="create">클랜 생성</TabsTrigger></TabsList>
      <TabsContent value="join">
        <form method="get">
          <div className={styles.searchForm}><div className={styles.searchField}><label htmlFor="q" className="sr-only">클랜 검색</label><Search size={16} aria-hidden="true" /><Input id="q" name="q" defaultValue={term} placeholder="클랜명 검색" /></div><input type="hidden" name="page" value="1" /><Button type="submit" variant="secondary">검색</Button></div>
          <div className={styles.filters}>
            <label>지향<select name="style" defaultValue={style}><option value="">전체</option>{STYLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>모집 티어<select name="tier" defaultValue={tier}><option value="">전체</option>{TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <Button type="submit" variant="outline" size="sm">필터 적용</Button>
            {term || style || tier ? <Link href={`/games/${gameSlug}/clan`} className="text-muted-foreground text-xs underline">초기화</Link> : null}
          </div>
        </form>
        {listError ? <p role="alert" className={styles.error}>클랜 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : <>
          <p className={styles.resultCount}>클랜 {total.toLocaleString("ko-KR")}개</p>
          <ClanJoinList key={pendingBrief?.requestId ?? "no-pending"} gameSlug={gameSlug} pendingClanId={pendingBrief?.clanId ?? null} blockingClanName={pendingBrief?.clanName ?? null} pinnedPendingClan={pinnedPendingClan} clans={clans} />
          {totalPages > 1 ? <nav className={styles.pagination} aria-label="클랜 목록 페이지">{page > 1 ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page - 1)}>이전</Link> : null}<span>{page} / {totalPages}</span>{page < totalPages ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page + 1)}>다음</Link> : null}</nav> : null}
        </>}
      </TabsContent>
      <TabsContent value="create"><ClanCreateForm gameSlug={gameSlug} /></TabsContent>
    </Tabs>
  </main></AccountShell>;
}
