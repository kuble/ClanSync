import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { canManageRound } from "@/lib/balance/room-access";
import { ClanBalanceSessionPanel } from "@/components/main-clan/clan-balance-session-panel";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import type { Database } from "@/lib/supabase/database.types";
import { parseRoleRanking } from "@/lib/balance/role-preferences";
import { parseMaSnapshot, type MaSnapshot } from "@/lib/balance/ma-snapshot";
import { parseAnalysisContext } from "@/lib/balance/analysis-context";
import { parsePredictionPool, type PredictionPool } from "@/lib/balance/prediction-pool";
import {
  buildPlayerSessionInfo,
  type PlayerSessionRound,
} from "@/lib/balance/player-session-stats";
import {
  parseRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";

type RosterPoolRow =
  Database["public"]["Functions"]["list_balance_roster_pool"]["Returns"][number];
async function loadSeriesRounds(
  supabase: Awaited<ReturnType<typeof getRequestClient>>,
  clanId: string,
  seriesId: string,
): Promise<PlayerSessionRound[]> {
  const rounds: PlayerSessionRound[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("balance_sessions")
      .select("id, round_number, opened_at, match_outcome, roster")
      .eq("clan_id", clanId)
      .eq("series_id", seriesId)
      .order("round_number", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("세션 참가자 전적을 불러오지 못했습니다.");
    rounds.push(...data);
    if (data.length < pageSize) return rounds;
  }
}

export async function ClanBalanceRoomData({ gameSlug, clanId, room }: {
  gameSlug: string;
  clanId: string;
  room: Database["public"]["Tables"]["balance_rooms"]["Row"];
}) {
  const supabase = await getRequestClient();
  const user = await getRequestUser();
  if (!user) {
    return null;
  }

  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) {
    return null;
  }


  const planPremium = ctx.plan === "premium";
  const staff = ctx.role === "leader" || ctx.role === "officer";
  const scorePermission = await hasRequestClanPermission(clanId, "edit_mscore");
  const canViewScores = (staff || scorePermission) && room.kind === "regular";
  const canViewHistory =
    staff ||
    (room.kind === "flash" &&
      room.created_by === user.id &&
      ctx.role === "member");

  const [{ data: session }, { data: series }, { data: recentRounds }, sessionRounds] =
    await Promise.all([
      supabase
        .from("balance_sessions")
        .select("*")
        .eq("clan_id", clanId)
        .eq("series_id", room.series_id!)
        .is("closed_at", null)
        .maybeSingle(),
      supabase
        .from("balance_session_series")
        .select("*")
        .eq("clan_id", clanId)
        .eq("id", room.series_id!)
        .maybeSingle(),
      canViewHistory ? supabase
        .from("balance_sessions")
        .select("roster, opened_at")
        .eq("clan_id", clanId)
        .in("match_outcome", ["team1", "team2", "draw"])
        .order("opened_at", { ascending: false })
        .limit(100) : Promise.resolve({ data: [] }),
      // Keep participant summaries behind the same boundary as session history.
      canViewHistory
        ? loadSeriesRounds(supabase, clanId, room.series_id!)
        : Promise.resolve([]),
    ]);
  if (!session || !series || series.closed_at) redirect(`/games/${gameSlug}/clan/${clanId}/balance`);
  // All reads below depend on the current round, but not on each other.
  // Start them together so every real-time refresh avoids a request waterfall.
  const [
    canManage, scoredResult, analysisResult,
    { data: profilePreference }, { data: roundPreference },
    { data: votes }, { data: heroVotes }, { data: balancePredictions },
    poolResult, { data: rosterPoolRows }, { data: hostRow },
  ] = await Promise.all([
    canManageRound(supabase, user.id, clanId, session.id),
    canViewScores ? supabase.from("balance_sessions")
      .select("ma_snapshot,balance_session_series!inner(balance_rooms!inner(kind))")
      .eq("clan_id", clanId).eq("balance_session_series.balance_rooms.kind", "regular")
      .order("opened_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canViewScores && planPremium && session.phase !== "match_live"
      ? supabase.rpc("read_balance_analysis_context", { p_round_id: session.id, p_clan_id: clanId })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("profile_role_preferences").select("ranking")
      .eq("user_id", user.id).eq("game_id", session.game_id).maybeSingle(),
    supabase.from("balance_round_role_preferences").select("ranking")
      .eq("user_id", user.id).eq("round_id", session.id).maybeSingle(),
    supabase.from("balance_session_map_votes").select("session_id,user_id,choice_idx")
      .eq("session_id", session.id),
    session.phase === "hero_ban"
      ? supabase.from("balance_session_hero_votes").select("session_id,user_id,pick_1,pick_2,pick_3").eq("session_id", session.id)
      : Promise.resolve({ data: [] }),
    session.phase === "match_live"
      ? supabase.from("balance_session_predictions").select("*").eq("session_id", session.id)
      : Promise.resolve({ data: [] }),
    session.prediction_pool_enabled && room.kind === "regular" && planPremium
      ? supabase.rpc("read_balance_prediction_pool", { p_session_id: session.id })
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc("list_balance_roster_pool", { p_clan_id: clanId }),
    session.host_user_id
      ? supabase.from("users").select("nickname").eq("id", room.delegated_to ?? room.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const canEditMscore = canViewScores && (canManage || scorePermission);
  let analysisContext: ReturnType<typeof parseAnalysisContext> | undefined;
  const scores: MaSnapshot = {};
  if (analysisResult.error) throw new Error("분석 점수를 불러오지 못했습니다.");
  if (scoredResult.error) throw new Error("참가자 점수를 불러오지 못했습니다.");
  if (poolResult.error) throw new Error("승부예측 정보를 불러오지 못했습니다.");
  if (canViewScores) {
    if (planPremium && session.phase !== "match_live") analysisContext = parseAnalysisContext(analysisResult.data);
    for (const round of scoredResult.data ?? []) {
      for (const [id, score] of Object.entries(parseMaSnapshot(round.ma_snapshot))) {
        if (!(id in scores)) scores[id] = score;
      }
    }
    Object.assign(scores, parseMaSnapshot(session.ma_snapshot));
    if (!planPremium) for (const score of Object.values(scores)) score.a = null;
  }
  const predictionPool: PredictionPool | null = poolResult.data == null ? null : parsePredictionPool(poolResult.data);
  const recency = new Map<string, number>();
  (recentRounds ?? []).forEach((round, index) =>
    rosterAssignedUserIds(parseRoster(round.roster)).forEach((id) => {
      if (!recency.has(id)) recency.set(id, index);
    }),
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
  const playerSessionInfo = canViewHistory
    ? buildPlayerSessionInfo(
        sessionRounds,
        rosterPool.map((player) => player.user_id),
      )
    : undefined;
  const visibleSessionScores = canViewScores
    ? parseMaSnapshot(session.ma_snapshot)
    : {};
  if (!planPremium) {
    for (const score of Object.values(visibleSessionScores)) score.a = null;
  }

  const hostNickname = hostRow?.nickname ?? null;

  // Request-time clock aligns the initial reveal on this authenticated server page.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return (
    <div className="space-y-3">
      <Link href={`/games/${gameSlug}/clan/${clanId}/balance`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />내전 로비</Link>

      <ClanBalanceSessionPanel
        key={session.id}
        gameSlug={gameSlug}
        clanId={clanId}
        userId={user.id}
        canManage={canManage}
        canViewHistory={canViewHistory}
        historyScope={staff ? "clan" : "session"}
        flash={room.kind === "flash"}
        canViewScores={canViewScores}
        scores={scores}
        analysisContext={analysisContext}
        playerSessionInfo={playerSessionInfo}
        hostNickname={hostNickname}
        roomTitle={room.title}
        session={{ ...session, ma_snapshot: visibleSessionScores }}
        series={series}
        profileRanking={parseRoleRanking(profilePreference?.ranking)}
        roundRanking={
          roundPreference ? parseRoleRanking(roundPreference.ranking) : null
        }
        serverNow={serverNow}
        votes={votes ?? []}
        heroVotes={heroVotes ?? []}
        balancePredictions={balancePredictions ?? []}
        predictionPool={predictionPool}
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
