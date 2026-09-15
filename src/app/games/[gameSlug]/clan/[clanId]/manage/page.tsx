import { forbidden } from "next/navigation";
import Link from "next/link";
import {
  Coins,
  ExternalLink,
  Flame,
  ImageIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ClanManageTabs,
  type ManageTab,
} from "@/components/main-clan/clan-manage-tabs";
import {
  ClanManageNotices,
  ClanManageRules,
  type ManagedClanNotice,
} from "@/components/main-clan/clan-manage-notices";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { ClanBannerSettingsForm } from "@/components/main-clan/clan-banner-settings-form";
import {
  ClanManageStoreVoidPanel,
  type ManageStoreVoidRowVM,
} from "@/components/main-clan/clan-manage-store-void-panel";
import { ClanManageSubscriptionPanel } from "@/components/main-clan/clan-manage-subscription-panel";
import { ManageJoinRequestsPanel } from "@/components/main-clan/manage-join-requests-panel";
import type { ManageMemberRow } from "@/components/main-clan/manage-members-table";
import { ManageMembersTable } from "@/components/main-clan/manage-members-table";
import { clanHasActivePurchaseForItemSlug } from "@/lib/store/store-purchase-queries";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/** pages.md — 클랜 관리: officer+ (멤버 직접 접근 403). */
export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const requestedTab = (await searchParams).tab;
  const initialTab: ManageTab =
    requestedTab === "requests" ||
    requestedTab === "members" ||
    requestedTab === "subscription"
      ? requestedTab
      : "overview";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx =
    user != null
      ? await loadMainClanContext(supabase, user.id, gameSlug, clanId)
      : null;

  if (!ctx || ctx.role === "member") {
    forbidden();
  }

  const canApprove =
    user != null
      ? await hasClanPermission(
          supabase,
          user.id,
          clanId,
          "approve_join_requests",
        )
      : false;

  const canKickMemberPerm =
    user != null
      ? await hasClanPermission(supabase, user.id, clanId, "kick_member")
      : false;
  const canKickOfficerPerm =
    user != null
      ? await hasClanPermission(supabase, user.id, clanId, "kick_officer")
      : false;

  const actorRole = ctx?.role ?? "member";
  const isLeader = actorRole === "leader";
  const showDevPlanToggle =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_CLAN_PLAN_TOGGLE === "1";

  const canManageClanPool =
    user != null
      ? await hasClanPermission(supabase, user.id, clanId, "manage_clan_pool")
      : false;

  const svc = createServiceRoleClient();

  let manageVoidClanRows: ManageStoreVoidRowVM[] = [];
  let manageVoidPersonalRows: ManageStoreVoidRowVM[] = [];

  if (canManageClanPool && user) {
    const { data: activeForVoid } = await svc
      .from("clan_members")
      .select("user_id")
      .eq("clan_id", clanId)
      .eq("status", "active");

    const activeMemberIds = [
      ...new Set((activeForVoid ?? []).map((r) => r.user_id as string)),
    ];

    const { data: rawPurchases } = await svc
      .from("purchases")
      .select("id, price_coins, purchased_at, user_id, store_items(name_ko)")
      .eq("clan_id", clanId)
      .eq("pool_source", "clan")
      .is("voided_at", null)
      .order("purchased_at", { ascending: false });

    const buyerIds = [
      ...new Set((rawPurchases ?? []).map((p) => p.user_id as string)),
    ];
    const { data: buyers } =
      buyerIds.length > 0
        ? await svc.from("users").select("id, nickname").in("id", buyerIds)
        : { data: [] as { id: string; nickname: string }[] };

    const buyerNick = new Map(
      (buyers ?? []).map((b) => [b.id, b.nickname ?? "—"] as const),
    );

    manageVoidClanRows = (rawPurchases ?? []).map((p) => {
      const uid = p.user_id as string;
      const items = p.store_items as unknown as { name_ko: string } | null;
      const at = p.purchased_at
        ? new Date(p.purchased_at as string).toLocaleString("ko-KR")
        : "—";
      return {
        pool: "clan" as const,
        purchaseId: p.id as string,
        itemNameKo: items?.name_ko ?? "상품",
        buyerNickname: buyerNick.get(uid) ?? "—",
        priceCoins: p.price_coins as number,
        purchasedAtLabel: at,
        isBuyerSelf: uid === user.id,
      };
    });

    if (activeMemberIds.length > 0) {
      const { data: rawPersonal } = await svc
        .from("purchases")
        .select("id, price_coins, purchased_at, user_id, store_items(name_ko)")
        .eq("pool_source", "personal")
        .is("clan_id", null)
        .is("voided_at", null)
        .in("user_id", activeMemberIds)
        .order("purchased_at", { ascending: false });

      const personalBuyerIds = [
        ...new Set((rawPersonal ?? []).map((p) => p.user_id as string)),
      ];
      const { data: personalBuyers } =
        personalBuyerIds.length > 0
          ? await svc
              .from("users")
              .select("id, nickname")
              .in("id", personalBuyerIds)
          : { data: [] as { id: string; nickname: string }[] };

      const personalBuyerNick = new Map(
        (personalBuyers ?? []).map((b) => [b.id, b.nickname ?? "—"] as const),
      );

      manageVoidPersonalRows = (rawPersonal ?? []).map((p) => {
        const uid = p.user_id as string;
        const items = p.store_items as unknown as { name_ko: string } | null;
        const at = p.purchased_at
          ? new Date(p.purchased_at as string).toLocaleString("ko-KR")
          : "—";
        return {
          pool: "personal" as const,
          purchaseId: p.id as string,
          itemNameKo: items?.name_ko ?? "상품",
          buyerNickname: personalBuyerNick.get(uid) ?? "—",
          priceCoins: p.price_coins as number,
          purchasedAtLabel: at,
          isBuyerSelf: uid === user.id,
        };
      });
    }
  }

  let joinRequestRows: {
    id: string;
    message: string;
    appliedAt: string;
    nickname: string;
    email: string;
  }[] = [];

  const hasBannerSlot = await clanHasActivePurchaseForItemSlug(
    svc,
    clanId,
    "clan_banner_slot",
  );

  const { data: clanProfile, error: clanProfileError } = await svc
    .from("clans")
    .select(
      "name, description, rules, tags, banner_url, icon_url, discord_url, kakao_url, coin_balance, max_members, created_at",
    )
    .eq("id", clanId)
    .maybeSingle();

  if (canApprove && user) {
    const { data: pendings } = await svc
      .from("clan_join_requests")
      .select("id, user_id, message, applied_at")
      .eq("clan_id", clanId)
      .eq("status", "pending")
      .order("applied_at", { ascending: true });

    const ids = [...new Set((pendings ?? []).map((p) => p.user_id as string))];
    const { data: profiles } =
      ids.length > 0
        ? await svc.from("users").select("id, nickname, email").in("id", ids)
        : { data: [] as { id: string; nickname: string; email: string }[] };

    const byUser = new Map((profiles ?? []).map((u) => [u.id, u] as const));

    joinRequestRows = (pendings ?? []).map((p) => {
      const u = byUser.get(p.user_id as string);
      return {
        id: p.id as string,
        message: (p.message as string) ?? "",
        appliedAt: p.applied_at as string,
        nickname: u?.nickname ?? "—",
        email: u?.email ?? "",
      };
    });
  }

  const { data: clanTierRow } = await svc
    .from("clans")
    .select("subscription_tier")
    .eq("id", clanId)
    .maybeSingle();

  const tierLabel =
    clanTierRow?.subscription_tier === "premium" ? "Premium" : "Free";

  const { data: memberRows } = await svc
    .from("clan_members")
    .select("user_id, role, status, joined_at, last_activity_at")
    .eq("clan_id", clanId)
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  const memberUserIds = [
    ...new Set((memberRows ?? []).map((m) => m.user_id as string)),
  ];
  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await svc
          .from("users")
          .select("id, nickname, email")
          .in("id", memberUserIds)
      : { data: [] as { id: string; nickname: string; email: string }[] };

  const profileById = new Map(
    (memberProfiles ?? []).map((u) => [u.id, u] as const),
  );

  const manageRows: ManageMemberRow[] = (memberRows ?? []).map((m) => {
    const uid = m.user_id as string;
    const p = profileById.get(uid);
    const role = m.role as ManageMemberRow["role"];
    const joinedLabel = m.joined_at
      ? new Date(m.joined_at as string).toLocaleDateString("ko-KR")
      : "—";

    let canKick = false;
    let canPromote = false;
    let canDemote = false;

    if (role === "leader") {
      /* no actions */
    } else if (role === "officer") {
      canKick = canKickOfficerPerm;
      canDemote = isLeader;
    } else {
      canKick = canKickMemberPerm;
      canPromote = isLeader;
    }

    return {
      userId: uid,
      nickname: p?.nickname ?? "—",
      email: p?.email ?? "",
      role,
      joinedLabel,
      lastActivityAt: m.last_activity_at ?? m.joined_at,
      actions: { canKick, canPromote, canDemote },
    };
  });

  const noticeResult = await supabase
    .from("clan_notices")
    .select("id, title, content, is_pinned, created_at, created_by")
    .eq("clan_id", clanId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const notices: ManagedClanNotice[] = (noticeResult.data ?? []).map(
    (notice: {
      id: string;
      title: string;
      content: string;
      is_pinned: boolean;
      created_at: string;
      created_by: string | null;
    }) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      isPinned: notice.is_pinned,
      createdAt: notice.created_at,
      author: notice.created_by
        ? (profileById.get(notice.created_by)?.nickname ?? "운영진")
        : "운영진",
    }),
  );
  const base = `/games/${gameSlug}/clan/${clanId}`;
  const externalLinks = [
    { label: "디스코드", url: clanProfile?.discord_url },
    { label: "오픈카카오톡", url: clanProfile?.kakao_url },
  ].filter((link) => {
    try {
      return !!link.url && new URL(link.url).protocol === "https:";
    } catch {
      return false;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">클랜 관리</h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          클랜의 소식과 멤버, 운영 설정을 한곳에서 관리하세요.
        </p>
      </div>
      <ClanManageTabs
        initialTab={initialTab}
        pendingCount={joinRequestRows.length}
        overview={
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Flame className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{ctx.clanName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ctx.gameName} · 소속 {manageRows.length}명
                    </p>
                  </div>
                </div>
                {clanProfile?.description && (
                  <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80">
                    {clanProfile.description}
                  </p>
                )}
                {(clanProfile?.tags ?? []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(clanProfile?.tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  {externalLinks.length ? (
                    externalLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                      >
                        {link.label}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      등록된 외부 채널이 없습니다.
                    </p>
                  )}
                </div>
              </section>
              <section className="flex flex-col rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    클랜 코인
                  </h3>
                  <Coins className="size-4 text-amber-500" aria-hidden="true" />
                </div>
                <p className="mt-5 text-3xl font-extrabold tabular-nums">
                  {Number(clanProfile?.coin_balance ?? 0).toLocaleString()}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    코인
                  </span>
                </p>
                <p className="mb-5 mt-2 text-xs text-muted-foreground">
                  클랜을 꾸미고 함께할 이벤트에 사용하세요.
                </p>
                <Link
                  href={`${base}/store`}
                  className="mt-auto self-start rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted"
                >
                  클랜 스토어
                </Link>
              </section>
            </div>
            {hasBannerSlot && canManageClanPool ? (
              <ClanBannerSettingsForm
                gameSlug={gameSlug}
                clanId={clanId}
                initialBannerUrl={
                  (clanProfile?.banner_url as string | null) ?? null
                }
              />
            ) : (
              <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-5">
                <ImageIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold">클랜 배너</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasBannerSlot
                      ? "배너를 변경하려면 클랜 꾸미기 관리 권한이 필요합니다."
                      : "클랜 스토어의 배너 슬롯으로 우리 클랜을 꾸며보세요."}
                  </p>
                </div>
              </section>
            )}
            <ClanManageNotices
              gameSlug={gameSlug}
              clanId={clanId}
              notices={notices}
              loadFailed={!!noticeResult.error}
            />
            <ClanManageRules
              gameSlug={gameSlug}
              clanId={clanId}
              initialRules={clanProfile?.rules ?? null}
              loadFailed={!!clanProfileError || !clanProfile}
            />
          </div>
        }
        requests={
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">가입 신청</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  클랜과 함께할 새로운 멤버를 확인하세요.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {joinRequestRows.length}건 대기
              </span>
            </div>
            {canApprove ? (
              <ManageJoinRequestsPanel
                gameSlug={gameSlug}
                clanId={clanId}
                rows={joinRequestRows}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                가입 승인 권한이 필요합니다.
              </p>
            )}
          </section>
        }
        members={
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold">활동 멤버</h3>
              <span className="text-xs text-muted-foreground">
                {manageRows.length}명
              </span>
            </div>
            <ManageMembersTable
              gameSlug={gameSlug}
              clanId={clanId}
              rows={manageRows}
            />
          </section>
        }
        subscription={
          <div className="space-y-4">
            <ClanManageSubscriptionPanel
              gameSlug={gameSlug}
              clanId={clanId}
              tierLabel={tierLabel}
              showDevPlanToggle={showDevPlanToggle}
              isLeader={isLeader}
            />
            {canManageClanPool && user && (
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-bold">구매 정정</h3>
                </div>
                <ClanManageStoreVoidPanel
                  gameSlug={gameSlug}
                  clanId={clanId}
                  clanRows={manageVoidClanRows}
                  personalRows={manageVoidPersonalRows}
                />
              </section>
            )}
          </div>
        }
      />
    </div>
  );
}
