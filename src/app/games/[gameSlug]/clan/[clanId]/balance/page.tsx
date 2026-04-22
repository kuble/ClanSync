import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">밸런스메이커</h2>
      <p className="text-muted-foreground text-sm">
        M6c에서 세션·밴픽·M/A 점수 UI를 연결합니다.
      </p>
      {ctx?.plan === "free" ? (
        <p
          className={cn(
            "rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90",
          )}
        >
          Free 플랜: 일부 옵션은 Premium 전용입니다. (목업의{" "}
          <code className="text-xs">mock-hide-on-free</code> 패턴)
        </p>
      ) : null}
    </div>
  );
}
