import { ClanBalanceSessionPanel } from "@/components/main-clan/clan-balance-session-panel";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { CircleHelp } from "lucide-react";

type RosterPoolRow =
  Database["public"]["Functions"]["list_balance_roster_pool"]["Returns"][number];
type HeroVoteRow =
  Database["public"]["Tables"]["balance_session_hero_votes"]["Row"];
type BalancePredictionRow =
  Database["public"]["Tables"]["balance_session_predictions"]["Row"];

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
  const canEditMscore = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "edit_mscore",
  );
  const planPremium = ctx.plan === "premium";

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
    : {
        data: [] as {
          session_id: string;
          user_id: string;
          choice_idx: number;
        }[],
      };

  let heroVotes: HeroVoteRow[] = [];
  if (session?.phase === "hero_ban") {
    const { data: hv } = await supabase
      .from("balance_session_hero_votes")
      .select("session_id, user_id, pick_1, pick_2, pick_3")
      .eq("session_id", session.id);
    heroVotes = hv ?? [];
  }

  let balancePredictions: BalancePredictionRow[] = [];
  if (session?.phase === "match_live") {
    const { data: bp } = await supabase
      .from("balance_session_predictions")
      .select("session_id, user_id, pick_team, created_at")
      .eq("session_id", session.id);
    balancePredictions = bp ?? [];
  }

  const { data: rosterPoolRows } = await supabase.rpc(
    "list_balance_roster_pool",
    {
      p_clan_id: clanId,
    },
  );
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">밸런스메이커</h2>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            함께 만드는 공정한 한 판. 팀 편성부터 밴픽, 경기 결과까지 한곳에서.
          </p>
        </div>
        <details className="group relative text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border px-3 py-2 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <CircleHelp className="size-4" aria-hidden="true" />
            이용 안내
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg">
            <p className="leading-relaxed">
              운영진이 참가자를 배치한 뒤 밴픽과 경기를 시작합니다. 한 팀은 탱커
              1명, 딜러 2명, 힐러 2명으로 구성됩니다.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Premium 클랜의 비출전 멤버는 경기 시작 후 5분 동안 승부예측에
              참여할 수 있습니다.
            </p>
          </div>
        </details>
      </div>

      <ClanBalanceSessionPanel
        gameSlug={gameSlug}
        clanId={clanId}
        userId={user.id}
        canManage={canManage}
        hostNickname={hostNickname}
        session={session}
        votes={votes ?? []}
        heroVotes={heroVotes}
        balancePredictions={balancePredictions}
        rosterPool={rosterPool}
        canEditMscore={canEditMscore}
        planPremium={planPremium}
      />
    </div>
  );
}
