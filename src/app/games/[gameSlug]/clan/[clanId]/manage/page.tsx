import { forbidden } from "next/navigation";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { ManageJoinRequestsPanel } from "@/components/main-clan/manage-join-requests-panel";
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

  let joinRequestRows: {
    id: string;
    message: string;
    appliedAt: string;
    nickname: string;
    email: string;
  }[] = [];

  if (canApprove && user) {
    const svc = createServiceRoleClient();
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          가입 신청을 검토합니다. 구성원 목록·구독 등은 M6b 후속에서
          확장합니다.
        </p>
      </div>

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
