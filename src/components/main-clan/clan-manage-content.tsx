import "server-only";
import { loadClanPlayerNames } from "@/lib/game-auth/load-game-player-names";
import { profileBattleTag } from "@/lib/game-auth/battle-tag";
import Link from "next/link";
import { CalendarDays, Clock, Coins, Swords, Trophy, Users } from "lucide-react";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import type { ManageTab } from "@/lib/clan/manage-sections";
import { loadClanHistory } from "@/lib/clan/load-clan-history";
import { loadClanCosmeticAccess } from "@/lib/clan/load-clan-cosmetics";
import { ClanBadges } from "./clan-badges";
import { loadClanBadges } from "@/lib/clan/load-clan-badges";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { MVP_STORE_SLUGS } from "@/lib/store/mvp-store-slugs";
import { loadClanSiteVisits } from "@/lib/clan/stats/clan-site-usage";
import { loadClanPeerNames } from "@/lib/clan/load-clan-peer-names";
import { loadClanManagementStats } from "@/lib/clan/stats/load-clan-stats";
import { ClanManageNotices, ClanManageRules } from "./clan-manage-notices";
import { ClanAppearanceSettings } from "./clan-appearance-settings";
import { ClanEmojiSettings } from "./clan-emoji-settings";
import { ClanBalanceAutoCloseSettings } from "./clan-balance-auto-close-settings";
import { ManageJoinRequestsPanel } from "./manage-join-requests-panel";
import { ManageMembersTable, type ManageMemberRow } from "./manage-members-table";
import { ClanParticipantData } from "./clan-participant-data";
import { ClanManageSubscriptionPanel } from "./clan-manage-subscription-panel";
import { ClanManageStoreVoidPanel, type ManageStoreVoidRowVM } from "./clan-manage-store-void-panel";
import { ClanFormationStats } from "./clan-formation-stats";
import { ClanSiteUsagePanel } from "./clan-site-usage-panel";
import { ClanDiscordSettings } from "./clan-discord-settings";
import { ClanCommunityLinksForm } from "./clan-community-links-form";
import { readClanCommunityLinks } from "@/lib/clan/community-links";
import { discordBotConfigured } from "@/lib/notifications/discord-bot";
import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { readDiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";
import { ClanPromotionSettings } from "./clan-promotion-settings";

const panel = "rounded-xl border border-border bg-card p-4 sm:p-5";
type Props = { ctx: MainClanContext; selected: ManageTab; connectionResult?: string };

/** The parent page verifies officer+ before any service-role read is started. */
export async function ClanManageContent({ ctx, selected, connectionResult }: Props) {
  switch (selected) {
    case "overview": return <Overview ctx={ctx} />;
    case "promotion": return <Promotion ctx={ctx} />;
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

async function Promotion({ ctx }: Pick<Props, "ctx">) {
  const client = await getRequestClient();
  const [conditions, posts] = await Promise.all([
    client.from("clans").select("birth_year_from,min_birth_year,gender_policy,tier_range").eq("id",ctx.clanId).single(),
    client.from("board_posts").select("id,title,content,content_blocks,created_at,updated_at").eq("clan_id",ctx.clanId).eq("post_type","promotion").order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1),
  ]);
  if (conditions.error || posts.error) throw new Error("클랜 홍보 정보를 불러오지 못했습니다.");
  return <ClanPromotionSettings key={`${ctx.clanId}:${ctx.role}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} initial={conditions.data} post={posts.data[0] ?? null} />;
}

async function NotificationSettings({ ctx, connectionResult }: Pick<Props, "ctx" | "connectionResult">) {
  const svc = createServiceRoleClient();
  const [settings, connection, profile] = await Promise.all([
    svc.from("clan_settings").select("event_notify,community_links").eq("clan_id", ctx.clanId).single(),
    svc.from("clan_discord_connections").select("guild_name,channel_id,channel_name").eq("clan_id", ctx.clanId).maybeSingle(),
    svc.from("clans").select("discord_url,kakao_url").eq("id", ctx.clanId).single(),
  ]);
  if (settings.error || connection.error || profile.error) throw new Error("알림 설정을 불러오지 못했습니다.");
  const notify = readClanEventNotifySettings(settings.data.event_notify);
  return <div className="space-y-5">
    <ClanCommunityLinksForm key={`${ctx.clanId}:${ctx.role}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} canEdit={ctx.role === "leader"} initialLinks={readClanCommunityLinks(settings.data.community_links, profile.data)} discordConnected={!!connection.data} />
    <ClanDiscordSettings key={`${ctx.clanId}:${ctx.role}:${ctx.plan}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} canEdit={ctx.role === "leader"} premium={ctx.plan === "premium"}
    botConfigured={discordBotConfigured()} connection={connection.data} discordEnabled={notify.discord_enabled}
    routes={readDiscordNotificationRoutes(settings.data.event_notify)} connectionResult={connectionResult} />
  </div>;
}

async function Overview({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [profile, history, badges] = await Promise.all([
    svc.from("clans").select("created_at,coin_balance").eq("id", ctx.clanId).single(),
    loadClanHistory(svc, ctx.clanId),
    loadClanBadges(ctx.clanId).catch(() => null),
  ]);
  if (profile.error) throw new Error("클랜 정보를 불러오지 못했습니다.");
  const dateLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  const facts = [
    { label: "구성원", value: ctx.memberCount == null ? "—" : `${ctx.memberCount}명`, icon: Users },
    { label: "총 내전", value: history.total == null ? "—" : `${history.total.toLocaleString()}회`, icon: Swords },
    { label: "클랜 코인", value: Number(profile.data.coin_balance).toLocaleString(), icon: Coins },
  ];
  return <div className="space-y-5">
    <div role="group" aria-label="클랜 운영 요약" className="grid grid-cols-3 gap-2 sm:gap-3">
      {facts.map(({ label, value, icon: Icon }) => (
        <section key={label} aria-label={`${label} ${value}`} className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-5">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold sm:gap-2 sm:text-sm"><Icon className="size-4 shrink-0 text-primary" aria-hidden />{label}</h4>
          {label === "총 내전" ? <>
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><dt className="text-[11px] text-muted-foreground">정규 내전</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums sm:text-xl">{history.regular == null ? "확인 필요" : history.regular.toLocaleString()+"회"}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">깜짝 내전</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums sm:text-xl">{history.flash == null ? "확인 필요" : history.flash.toLocaleString()+"회"}</dd></div>
            </dl>
            {history.regular != null && history.flash != null && history.total != null && history.regular + history.flash !== history.total && <p role="status" className="mt-2 text-[11px] text-muted-foreground">분류 확인 필요</p>}
          </> : <p className="mt-3 break-words text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>}
        </section>
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
      {badges ? <ClanBadges collection={badges} gameSlug={ctx.gameSlug} clanId={ctx.clanId} compact /> : <p role="alert" className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">배지 기록을 불러오지 못했습니다. 잠시 후 새로고침해 주십시오.</p>}
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
  const names = await loadClanPlayerNames(ctx.clanId, authorIds);
  return <div className="space-y-4">
    <ClanManageNotices gameSlug={ctx.gameSlug} clanId={ctx.clanId} loadFailed={!!notices.error} notices={(notices.data ?? []).map((notice) => ({ id: notice.id, title: notice.title, content: notice.content, isPinned: notice.is_pinned, createdAt: notice.created_at, author: names.get(notice.created_by ?? "") ?? "운영진" }))} />
    <ClanManageRules gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialRules={profile.data?.rules ?? null} loadFailed={!!profile.error || !profile.data} />
  </div>;
}

async function Appearance({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [catalog, canManage, purchases, emojis, access] = await Promise.all([
    svc.from("store_items").select("id,slug,name_ko,asset_url").eq("is_active", true).eq("pool_source", "clan").in("slug", [...MVP_STORE_SLUGS]).order("released_at"),
    hasRequestClanPermission(ctx.clanId, "manage_clan_pool"),
    svc.from("purchases").select("item_id").eq("clan_id", ctx.clanId).eq("pool_source", "clan").is("voided_at", null),
    svc.from("clan_emojis").select("id,name,slot_index").eq("clan_id",ctx.clanId).order("slot_index"),
    loadClanCosmeticAccess(ctx.clanId),
  ]);
  if (catalog.error || purchases.error || emojis.error) throw new Error("클랜 꾸미기를 불러오지 못했습니다.");
  const owned = new Set(purchases.data.map(row => row.item_id));
  return <div className="space-y-5"><ClanAppearanceSettings key={`${ctx.clanId}:${ctx.role}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} clanName={ctx.clanName} initialIconUrl={ctx.iconUrl} initialBannerUrl={ctx.bannerUrl} canManage={canManage} banners={catalog.data.flatMap(row => row.asset_url&&row.slug.startsWith("clan_banner_") ? [{ slug: row.slug, name: row.name_ko, url: row.asset_url, owned: owned.has(row.id) }] : [])} /><ClanEmojiSettings gameSlug={ctx.gameSlug} clanId={ctx.clanId} canEdit={canManage} emojis={emojis.data} slots={access.emojiSlots}/></div>;
}

async function Requests({ ctx }: Pick<Props, "ctx">) {
  if (!await hasRequestClanPermission(ctx.clanId, "approve_join_requests")) return <p className="text-sm text-muted-foreground">가입 승인 권한이 필요합니다.</p>;
  const svc = createServiceRoleClient();
  const requests = await svc.from("clan_join_requests").select("id,user_id,message,applied_at").eq("clan_id", ctx.clanId).eq("status", "pending").order("applied_at");
  if (requests.error) throw new Error("가입 요청을 불러오지 못했습니다.");
  const ids = [...new Set(requests.data.map((row) => row.user_id))];
  const [profiles, gameProfiles, memberships, names] = await Promise.all([
    ids.length ? svc.from("users").select("id,birth_year,gender").in("id", ids) : { data: [], error: null },
    ids.length ? svc.from("user_game_profiles").select("user_id,game_uid,battle_tag,is_verified,games!inner(slug)").in("user_id", ids).eq("games.slug", ctx.gameSlug) : { data: [], error: null },
    ids.length ? svc.from("clan_members").select("user_id,status").eq("clan_id", ctx.clanId).in("user_id", ids) : { data: [], error: null },
    loadClanPlayerNames(ctx.clanId, ids),
  ]);
  if (profiles.error || gameProfiles.error || memberships.error) throw new Error("신청자 정보를 불러오지 못했습니다.");
  const returning = new Set((memberships.data ?? []).filter((row) => row.status === "left").map((row) => row.user_id));
  const byId = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const gamesById = new Map((gameProfiles.data ?? []).map((row) => [row.user_id, row]));
  return <section className={panel}><ManageJoinRequestsPanel gameSlug={ctx.gameSlug} clanId={ctx.clanId} rows={requests.data.map((row) => ({ id: row.id, userId: row.user_id, returningMember: returning.has(row.user_id), message: row.message ?? "", appliedAt: row.applied_at, nickname: names.get(row.user_id) ?? "게임 ID 미등록", gameTag: profileBattleTag(gamesById.get(row.user_id)), gameVerified: gamesById.get(row.user_id)?.is_verified ?? false, profile: { birthYear: byId.get(row.user_id)?.birth_year ?? null, gender: byId.get(row.user_id)?.gender ?? null } }))} /></section>;
}

async function Members({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const [members, kickMember, kickOfficer, viewer] = await Promise.all([
    svc.from("clan_members").select("user_id,role,status,joined_at,participation_status,last_participated_at,participation_checked_on,departed_at,departure_kind").eq("clan_id", ctx.clanId).in("status", ["active", "left", "banned"]).order("role").order("joined_at"),
    hasRequestClanPermission(ctx.clanId, "kick_member"), hasRequestClanPermission(ctx.clanId, "kick_officer"), getRequestUser(),
  ]);
  if (members.error) throw new Error("구성원을 불러오지 못했습니다.");
  const ids = members.data.map((row) => row.user_id);
  const [names, gameProfiles, links] = await Promise.all([
    loadClanPlayerNames(ctx.clanId, ids),
    ids.length ? svc.from("user_game_profiles").select("user_id,game_uid,battle_tag,is_verified,games!inner(slug)").in("user_id", ids).eq("games.slug", ctx.gameSlug) : { data: [], error: null },
    (await getRequestClient()).from("clan_participants").select("user_id").eq("clan_id", ctx.clanId).eq("is_guest", true).not("user_id", "is", null),
  ]);
  if (gameProfiles.error || links.error) throw new Error("구성원 정보를 불러오지 못했습니다.");
  const verified = new Set((gameProfiles.data ?? []).filter((row) => row.is_verified).map((row) => row.user_id));
  const gamesById = new Map((gameProfiles.data ?? []).map((row) => [row.user_id, row]));
  const linkedCounts = new Map<string, number>();
  for (const link of links.data ?? []) if (link.user_id) linkedCounts.set(link.user_id, (linkedCounts.get(link.user_id) ?? 0) + 1);
  const rows: ManageMemberRow[] = members.data.map((row) => ({ userId: row.user_id, status: row.status === "banned" ? "banned" : row.status === "left" ? "left" : "active", departureKind: row.departure_kind, departedLabel: row.departed_at ? new Date(row.departed_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—", nickname: names.get(row.user_id) ?? "게임 ID 미등록", gameTag: profileBattleTag(gamesById.get(row.user_id)), linkedCount: linkedCounts.get(row.user_id) ?? 0, gameVerified: verified.has(row.user_id), role: row.role, joinedLabel: new Date(row.joined_at).toLocaleDateString("ko-KR"), participationStatus: row.participation_status as ManageMemberRow["participationStatus"], lastParticipatedAt: row.last_participated_at, participationCheckedOn: row.participation_checked_on, actions: { canKick: row.status === "active" && (row.role === "officer" ? kickOfficer : row.role === "member" && kickMember), canPromote: row.status === "active" && row.role === "member" && ctx.role === "leader", canDemote: row.status === "active" && row.role === "officer" && ctx.role === "leader", canTransferLeadership: row.status === "active" && row.role === "leader" && row.user_id === viewer?.id && ctx.role === "leader", canAllowRejoin: row.status === "banned" && row.role !== "leader" && (ctx.role === "leader" || row.role === "member") } }));
  return <div className="space-y-4"><section className={panel}><ManageMembersTable gameSlug={ctx.gameSlug} clanId={ctx.clanId} rows={rows} /></section><ClanParticipantData clanId={ctx.clanId} gameSlug={ctx.gameSlug} /></div>;
}

async function BalanceSettings({ ctx }: Pick<Props, "ctx">) {
  const svc = createServiceRoleClient();
  const profile = await svc.from("clans").select("balance_auto_close_enabled,balance_auto_close_hours,balance_auto_open_enabled,balance_auto_open_minutes").eq("id", ctx.clanId).single();
  if (profile.error) throw new Error("내전 설정을 불러오지 못했습니다.");
  return <ClanBalanceAutoCloseSettings key={`${ctx.clanId}:${ctx.role}`} gameSlug={ctx.gameSlug} clanId={ctx.clanId} initialEnabled={profile.data.balance_auto_close_enabled} initialHours={profile.data.balance_auto_close_hours} initialOpenEnabled={profile.data.balance_auto_open_enabled} initialOpenMinutes={profile.data.balance_auto_open_minutes} />;
}

async function Insights({ ctx }: Pick<Props, "ctx">) {
  const client = await getRequestClient();
  const [stats, visits, names] = await Promise.all([loadClanManagementStats(client, ctx.clanId), loadClanSiteVisits(createServiceRoleClient(), ctx.clanId), loadClanPeerNames(ctx.clanId)]);
  if (names.error) throw new Error("방문자 이름을 불러오지 못했습니다.");
  return <div className="space-y-5">{stats?.permissions.viewMscore && <ClanFormationStats summaries={stats.intra.scoreGapSummary} />}<ClanSiteUsagePanel visits={visits} memberNames={Object.fromEntries(names.data.map((row) => [row.user_id, row.nickname]))} /></div>;
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
    loadClanPlayerNames(ctx.clanId, profileIds),
  ]);
  if (personal.error) throw new Error("구매 내역을 불러오지 못했습니다.");
  const names = profiles;
  function rows(pool: "clan" | "personal", purchases: NonNullable<typeof clanPurchases.data>): ManageStoreVoidRowVM[] {
    return purchases.map((purchase) => ({ pool, purchaseId: purchase.id, itemNameKo: (Array.isArray(purchase.store_items) ? purchase.store_items[0] : purchase.store_items)?.name_ko ?? "상품", buyerNickname: names.get(purchase.user_id) ?? "—", priceCoins: purchase.price_coins, purchasedAtLabel: new Date(purchase.purchased_at).toLocaleString("ko-KR"), isBuyerSelf: purchase.user_id === userId }));
  }
  return <section className={panel}><h4 className="mb-3 text-sm font-semibold">구매 정정</h4>{clanPurchases.data.length || personal.data?.length ? <ClanManageStoreVoidPanel gameSlug={ctx.gameSlug} clanId={ctx.clanId} clanRows={rows("clan", clanPurchases.data)} personalRows={rows("personal", personal.data ?? [])} /> : <p className="text-xs text-muted-foreground">정정할 구매 내역이 없습니다.</p>}</section>;
}
