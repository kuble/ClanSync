import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { Clock3, Search, SlidersHorizontal } from "lucide-react";
import { cancelClanJoinRequestFormAction } from "@/app/actions/game-clan-onboarding";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ClanCreateForm } from "@/components/onboarding/clan-create-form";
import { ClanDiscoveryFilterForm } from "@/components/onboarding/clan-discovery-filter-form";
import { ClanJoinList, type ClanListRow } from "@/components/onboarding/clan-join-list";
import { Button } from "@/components/ui/button";
import { GameLogo } from "@/components/ui/game-logo";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/onboarding/onboarding.module.css";
import discover from "@/components/onboarding/clan-discovery.module.css";
import { CLAN_STYLES, recruitmentTiers, normalizeRecruitmentTier } from "@/lib/clan/recruitment";

const PAGE_SIZE = 5;
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const CLAN_FIELDS = "id, name, icon_url, description, rules, tags, max_members, style, recruitment_positions, tier_range, birth_year_from, min_birth_year, gender_policy, created_at, discord_url, kakao_url, subscription_tier, promotions:board_posts!board_posts_clan_id_fkey(id,title,content,content_blocks,created_at,updated_at)" as const;
export const metadata = { title: "클랜 찾기 · ClanSync" };

export default async function ClanOnboardingPage({ params, searchParams }: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ pending?: string; q?: string; page?: string; style?: string; tier?: string; promotion?: string; eligible?: string; seed?: string }>;
}) {
  const [{ gameSlug }, { q = "", page: pageStr, style: styleQuery = "", tier: tierQuery = "", promotion = "", eligible, seed: seedQuery }] = await Promise.all([params, searchParams]);
  const eligibleOnly = eligible === "1";
  const seed = seedQuery && UUID.test(seedQuery) ? seedQuery : randomUUID();
  if (promotion && !UUID.test(promotion)) notFound();
  const nextPath = `/games/${gameSlug}/clan${promotion ? `?promotion=${promotion}` : ""}`;
  const TIERS = recruitmentTiers(gameSlug);
  const page = Math.max(1, Math.min(10000, parseInt(pageStr ?? "1", 10) || 1));
  const term = q.trim().slice(0, 64);
  const style = CLAN_STYLES.find((option) => option.value === styleQuery)?.value ?? "";
  const tier = TIERS.find(([value]) => value === normalizeRecruitmentTier(gameSlug,tierQuery))?.[0] ?? "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  const state = await loadGameOnboarding(supabase, user.id, gameSlug);
  if (!state) redirect("/games");
  if (!state.identityRegistered) redirect(`/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextPath)}`);
  if (state.clanStatus === "member" && state.clanId && !promotion) redirect(`/games/${gameSlug}/clan/${state.clanId}`);

  const { data: game } = await supabase.from("games").select("id, name_ko").eq("slug", gameSlug).maybeSingle();
  if (!game) redirect("/games");
  const pendingBrief = state.clanStatus === "pending" ? state.pendingJoin : null;
  const from = (page - 1) * PAGE_SIZE;
  const clanQuery = () => supabase.from("clans").select(CLAN_FIELDS).eq("game_id", game.id).eq("lifecycle_status", "active").eq("moderation_status", "clean")
    .eq("promotions.post_type","promotion").eq("promotions.game_id",game.id)
    .order("created_at",{referencedTable:"promotions",ascending:false}).order("id",{referencedTable:"promotions",ascending:false}).limit(1,{referencedTable:"promotions"});
  const [listing, pinnedResult, requestedPromotion] = await Promise.all([
    supabase.rpc("discover_clans", {
      p_game_id: game.id, p_seed: seed, p_recommended: eligibleOnly, p_query: term, p_style: style, p_tier: tier,
    }, { count: "exact" }).order("shuffle_key").order("clan_id").range(from, from + PAGE_SIZE - 1),
    pendingBrief?.clanId ? clanQuery().eq("id", pendingBrief.clanId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    promotion ? supabase.from("board_posts").select("id,clan_id,title,content,content_blocks,created_at,updated_at").eq("id",promotion).eq("game_id",game.id).eq("post_type","promotion").maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  if (requestedPromotion.error) throw new Error("홍보글을 불러오지 못했습니다.");
  let previewRow = null;
  if (promotion) {
    if (!requestedPromotion.data) notFound();
    const result = await clanQuery().eq("promotion_public",true).eq("id",requestedPromotion.data.clan_id).maybeSingle();
    if (result.error) throw new Error("클랜 정보를 불러오지 못했습니다.");
    if (!result.data) notFound();
    previewRow = result.data;
  }
  const ids: string[] = (listing.data ?? []).map((row: { clan_id: string }) => row.clan_id);
  const countIds = [...new Set([...ids, ...(pinnedResult.data ? [pinnedResult.data.id] : []), ...(previewRow ? [previewRow.id] : [])])];
  const [rows, countResult] = await Promise.all([
    ids.length ? clanQuery().eq("promotion_public",true).in("id",ids) : {data: [], error: null},
    countIds.length ? supabase.rpc("clan_active_member_counts", { p_clan_ids: countIds }) : { data: [], error: null },
  ]);
  const listError = listing.error ?? rows.error;
  if (listError) console.error("[clan-onboarding] 목록 조회 실패:", listError.message);
  const counts = new Map<string, number>((countResult.data ?? []).map((item: { clan_id: string; n: number }) => [item.clan_id, Number(item.n)]));
  function toListClan(clan: NonNullable<typeof rows.data>[number]): ClanListRow {
    const {promotions,...row} = clan;
    return {...row,promotion:promotions[0] ?? null,active_members:countResult.error ? null : counts.get(row.id) ?? 0};
  }
  const initialDetails: ClanListRow | null = previewRow ? {...toListClan(previewRow),promotion:requestedPromotion.data} : null;
  const clans = (rows.data ?? []).map(toListClan).sort((a,b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  if (initialDetails && !eligibleOnly && !clans.some(clan=>clan.id===initialDetails.id)) clans.unshift(initialDetails);
  const pinnedPendingClan = pinnedResult.data ? toListClan(pinnedResult.data) : null;
  const total = listing.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cancelBound = cancelClanJoinRequestFormAction.bind(null, gameSlug);
  function pageHref(number: number) {
    const query = new URLSearchParams({ q: term, page: String(number), seed });
    if (style) query.set("style", style);
    if (tier) query.set("tier", tier);
    if (eligibleOnly) query.set("eligible", "1");
    return `/games/${gameSlug}/clan?${query}`;
  }

  return <AccountShell><main className={discover.content} data-clan-discovery>
    <header className={discover.intro}>
      <span className={discover.gameMark} aria-hidden><GameLogo slug={gameSlug} name={game.name_ko} className="size-7" /></span>
      <div><p>{game.name_ko}</p><h1>클랜 찾기</h1></div>
    </header>
    {pendingBrief ? <section className={styles.pending} aria-label="현재 신청 중인 클랜">
      <div className={styles.pendingTop}><div><h2 className="flex items-center gap-2"><Clock3 size={16} aria-hidden="true" />진행 중인 가입 신청</h2><p>「{pendingBrief.clanName ?? "클랜"}」 운영진의 승인을 기다리고 있습니다.</p></div><form action={cancelBound}><Button type="submit" variant="outline" size="sm">신청 취소</Button></form></div>
      {pendingBrief.message ? <blockquote>{pendingBrief.message}</blockquote> : null}
    </section> : null}
    <Tabs defaultValue="join" className={`${styles.tabs} ${discover.tabs}`}>
      <TabsList variant="line" className={discover.tabList}><TabsTrigger value="join">클랜 가입</TabsTrigger><TabsTrigger value="create">클랜 생성</TabsTrigger></TabsList>
      <TabsContent value="join">
        <div className={discover.directory}>
          <ClanDiscoveryFilterForm action={`/games/${gameSlug}/clan`}>
            <h2 className={discover.filterTitle}><SlidersHorizontal size={15} aria-hidden />검색 조건</h2>
            <div className={discover.search}><label htmlFor="q" className="sr-only">클랜 검색</label><Search size={17} aria-hidden="true" /><Input key={term} id="q" name="q" defaultValue={term} placeholder="클랜 이름으로 검색" /></div><input type="hidden" name="page" value="1" />
            <label>지향<select key={style} name="style" defaultValue={style}><option value="">전체</option>{CLAN_STYLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>모집 티어<select key={tier} name="tier" defaultValue={tier}><option value="">전체</option>{TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className={discover.eligibilityFilter}><Tooltip>
              <label><TooltipTrigger key={String(eligibleOnly)} render={<input type="checkbox" name="eligible" value="1" defaultChecked={eligibleOnly} aria-describedby="recommendation-hint" />} /><span className={discover.filterSwitch} aria-hidden /><span>추천 클랜</span></label>
              <TooltipContent role="tooltip">내 성별과 출생연도가 모집 조건에 맞는 클랜을 표시합니다.</TooltipContent>
            </Tooltip><span id="recommendation-hint" className="sr-only">내 성별과 출생연도가 모집 조건에 맞는 클랜을 표시합니다.</span></div>
            <div className={discover.filterActions}><Button type="submit">검색</Button>
              {term || style || tier || eligibleOnly ? <Link href={`/games/${gameSlug}/clan`} className="text-muted-foreground text-xs underline">초기화</Link> : null}
            </div>
          </ClanDiscoveryFilterForm>
          <section className={discover.results} aria-label="클랜 검색 결과">
            {listError ? <p role="alert" className={styles.error}>클랜 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.</p> : <>
              <div className={discover.resultCount}><p>함께할 클랜 <strong>{total.toLocaleString("ko-KR")}</strong></p><span>무작위 순서</span></div>
              <ClanJoinList key={`${pendingBrief?.requestId ?? "no-pending"}:${promotion}`} gameSlug={gameSlug} pendingClanId={pendingBrief?.clanId ?? null} blockingClanName={pendingBrief?.clanName ?? null} pinnedPendingClan={pinnedPendingClan} clans={clans} initialDetails={initialDetails} canApply={state.clanStatus !== "member"} />
              {totalPages > 1 ? <nav className={styles.pagination} aria-label="클랜 목록 페이지">{page > 1 ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page - 1)}>이전</Link> : null}<span>{page} / {totalPages}</span>{page < totalPages ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page + 1)}>다음</Link> : null}</nav> : null}
            </>}
          </section>
        </div>
      </TabsContent>
      <TabsContent value="create">{state.clanStatus === "member" ? <p className={styles.empty}>이미 이 게임의 클랜에 소속되어 있습니다.</p> : <ClanCreateForm gameSlug={gameSlug} />}</TabsContent>
    </Tabs>
  </main></AccountShell>;
}
