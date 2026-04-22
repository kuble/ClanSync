import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function BalanceStubPage({
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

  const storeHref = `/games/${gameSlug}/clan/${clanId}/store`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">밸런스메이커</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          팀 편성·밴픽·경기 후 M/A 점수까지 한 흐름으로 묶는 탭입니다. 세션
          열기·슬롯 배정·정산 UI는 M6c에서 이어갑니다.
        </p>
        {ctx?.plan === "free" ? (
          <p
            className={cn(
              "mt-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90",
            )}
          >
            Free 플랜: 일부 옵션은 Premium 전용입니다. (목업의{" "}
            <code className="text-xs">mock-hide-on-free</code> 패턴)
          </p>
        ) : null}
      </div>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-medium tracking-tight">밸런스 세션</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          아직 세션을 시작할 수 없습니다. 준비되면 여기서 참가자 초대·밴픽·점수
          입력이 이어집니다.
        </p>
        <Button type="button" disabled className="mt-4 w-full sm:w-auto">
          세션 열기
        </Button>
      </section>

      {user ? (
        <p className="text-muted-foreground text-sm">
          코인 잔액과 최근 거래는{" "}
          <Link
            href={storeHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            스토어
          </Link>
          탭에서 확인할 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}
