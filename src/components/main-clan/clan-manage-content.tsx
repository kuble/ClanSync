import "server-only";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, ImageIcon, Trophy } from "lucide-react";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import type { ManageTab } from "@/lib/clan/manage-sections";
import { loadClanHistory } from "@/lib/clan/load-clan-history";
import { ClanBadges } from "./clan-badges";
import { loadClanBadges } from "@/lib/clan/load-clan-badges";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { clanHasActivePurchaseForItemSlug } from "@/lib/store/store-purchase-queries";
import { loadClanSiteVisits } from "@/lib/clan/stats/clan-site-usage";
import { loadClanPeerNames } from "@/lib/clan/load-clan-peer-names";
import { loadClanManagementStats } from "@/lib/clan/stats/load-clan-stats";
import { ClanManageNotices, ClanManageRules } from "./clan-manage-notices";
import { ClanBannerSettingsForm } from "./clan-banner-settings-form";
import { ClanBalanceAutoCloseSettings } from "./clan-balance-auto-close-settings";
import { ClanAuctionItemSettings } from "./clan-auction-item-settings";
import { ManageJoinRequestsPanel } from "./manage-join-requests-panel";
import { ManageMembersTable, type ManageMemberRow } from "./manage-members-table";
import { ClanParticipantData } from "./clan-participant-data";
import { ClanManageSubscriptionPanel } from "./clan-manage-subscription-panel";
import { ClanManageStoreVoidPanel, type ManageStoreVoidRowVM } from "./clan-manage-store-void-panel";
import { ClanFormationStats } from "./clan-formation-stats";
import { ClanOperationalStats } from "./clan-operational-stats";
import { ClanSiteUsagePanel } from "./clan-site-usage-panel";
import { ClanDiscordSettings } from "./clan-discord-settings";
import { discordBotConfigured } from "@/lib/notifications/discord-bot";
import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { readDiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";

const panel = "rounded-xl border border-border bg-card p-4 sm:p-5";
type Props = { ctx: MainClanContext; selected: ManageTab; connectionResult?: string };

/** The parent page verifies officer+ before any service-role read is started. */
export async function ClanManageContent({ ctx, selected, connectionResult }: Props) {
  switch (selected) {
    case "overview": return <Overview ctx={ctx} />;
    case "notices": return <Notices ctx={ctx} />;
    case "appearance": return <Appearance ctx={ctx} />;
    case "requests": return <Requests ctx={ctx} />;
    case "members": return <Members ctx={ctx} />;
    case "balance": return <BalanceSettings ctx={ctx} />;
    case "notifications": return <NotificationSettings ctx={ctx} connectionResult={connectionResult} />;
    case "insights": return <Insights ctx={ctx} />;
    case "subscription": return <Subscription ctx={ctx} />;
  }
}

async function NotificationSettings({ ctx, connectionResult }: Pick<Props, "ctx" | "connectionResult">) {
  const svc = createServiceRoleClient();
  const [settings, connection] = await Promise.all([
    svc.from("clan_settings").select("event_notify").eq("clan_id", ctx.clanId).single(),
    svc.from("clan_discord_connections").select("guild_name,channel_id,channel_name").eq("clan_id", ctx.clanId).maybeSingle(),
  ]);
  if (settings.error || connection.error) throw new Error("알림 설정을 불러오지 못했습니다.");
  const notify = readClanEventNotifySettings(settings.data.event_notify);
  return <ClanDiscordSettings key={`${ctx.clanId}:${ctx.role}:${ctx.plan}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} canEdit={ctx.role === "leader"} premium={ctx.plan === "premium"}
    botConfigured={discordBotConfigured()} connection={connection.data} discordEnabled={notify.discord_enabled}
    routes={readDiscordNotificationRoutes(settings.data.event_notify)} connectionResult={connectionResult} />;
}

async function Overview({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [profile, history, badges] = await Promise.all([
    svc.from("clans").select("created_at,coin_balance,max_members").eq("id", ctx.clanId).single(),
    loadClanHistory(svc, ctx.clanId),
    loadClanBadges(ctx.clanId).catch(() => null),
  ]);
  if (profile.error) throw new Error("클랜 정보를 불러오지 못했습니다.");
  const base = `/games/${ctx.gameSlug}/clan/${ctx.clanId}`;
  const dateLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  const facts = [
    { label: "구성원", value: ctx.memberCount == null ? "—" : `${ctx.memberCount}명`, detail: ctx.memberCount == null ? `정원 ${profile.data.max_members}명` : `정원 ${profile.data.max_members}명 · ${Math.max(0, profile.data.max_members - ctx.memberCount)}자리 여유`, href: `${base}/manage?tab=members` },
    { label: "총 내전", value: history.total == null ? "—" : `${history.total.toLocaleString()}회`, detail: "정규·깜짝 내전 개설 회차", href: `${base}/balance` },
    { label: "클랜 코인", value: Number(profile.data.coin_balance).toLocaleString(), detail: "잔액·플랜", href: `${base}/manage?tab=subscription` },
  ];
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {facts.map(({ label, value, detail, href }) => (
        <Link key={label} href={href} prefetch={false} aria-label={`${label} ${value}`} className="group min-w-0 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
          <div className="flex items-center justify-between gap-1"><p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p><ArrowUpRight className="size-3 shrink-0 text-muted-foreground/60 group-hover:text-primary" aria-hidden /></div>
          {label === "총 내전" ? <><dl className="mt-3 grid grid-cols-2 gap-2"><div><dt className="text-[11px] text-muted-foreground">정규 내전</dt><dd className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{history.regular == null ? "확인 필요" : history.regular.toLocaleString()+"회"}</dd></div><div><dt className="text-[11px] text-muted-foreground">깜짝 내전</dt><dd className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{history.flash == null ? "확인 필요" : history.flash.toLocaleString()+"회"}</dd></div></dl><p className="mt-2 text-[11px] text-muted-foreground">총 {value} · 개설 회차{history.regular != null && history.flash != null && history.total != null && history.regular+history.flash!==history.total ? " · 분류 확인 필요":""}</p></> : <><p className="mt-3 break-words text-xl font-semibold tabular-nums sm:text-2xl">{value}</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{detail}</p></>}
        </Link>
      ))}
    </div>
    <section className={panel} aria-label="클랜 기록">
      <dl className="grid gap-5 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border">
        <div className="flex items-start gap-3 sm:pr-5"><CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><div><dt className="text-xs text-muted-foreground">클랜 설립일</dt><dd className="mt-2 text-sm font-medium">{dateLabel(profile.data.created_at)}</dd></div></div>
        <div className="flex items-start gap-3 sm:pl-5"><Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><div><dt className="text-xs text-muted-foreground">최근 내전</dt><dd className="mt-2 text-sm font-medium">{history.total == null ? "기록 확인 필요" : history.latestAt ? dateLabel(history.latestAt) : "아직 개설된 내전이 없습니다."}</dd></div></div>
      </dl>
    </section>
    <section className={`${panel} space-y-4`} aria-label="클랜 배지">
      <div className="flex items-center gap-2"><Trophy className="size-4 text-primary" aria-hidden /><h4 className="text-sm font-semibold">클랜 배지</h4></div>
      {badges ? <ClanBadges collection={badges} gameSlug={ctx.gameSlug} clanId={ctx.clanId} compact /> : <p role="alert" className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">배지 기록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>}
      <p className="text-[11px] text-muted-foreground">내전 배지는 종료된 종류별 내전 회차를 기준으로 달성합니다.</p>
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
  const [profiles, gameProfiles, participantNames] = await Promise.all([
    ids.length ? svc.from("users").select("id,nickname").in("id", ids) : { data: [], error: null },
    ids.length ? svc.from("user_game_profiles").select("user_id,is_verified,games!inner(slug)").in("user_id", ids).eq("games.slug", ctx.gameSlug) : { data: [], error: null },
    (await getRequestClient()).rpc("clan_peer_nicknames", { p_clan_id: ctx.clanId }),
  ]);
  if (profiles.error || gameProfiles.error || participantNames.error) throw new Error("구성원 정보를 불러오지 못했습니다.");
  const byId = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const labels = new Map<string, string>((participantNames.data ?? []).map((row: { user_id: string; nickname: string }) => [row.user_id, row.nickname]));
  const verified = new Set((gameProfiles.data ?? []).filter((row) => row.is_verified).map((row) => row.user_id));
  const rows: ManageMemberRow[] = members.data.map((row) => ({ userId: row.user_id, nickname: labels.get(row.user_id) ?? byId.get(row.user_id)?.nickname ?? "—", gameVerified: verified.has(row.user_id), role: row.role, joinedLabel: new Date(row.joined_at).toLocaleDateString("ko-KR"), lastActivityAt: row.last_activity_at ?? row.joined_at, actions: { canKick: row.role === "leader" ? false : row.role === "officer" ? kickOfficer : kickMember, canPromote: row.role === "member" && ctx.role === "leader", canDemote: row.role === "officer" && ctx.role === "leader" } }));
  return <div className="space-y-4"><section className={panel}><p className="mb-4 text-xs text-muted-foreground">활동 멤버 {rows.length}명</p><ManageMembersTable gameSlug={ctx.gameSlug} clanId={ctx.clanId} rows={rows} /></section><ClanParticipantData clanId={ctx.clanId} gameSlug={ctx.gameSlug} /></div>;
}

async function BalanceSettings({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const client = await getRequestClient();
  const [profile, items] = await Promise.all([
    svc.from("clans").select("balance_auto_close_enabled,balance_auto_close_hours").eq("id", ctx.clanId).single(),
    client.from("clan_auction_items").select("id,name,description,cost,enabled").eq("clan_id", ctx.clanId).order("created_at"),
  ]);
  if (profile.error) throw new Error("내전 설정을 불러오지 못했습니다.");
  return <div className="space-y-4"><ClanBalanceAutoCloseSettings key={`${ctx.clanId}:${ctx.role}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialEnabled={profile.data.balance_auto_close_enabled} initialHours={profile.data.balance_auto_close_hours} /><ClanAuctionItemSettings gameSlug={ctx.gameSlug} clanId={ctx.clanId} items={items.data ?? []} loadError={!!items.error} /></div>;
}

async function Insights({ ctx }: Pick<Props, "ctx">) {
  const client = await getRequestClient();
  const [stats, visits, names] = await Promise.all([loadClanManagementStats(client, ctx.clanId), loadClanSiteVisits(createServiceRoleClient(), ctx.clanId), loadClanPeerNames(ctx.clanId)]);
  if (names.error) throw new Error("방문자 이름을 불러오지 못했습니다.");
  return <div className="space-y-5">{stats?.permissions.viewMscore && <ClanFormationStats summaries={stats.intra.scoreGapSummary} />}{stats && <ClanOperationalStats stats={stats.intra} />}<ClanSiteUsagePanel visits={visits} memberNames={Object.fromEntries(names.data.map((row) => [row.user_id, row.nickname]))} /></div>;
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
