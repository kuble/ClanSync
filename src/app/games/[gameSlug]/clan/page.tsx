import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock3, Search } from "lucide-react";
import { cancelClanJoinRequestFormAction } from "@/app/actions/game-clan-onboarding";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ClanCreateForm } from "@/components/onboarding/clan-create-form";
import { ClanDiscoveryFilterForm } from "@/components/onboarding/clan-discovery-filter-form";
import { ClanJoinList, type ClanListRow } from "@/components/onboarding/clan-join-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/onboarding/onboarding.module.css";
import discover from "@/components/onboarding/clan-discovery.module.css";
import { recruitmentProfileError, recruitmentTiers, normalizeRecruitmentTier } from "@/lib/clan/recruitment";

const PAGE_SIZE = 5;
const CLAN_FIELDS = "id, name, description, rules, tags, max_members, style, tier_range, birth_year_from, min_birth_year, gender_policy, created_at, discord_url, kakao_url, subscription_tier, promotions:board_posts!board_posts_clan_id_fkey(id,title,content,content_blocks,created_at,updated_at)" as const;
const STYLES = [{ value: "social", label: "친목" }, { value: "casual", label: "즐겜" }, { value: "tryhard", label: "빡겜" }, { value: "pro", label: "프로" }] as const;
export const metadata = { title: "클랜 찾기 · ClanSync" };

export default async function ClanOnboardingPage({ params, searchParams }: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ pending?: string; q?: string; page?: string; style?: string; tier?: string; promotion?: string; eligible?: string }>;
}) {
  const [{ gameSlug }, { q = "", page: pageStr, style: styleQuery = "", tier: tierQuery = "", promotion = "", eligible }] = await Promise.all([params, searchParams]);
  const eligibleOnly = eligible === "1";
  if (promotion && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(promotion)) notFound();
  const nextPath = `/games/${gameSlug}/clan${promotion ? `?promotion=${promotion}` : ""}`;
  const TIERS = recruitmentTiers(gameSlug);
  const page = Math.max(1, Math.min(10000, parseInt(pageStr ?? "1", 10) || 1));
  const term = q.trim().slice(0, 64);
  const style = STYLES.find((option) => option.value === styleQuery)?.value ?? "";
  const tier = TIERS.find(([value]) => value === normalizeRecruitmentTier(gameSlug,tierQuery))?.[0] ?? "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  const state = await loadGameOnboarding(supabase, user.id, gameSlug);
  if (!state) redirect("/games");
  if (!state.identityRegistered) redirect(`/games/${encodeURIComponent(gameSlug)}/auth?next=${encodeURIComponent(nextPath)}`);
  if (state.clanStatus === "member" && state.clanId && !promotion) redirect(`/games/${gameSlug}/clan/${state.clanId}`);

  const [{ data: game }, profile] = await Promise.all([
    supabase.from("games").select("id, name_ko").eq("slug", gameSlug).maybeSingle(),
    supabase.from("users").select("birth_year,gender").eq("id",user.id).single(),
  ]);
  if (!game) redirect("/games");
  const pendingBrief = state.clanStatus === "pending" ? state.pendingJoin : null;
  const from = (page - 1) * PAGE_SIZE;
  const clanQuery = () => supabase.from("clans").select(CLAN_FIELDS, { count: "exact" }).eq("game_id", game.id).eq("lifecycle_status", "active").eq("moderation_status", "clean")
    .eq("promotions.post_type","promotion").eq("promotions.game_id",game.id)
    .order("created_at",{referencedTable:"promotions",ascending:false}).order("id",{referencedTable:"promotions",ascending:false}).limit(1,{referencedTable:"promotions"});
  let listQuery = clanQuery().order("created_at", { ascending: false }).order("id", {ascending: false});
  const safeTerm = term.replace(/[%_]/g, "");
  if (safeTerm) listQuery = listQuery.ilike("name", `%${safeTerm}%`);
  if (style) listQuery = listQuery.eq("style", style);
  if (tier) listQuery = listQuery.contains("tier_range", [tier]);
  // Filter before counting/pagination; use the authenticated account, never URL demographics.
  if (eligibleOnly) {
    if (!profile.data || !Number.isInteger(profile.data.birth_year)) listQuery = listQuery.in("id", []);
    else {
      const year = profile.data.birth_year;
      listQuery = listQuery.or(`birth_year_from.is.null,birth_year_from.lte.${year}`)
        .or(`min_birth_year.is.null,min_birth_year.gte.${year}`)
        .in("gender_policy", profile.data.gender === "male" || profile.data.gender === "female" ? ["all", profile.data.gender] : ["all"]);
    }
  }
  const [{ data: clanRows, count, error: listError }, pinnedResult, requestedPromotion] = await Promise.all([
    listQuery.range(from, from + PAGE_SIZE - 1),
    pendingBrief?.clanId ? clanQuery().eq("id", pendingBrief.clanId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    promotion ? supabase.from("board_posts").select("id,clan_id,title,content,content_blocks,created_at,updated_at").eq("id",promotion).eq("game_id",game.id).eq("post_type","promotion").maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  if (requestedPromotion.error) throw new Error("홍보글을 불러오지 못했습니다.");
  let previewRow = null;
  if (promotion) {
    if (!requestedPromotion.data) notFound();
    const result = await clanQuery().eq("id",requestedPromotion.data.clan_id).maybeSingle();
    if (result.error) throw new Error("클랜 정보를 불러오지 못했습니다.");
    if (!result.data) notFound();
    previewRow = result.data;
  }
  if (listError) console.error("[clan-onboarding] 목록 조회 실패:", listError.message);
  const countIds = [...new Set([...(clanRows ?? []).map((clan) => clan.id), ...(pinnedResult.data ? [pinnedResult.data.id] : []), ...(previewRow ? [previewRow.id] : [])])];
  const countResult = countIds.length ? await supabase.rpc("clan_active_member_counts", { p_clan_ids: countIds }) : { data: [], error: null };
  const counts = new Map<string, number>((countResult.data ?? []).map((item: { clan_id: string; n: number }) => [item.clan_id, Number(item.n)]));
  function toListClan(clan: NonNullable<typeof clanRows>[number]): ClanListRow {
    const {promotions,...row} = clan;
    return {...row,promotion:promotions[0] ?? null,active_members:counts.get(row.id) ?? null,eligibilityError:recruitmentProfileError(row,profile.data)};
  }
  const initialDetails: ClanListRow | null = previewRow ? {...toListClan(previewRow),promotion:requestedPromotion.data} : null;
  const clans = (clanRows ?? []).map(toListClan);
  if (initialDetails && !eligibleOnly && !clans.some(clan=>clan.id===initialDetails.id)) clans.unshift(initialDetails);
  const pinnedPendingClan = pinnedResult.data ? toListClan(pinnedResult.data) : null;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cancelBound = cancelClanJoinRequestFormAction.bind(null, gameSlug);
  function pageHref(number: number) {
    const query = new URLSearchParams({ q: term, page: String(number) });
    if (style) query.set("style", style);
    if (tier) query.set("tier", tier);
    if (eligibleOnly) query.set("eligible", "1");
    return `/games/${gameSlug}/clan?${query}`;
  }

  return <AccountShell><main className={discover.content} data-clan-discovery>
    <header className={discover.intro}><p>{game.name_ko} · 클랜 찾기</p><h1>함께할 클랜을 <span>찾아보세요.</span></h1><div>우리와 맞는 분위기, 함께하고 싶은 활동.<br className="sm:hidden" /> 클랜의 이야기를 먼저 만나보세요.</div></header>
    {pendingBrief ? <section className={styles.pending} aria-label="현재 신청 중인 클랜">
      <div className={styles.pendingTop}><div><h2 className="flex items-center gap-2"><Clock3 size={16} aria-hidden="true" />진행 중인 가입 신청</h2><p>「{pendingBrief.clanName ?? "클랜"}」 운영진의 승인을 기다리고 있습니다.</p></div><form action={cancelBound}><Button type="submit" variant="outline" size="sm">신청 취소</Button></form></div>
      {pendingBrief.message ? <blockquote>{pendingBrief.message}</blockquote> : null}
    </section> : null}
    <Tabs defaultValue="join" className={`${styles.tabs} ${discover.tabs}`}>
      <TabsList variant="line" className={styles.tabList}><TabsTrigger value="join">클랜 가입</TabsTrigger><TabsTrigger value="create">클랜 생성</TabsTrigger></TabsList>
      <TabsContent value="join">
        <ClanDiscoveryFilterForm action={`/games/${gameSlug}/clan`}>
          <div className={discover.search}><label htmlFor="q" className="sr-only">클랜 검색</label><Search size={17} aria-hidden="true" /><Input key={term} id="q" name="q" defaultValue={term} placeholder="클랜 이름으로 검색" /></div><input type="hidden" name="page" value="1" />
            <label>지향<select key={style} name="style" defaultValue={style}><option value="">전체</option>{STYLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>모집 티어<select key={tier} name="tier" defaultValue={tier}><option value="">전체</option>{TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <Button type="submit">검색</Button>
            {term || style || tier || eligibleOnly ? <Link href={`/games/${gameSlug}/clan`} className="text-muted-foreground text-xs underline">초기화</Link> : null}
            <div className={discover.eligibilityFilter}><label><input key={String(eligibleOnly)} type="checkbox" name="eligible" value="1" defaultChecked={eligibleOnly} /><span className={discover.filterSwitch} aria-hidden /><span>가입 가능한 클랜만 보기</span></label><p>내 출생연도·성별 기준</p></div>
        </ClanDiscoveryFilterForm>
        {eligibleOnly && (profile.error || !profile.data) ? <p role="alert" className={styles.error}>가입 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주십시오.</p> : listError ? <p role="alert" className={styles.error}>클랜 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.</p> : <>
          <div className={discover.resultCount}><p>함께할 클랜 <strong>{total.toLocaleString("ko-KR")}</strong></p><span>최근 만들어진 클랜 순</span></div>
          <ClanJoinList key={`${pendingBrief?.requestId ?? "no-pending"}:${promotion}`} gameSlug={gameSlug} pendingClanId={pendingBrief?.clanId ?? null} blockingClanName={pendingBrief?.clanName ?? null} pinnedPendingClan={pinnedPendingClan} clans={clans} initialDetails={initialDetails} canApply={state.clanStatus !== "member"} />
          {totalPages > 1 ? <nav className={styles.pagination} aria-label="클랜 목록 페이지">{page > 1 ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page - 1)}>이전</Link> : null}<span>{page} / {totalPages}</span>{page < totalPages ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={pageHref(page + 1)}>다음</Link> : null}</nav> : null}
        </>}
      </TabsContent>
      <TabsContent value="create">{state.clanStatus === "member" ? <p className={styles.empty}>이미 이 게임의 클랜에 소속되어 있습니다.</p> : <ClanCreateForm gameSlug={gameSlug} />}</TabsContent>
    </Tabs>
  </main></AccountShell>;
}
