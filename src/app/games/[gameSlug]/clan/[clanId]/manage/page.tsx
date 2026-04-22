import { forbidden } from "next/navigation";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createClient } from "@/lib/supabase/server";

/** pages.md — 클랜 관리: officer+ (멤버 직접 접근 403). */
export default async function ManageStubPage({
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">클랜 관리</h2>
      <p className="text-muted-foreground text-sm">
        M6b에서 가입 요청·구성원·구독 탭을 연결합니다. 사이드바 관리 항목의
        알림 점은 대기 중인 가입 신청 수(D-SHELL-03)를 반영합니다.
      </p>
    </div>
  );
}
