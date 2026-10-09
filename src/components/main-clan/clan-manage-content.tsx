import "server-only";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, ImageIcon, Users } from "lucide-react";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import { MANAGE_SECTIONS, type ManageTab } from "@/lib/clan/manage-sections";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { clanHasActivePurchaseForItemSlug } from "@/lib/store/store-purchase-queries";
import { loadClanSiteVisits } from "@/lib/clan/stats/clan-site-usage";
import { loadClanManagementStats } from "@/lib/clan/stats/load-clan-stats";
import { ClanManageNotices, ClanManageRules } from "./clan-manage-notices";
import { ClanBannerSettingsForm } from "./clan-banner-settings-form";
import { ClanBalanceAutoCloseSettings } from "./clan-balance-auto-close-settings";
import { ClanAuctionItemSettings } from "./clan-auction-item-settings";
import { ManageJoinRequestsPanel } from "./manage-join-requests-panel";
import { ManageMembersTable, type ManageMemberRow } from "./manage-members-table";
import { ClanManageSubscriptionPanel } from "./clan-manage-subscription-panel";
import { ClanManageStoreVoidPanel, type ManageStoreVoidRowVM } from "./clan-manage-store-void-panel";
import { ClanFormationStats } from "./clan-formation-stats";
import { ClanOperationalStats } from "./clan-operational-stats";
import { ClanSiteUsagePanel } from "./clan-site-usage-panel";

const panel = "rounded-xl border border-border bg-card p-4 sm:p-5";
type Props = { ctx: MainClanContext; selected: ManageTab };

/** The parent page verifies officer+ before any service-role read is started. */
export async function ClanManageContent({ ctx, selected }: Props) {
  switch (selected) {
    case "overview": return <Overview ctx={ctx} />;
    case "notices": return <Notices ctx={ctx} />;
    case "appearance": return <Appearance ctx={ctx} />;
    case "requests": return <Requests ctx={ctx} />;
    case "members": return <Members ctx={ctx} />;
    case "balance": return <BalanceSettings ctx={ctx} />;
    case "insights": return <Insights ctx={ctx} />;
    case "subscription": return <Subscription ctx={ctx} />;
  }
}

async function Overview({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const { data: profile, error } = await svc.from("clans")
    .select("description,tags,discord_url,kakao_url,coin_balance,max_members")
    .eq("id", ctx.clanId).single();
  if (error) throw new Error("클랜 정보를 불러오지 못했습니다.");
  const links = [{ label: "디스코드", url: profile.discord_url }, { label: "오픈카카오톡", url: profile.kakao_url }].filter(({ url }) => {
    try { return !!url && new URL(url).protocol === "https:"; } catch { return false; }
  });
  const base = `/games/${ctx.gameSlug}/clan/${ctx.clanId}`;
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[{ label: "구성원", value: ctx.memberCount == null ? "—" : `${ctx.memberCount}명`, detail: `정원 ${profile.max_members}명`, tab: "members" }, { label: "가입 대기", value: `${ctx.pendingJoinRequestCount}건`, detail: "승인·거절", tab: "requests" }, { label: "클랜 코인", value: Number(profile.coin_balance).toLocaleString(), detail: "잔액·플랜", tab: "subscription" }].map(({ label, value, detail, tab }) => (
        <Link key={label} href={`${base}/manage?tab=${tab}`} prefetch={false} className={`${panel} min-w-0 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p><p className="mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
        </Link>
      ))}
    </div>
    {ctx.pendingJoinRequestCount > 0 && <Link href={`${base}/manage?tab=requests`} prefetch={false} className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm"><span>가입 요청 <strong>{ctx.pendingJoinRequestCount}건</strong>이 기다리고 있습니다.</span><ArrowUpRight className="size-4 shrink-0 text-primary" aria-hidden /></Link>}
    <section className={panel} aria-label="클랜 기본 정보">
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="size-5" aria-hidden /></span><div><h4 className="text-sm font-bold">{ctx.clanName}</h4><p className="mt-1 text-xs text-muted-foreground">{ctx.gameName}{ctx.styleLabel ? ` · ${ctx.styleLabel}` : ""}</p></div></div>
      <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80">{profile.description || "클랜 소개가 아직 없습니다."}</p>
      {!!profile.tags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{(profile.tags as string[]).map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{tag}</span>)}</div>}
      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4">{links.length ? links.map(({ label, url }) => <a key={label} href={url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">{label}<ExternalLink className="size-3" aria-hidden /></a>) : <p className="text-xs text-muted-foreground">등록된 외부 채널이 없습니다.</p>}</div>
    </section>
    <section className="space-y-3" aria-label="운영 바로가기">
      <h4 className="text-sm font-semibold">자주 사용하는 관리</h4>
      <div className="grid gap-3 sm:grid-cols-2">{MANAGE_SECTIONS.filter(({ key }) => ["notices", "balance", "appearance", "insights"].includes(key)).map(({ key, label, description }) => <Link key={key} href={`${base}/manage?tab=${key}`} prefetch={false} className={`${panel} group transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}><div className="flex items-center justify-between"><h5 className="text-[13px] font-semibold">{label}</h5><ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" aria-hidden /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p></Link>)}</div>
    </section>
  </div>;
}

async function Notices({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const client = await getRequestClient();
  const [profile, notices] = await Promise.all([
    svc.from("clans").select("rules").eq("id", ctx.clanId).maybeSingle(),
    client.from("clan_notices").select("id,title,content,is_pinned,created_at,created_by").eq("clan_id", ctx.clanId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100),
  ]);
  const authorIds = [...new Set((notices.data ?? []).flatMap((notice) => notice.created_by ? [notice.created_by] : []))];
  const authors = authorIds.length ? await svc.from("users").select("id,nickname").in("id", authorIds) : { data: [] };
  const names = new Map((authors.data ?? []).map((row) => [row.id, row.nickname]));
  return <div className="space-y-4">
    <ClanManageNotices gameSlug={ctx.gameSlug} clanId={ctx.clanId} loadFailed={!!notices.error} notices={(notices.data ?? []).map((notice) => ({ id: notice.id, title: notice.title, content: notice.content, isPinned: notice.is_pinned, createdAt: notice.created_at, author: names.get(notice.created_by ?? "") ?? "운영진" }))} />
    <ClanManageRules gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialRules={profile.data?.rules ?? null} loadFailed={!!profile.error || !profile.data} />
  </div>;
}

async function Appearance({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [hasSlot, canManage, profile] = await Promise.all([
    clanHasActivePurchaseForItemSlug(svc, ctx.clanId, "clan_banner_slot"),
    hasRequestClanPermission(ctx.clanId, "manage_clan_pool"),
    svc.from("clans").select("banner_url").eq("id", ctx.clanId).single(),
  ]);
  if (profile.error) throw new Error("클랜 배너를 불러오지 못했습니다.");
  return hasSlot && canManage ? <ClanBannerSettingsForm gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialBannerUrl={profile.data.banner_url} /> : <section className={`${panel} space-y-3`}><div className="flex items-center gap-2"><ImageIcon className="size-4 text-muted-foreground" aria-hidden /><h4 className="text-sm font-semibold">클랜 배너</h4></div><p className="text-xs leading-relaxed text-muted-foreground">{hasSlot ? "배너를 변경하려면 클랜 꾸미기 관리 권한이 필요합니다." : "클랜 스토어에서 배너 슬롯을 구매하면 배너를 등록할 수 있습니다."}</p><Link href={`/games/${ctx.gameSlug}/clan/${ctx.clanId}/store`} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">클랜 스토어</Link></section>;
}

async function Requests({ ctx }: Pick<Props, "ctx">) {
  if (!await hasRequestClanPermission(ctx.clanId, "approve_join_requests")) return <p className="text-sm text-muted-foreground">가입 승인 권한이 필요합니다.</p>;
  const svc = createServiceRoleClient();
  const requests = await svc.from("clan_join_requests").select("id,user_id,message,applied_at").eq("clan_id", ctx.clanId).eq("status", "pending").order("applied_at");
  if (requests.error) throw new Error("가입 요청을 불러오지 못했습니다.");
  const ids = [...new Set(requests.data.map((row) => row.user_id))];
  const profiles = ids.length ? await svc.from("users").select("id,nickname,email").in("id", ids) : { data: [] };
  const byId = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  return <section className={panel}><p className="mb-4 text-xs text-muted-foreground">{requests.data.length}건 대기</p><ManageJoinRequestsPanel gameSlug={ctx.gameSlug} clanId={ctx.clanId} rows={requests.data.map((row) => ({ id: row.id, message: row.message ?? "", appliedAt: row.applied_at, nickname: byId.get(row.user_id)?.nickname ?? "—", email: byId.get(row.user_id)?.email ?? "" }))} /></section>;
}

async function Members({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [members, kickMember, kickOfficer] = await Promise.all([
    svc.from("clan_members").select("user_id,role,joined_at,last_activity_at").eq("clan_id", ctx.clanId).eq("status", "active").order("role").order("joined_at"),
    hasRequestClanPermission(ctx.clanId, "kick_member"), hasRequestClanPermission(ctx.clanId, "kick_officer"),
  ]);
  if (members.error) throw new Error("구성원을 불러오지 못했습니다.");
  const ids = members.data.map((row) => row.user_id);
  const profiles = ids.length ? await svc.from("users").select("id,nickname,email").in("id", ids) : { data: [] };
  const byId = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const rows: ManageMemberRow[] = members.data.map((row) => ({ userId: row.user_id, nickname: byId.get(row.user_id)?.nickname ?? "—", email: byId.get(row.user_id)?.email ?? "", role: row.role, joinedLabel: new Date(row.joined_at).toLocaleDateString("ko-KR"), lastActivityAt: row.last_activity_at ?? row.joined_at, actions: { canKick: row.role === "leader" ? false : row.role === "officer" ? kickOfficer : kickMember, canPromote: row.role === "member" && ctx.role === "leader", canDemote: row.role === "officer" && ctx.role === "leader" } }));
  return <section className={panel}><p className="mb-4 text-xs text-muted-foreground">활동 멤버 {rows.length}명</p><ManageMembersTable gameSlug={ctx.gameSlug} clanId={ctx.clanId} rows={rows} /></section>;
}

async function BalanceSettings({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const client = await getRequestClient();
  const [profile, items] = await Promise.all([
    svc.from("clans").select("balance_auto_close_enabled,balance_auto_close_hours").eq("id", ctx.clanId).single(),
    client.from("clan_auction_items").select("id,name,description,cost,enabled").eq("clan_id", ctx.clanId).order("created_at"),
  ]);
  if (profile.error) throw new Error("내전 설정을 불러오지 못했습니다.");
  return <div className="space-y-4"><ClanBalanceAutoCloseSettings gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialEnabled={profile.data.balance_auto_close_enabled} initialHours={profile.data.balance_auto_close_hours} /><ClanAuctionItemSettings gameSlug={ctx.gameSlug} clanId={ctx.clanId} items={items.data ?? []} loadError={!!items.error} /></div>;
}

async function Insights({ ctx }: Pick<Props, "ctx">) {
  const client = await getRequestClient();
  const [stats, visits] = await Promise.all([loadClanManagementStats(client, ctx.clanId), loadClanSiteVisits(createServiceRoleClient(), ctx.clanId)]);
  return <div className="space-y-5">{stats?.permissions.viewMscore && <ClanFormationStats summaries={stats.intra.scoreGapSummary} />}{stats && <ClanOperationalStats stats={stats.intra} />}<ClanSiteUsagePanel visits={visits} /></div>;
}

async function Subscription({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [canManage, user, profile] = await Promise.all([hasRequestClanPermission(ctx.clanId, "manage_clan_pool"), getRequestUser(), svc.from("clans").select("coin_balance").eq("id", ctx.clanId).single()]);
  if (profile.error) throw new Error("클랜 코인을 불러오지 못했습니다.");
  return <div className="space-y-4">
    <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}><div><p className="text-xs text-muted-foreground">클랜 코인 잔액</p><p className="mt-1 text-2xl font-bold tabular-nums">{Number(profile.data.coin_balance).toLocaleString()}<span className="ml-2 text-xs font-normal text-muted-foreground">코인</span></p></div><Link href={`/games/${ctx.gameSlug}/clan/${ctx.clanId}/store`} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">클랜 스토어</Link></section>
    <ClanManageSubscriptionPanel gameSlug={ctx.gameSlug} clanId={ctx.clanId} tierLabel={ctx.plan === "premium" ? "Premium" : "Free"} showDevPlanToggle={process.env.NODE_ENV === "development" || process.env.DEV_CLAN_PLAN_TOGGLE === "1"} isLeader={ctx.role === "leader"} />
    {canManage && user && <PurchaseCorrections ctx={ctx} userId={user.id} />}
  </div>;
}

async function PurchaseCorrections({ ctx, userId }: Pick<Props, "ctx"> & { userId: string }) {
  const svc = createServiceRoleClient();
  const [members, clanPurchases] = await Promise.all([
    svc.from("clan_members").select("user_id").eq("clan_id", ctx.clanId).eq("status", "active"),
    svc.from("purchases").select("id,price_coins,purchased_at,user_id,store_items(name_ko)").eq("clan_id", ctx.clanId).eq("pool_source", "clan").is("voided_at", null).order("purchased_at", { ascending: false }),
  ]);
  if (members.error || clanPurchases.error) throw new Error("구매 내역을 불러오지 못했습니다.");
  const memberIds = members.data.map((row) => row.user_id);
  const profileIds = [...new Set([...memberIds, ...clanPurchases.data.map((row) => row.user_id)])];
  const [personal, profiles] = await Promise.all([
    memberIds.length ? svc.from("purchases").select("id,price_coins,purchased_at,user_id,store_items(name_ko)").eq("pool_source", "personal").is("clan_id", null).is("voided_at", null).in("user_id", memberIds).order("purchased_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    profileIds.length ? svc.from("users").select("id,nickname").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (personal.error || profiles.error) throw new Error("구매 내역을 불러오지 못했습니다.");
  const names = new Map((profiles.data ?? []).map((row) => [row.id, row.nickname]));
  function rows(pool: "clan" | "personal", purchases: NonNullable<typeof clanPurchases.data>): ManageStoreVoidRowVM[] {
    return purchases.map((purchase) => ({ pool, purchaseId: purchase.id, itemNameKo: (Array.isArray(purchase.store_items) ? purchase.store_items[0] : purchase.store_items)?.name_ko ?? "상품", buyerNickname: names.get(purchase.user_id) ?? "—", priceCoins: purchase.price_coins, purchasedAtLabel: new Date(purchase.purchased_at).toLocaleString("ko-KR"), isBuyerSelf: purchase.user_id === userId }));
  }
  return <section className={panel}><h4 className="mb-3 text-sm font-semibold">구매 정정</h4>{clanPurchases.data.length || personal.data?.length ? <ClanManageStoreVoidPanel gameSlug={ctx.gameSlug} clanId={ctx.clanId} clanRows={rows("clan", clanPurchases.data)} personalRows={rows("personal", personal.data ?? [])} /> : <p className="text-xs text-muted-foreground">정정할 구매 내역이 없습니다.</p>}</section>;
}
