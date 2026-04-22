import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ClanStorePage({
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

  let coinBalance = 0;
  if (user) {
    const { data: urow } = await supabase
      .from("users")
      .select("coin_balance")
      .eq("id", user.id)
      .maybeSingle();
    coinBalance = urow?.coin_balance ?? 0;
  }

  const premium = ctx?.plan === "premium";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">스토어</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          코인으로 클랜·개인 꾸미기 아이템을 구매합니다. 결제 연동 전까지 UI만
          제공합니다.
        </p>
        {user ? (
          <p className="mt-3 text-sm font-medium tabular-nums">
            내 코인: {coinBalance.toLocaleString("ko-KR")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">클랜 배너 슬롯</CardTitle>
            <CardDescription>
              클랜 홍보 영역에 정적 배너를 올립니다. (Free)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">100 코인 · 준비 중</p>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="secondary" disabled>
              구매
            </Button>
          </CardFooter>
        </Card>

        <Card className={!premium ? "border-muted opacity-90" : ""}>
          <CardHeader>
            <CardTitle className="text-base">프로필 입장 효과</CardTitle>
            <CardDescription>
              Premium 전용 애니메이션 효과 (D-STORE-02)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              500 코인
              {!premium ? " · Premium 클랜에서만 해제" : ""}
            </p>
          </CardContent>
          <CardFooter>
            <Button type="button" disabled={!premium} variant="default">
              {premium ? "구매 (준비 중)" : "Premium 잠금"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        실제 차감·환불 정책(D-STORE-01/03)은 코인 트랜잭션 테이블 도입 후
        적용합니다.
      </p>
    </div>
  );
}
