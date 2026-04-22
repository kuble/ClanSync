import { forbidden } from "next/navigation";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { ClanManageSubscriptionPanel } from "@/components/main-clan/clan-manage-subscription-panel";
import { ManageJoinRequestsPanel } from "@/components/main-clan/manage-join-requests-panel";
import type { ManageMemberRow } from "@/components/main-clan/manage-members-table";
import { ManageMembersTable } from "@/components/main-clan/manage-members-table";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/** pages.md — 클랜 관리: officer+ (멤버 직접 접근 403). */
export default async function ManagePage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
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

  let joinRequestRows: {
    id: string;
    message: string;
    appliedAt: string;
    nickname: string;
    email: string;
  }[] = [];

  const svc = createServiceRoleClient();

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
    .select("user_id, role, status, joined_at")
    .eq("clan_id", clanId)
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  const memberUserIds = [...new Set((memberRows ?? []).map((m) => m.user_id as string))];
  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await svc.from("users").select("id, nickname, email").in("id", memberUserIds)
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
      actions: { canKick, canPromote, canDemote },
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          가입 신청·활동 멤버·플랜을 다룹니다. 강퇴·역할 변경은 권한 매트릭스
          (D-PERM-01)를 따릅니다.
        </p>
      </div>

      <div id="subscription" className="scroll-mt-6">
        <ClanManageSubscriptionPanel
          gameSlug={gameSlug}
          clanId={clanId}
          tierLabel={tierLabel}
          showDevPlanToggle={showDevPlanToggle}
          isLeader={isLeader}
        />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-tight">활동 멤버</h3>
        {!memberRows?.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            멤버가 없습니다.
          </p>
        ) : (
          <ManageMembersTable
            gameSlug={gameSlug}
            clanId={clanId}
            rows={manageRows}
          />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-tight">가입 신청</h3>
        {canApprove ? (
          <ManageJoinRequestsPanel
            gameSlug={gameSlug}
            clanId={clanId}
            rows={joinRequestRows}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            가입 승인 권한이 있는 역할만 이 목록을 볼 수 있습니다.
          </p>
        )}
      </section>
    </div>
  );
}
