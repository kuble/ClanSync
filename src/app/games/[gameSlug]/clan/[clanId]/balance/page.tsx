import { ClanBalanceSessionPanel } from "@/components/main-clan/clan-balance-session-panel";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import type { Database } from "@/lib/supabase/database.types";
import { parseRoleRanking } from "@/lib/balance/role-preferences";
import {
  parseRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";

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
  const supabase = await getRequestClient();
  const user = await getRequestUser();
  if (!user) {
    return null;
  }

  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) {
    return null;
  }

  const [canManage, canEditMscore] = await Promise.all([
    hasRequestClanPermission(clanId, "manage_clan_events"),
    hasRequestClanPermission(clanId, "edit_mscore"),
  ]);
  const planPremium = ctx.plan === "premium";

  const [{ data: session }, { data: series }, { data: recentRounds }] =
    await Promise.all([
      supabase
        .from("balance_sessions")
        .select("*")
        .eq("clan_id", clanId)
        .is("closed_at", null)
        .maybeSingle(),
      supabase
        .from("balance_session_series")
        .select("*")
        .eq("clan_id", clanId)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("balance_sessions")
        .select("roster, opened_at")
        .eq("clan_id", clanId)
        .in("match_outcome", ["team1", "team2"])
        .order("opened_at", { ascending: false })
        .limit(100),
    ]);
  const [{ data: profilePreference }, { data: roundPreference }] = session
    ? await Promise.all([
        supabase
          .from("profile_role_preferences")
          .select("ranking")
          .eq("user_id", user.id)
          .eq("game_id", session.game_id)
          .maybeSingle(),
        supabase
          .from("balance_round_role_preferences")
          .select("ranking")
          .eq("user_id", user.id)
          .eq("round_id", session.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const recency = new Map<string, number>();
  (recentRounds ?? []).forEach((round, index) =>
    rosterAssignedUserIds(parseRoster(round.roster)).forEach((id) => {
      if (!recency.has(id)) recency.set(id, index);
    }),
  );

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
  const rosterPool = ((rosterPoolRows ?? []) as RosterPoolRow[])
    .map((r: RosterPoolRow) => ({
      user_id: r.user_id,
      nickname: r.nickname,
    }))
    .sort(
      (a, b) =>
        (recency.get(a.user_id) ?? Infinity) -
          (recency.get(b.user_id) ?? Infinity) ||
        a.nickname.localeCompare(b.nickname, "ko"),
    );

  let hostNickname: string | null = null;
  if (session?.host_user_id) {
    const { data: hostRow } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", session.host_user_id)
      .maybeSingle();
    hostNickname = hostRow?.nickname ?? null;
  }

  // Request-time clock aligns the initial reveal on this authenticated server page.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">밸런스메이커</h2>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            함께 만드는 공정한 한 판. 팀 편성부터 밴픽, 경기 결과까지 한곳에서.
          </p>
        </div>
      </div>

      <ClanBalanceSessionPanel
        gameSlug={gameSlug}
        clanId={clanId}
        userId={user.id}
        canManage={canManage}
        hostNickname={hostNickname}
        session={session}
        series={series}
        profileRanking={parseRoleRanking(profilePreference?.ranking)}
        roundRanking={
          roundPreference ? parseRoleRanking(roundPreference.ranking) : null
        }
        serverNow={serverNow}
        votes={votes ?? []}
        heroVotes={heroVotes}
        balancePredictions={balancePredictions}
        rosterPool={rosterPool}
        canEditMscore={canEditMscore}
        planPremium={planPremium}
        qaPreviewEnabled={
          canManage &&
          process.env.VERCEL_ENV !== "production" &&
          process.env.NEXT_PUBLIC_SUPABASE_URL ===
            "https://moretvteewfcztxvwztw.supabase.co"
        }
      />
    </div>
  );
}
