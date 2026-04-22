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

  function roleLabel(role: string): string {
    if (role === "leader") return "클랜장";
    if (role === "officer") return "운영진";
    return "멤버";
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          가입 신청·활동 멤버를 확인합니다. 강퇴·역할 변경·구독 탭은 후속에서
          연결합니다.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-tight">활동 멤버</h3>
        {!memberRows?.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            멤버가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase">
                <tr>
                  <th className="px-3 py-2">닉네임</th>
                  <th className="px-3 py-2">이메일</th>
                  <th className="px-3 py-2">역할</th>
                  <th className="px-3 py-2">가입</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((m) => {
                  const p = profileById.get(m.user_id as string);
                  const joined = m.joined_at
                    ? new Date(m.joined_at as string).toLocaleDateString("ko-KR")
                    : "—";
                  return (
                    <tr key={m.user_id as string} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {p?.nickname ?? "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-2 text-xs">
                        {p?.email ?? "—"}
                      </td>
                      <td className="px-3 py-2">{roleLabel(m.role as string)}</td>
                      <td className="text-muted-foreground px-3 py-2 text-xs">
                        {joined}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
