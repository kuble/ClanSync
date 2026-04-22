import { ClanBalanceSessionPanel } from "@/components/main-clan/clan-balance-session-panel";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type RosterPoolRow =
  Database["public"]["Functions"]["list_balance_roster_pool"]["Returns"][number];

export default async function BalancePage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const ctx = await loadMainClanContext(supabase, user.id, gameSlug, clanId);
  if (!ctx) {
    return null;
  }

  const canManage = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );

  const { data: session } = await supabase
    .from("balance_sessions")
    .select("*")
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  const { data: votes } = session
    ? await supabase
        .from("balance_session_map_votes")
        .select("session_id, user_id, choice_idx")
        .eq("session_id", session.id)
    : { data: [] as { session_id: string; user_id: string; choice_idx: number }[] };

  const { data: rosterPoolRows } = await supabase.rpc("list_balance_roster_pool", {
    p_clan_id: clanId,
  });
  const rosterPool = (rosterPoolRows ?? []).map((r: RosterPoolRow) => ({
    user_id: r.user_id,
    nickname: r.nickname,
  }));

  let hostNickname: string | null = null;
  if (session?.host_user_id) {
    const { data: hostRow } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", session.host_user_id)
      .maybeSingle();
    hostNickname = hostRow?.nickname ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">밸런스메이커</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          팀 편성·밴픽·경기 후 M/A 점수까지 한 흐름으로 묶는 탭입니다. 세션·맵
          밴 MVP가 켜져 있습니다.
        </p>
        {ctx.plan === "free" ? (
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

      <ClanBalanceSessionPanel
        gameSlug={gameSlug}
        clanId={clanId}
        userId={user.id}
        canManage={canManage}
        hostNickname={hostNickname}
        session={session}
        votes={votes ?? []}
        rosterPool={rosterPool}
      />
    </div>
  );
}
