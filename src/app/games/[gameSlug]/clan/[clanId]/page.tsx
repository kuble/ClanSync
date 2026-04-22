import { createClient } from "@/lib/supabase/server";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";

export default async function MainClanDashboardPage({
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

  const canApprove =
    user && ctx
      ? await hasClanPermission(supabase, user.id, clanId, "approve_join_requests")
      : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">대시보드</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          클랜 홈입니다. 왼쪽에서 탭을 선택하세요. (M6 이후 본문 확장)
        </p>
      </div>
      <section className="bg-card rounded-xl border p-4 text-sm shadow-sm">
        <h3 className="font-medium">세션 요약</h3>
        <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
          <li>
            역할:{" "}
            <span className="text-foreground font-medium">{ctx?.role ?? "—"}</span>
          </li>
          <li>
            플랜:{" "}
            <span className="text-foreground font-medium">
              {ctx?.plan === "premium" ? "Premium" : "Free"}
            </span>
          </li>
          <li>
            가입 승인 권한(D-PERM-01 `approve_join_requests`):{" "}
            <span className="text-foreground font-medium">
              {canApprove ? "예" : "아니오"}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
