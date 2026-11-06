import { loadClanPlayerNames } from "@/lib/game-auth/load-game-player-names";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { canManageRound } from "@/lib/balance/room-access";
import { ClanBalanceSessionPanel } from "@/components/main-clan/clan-balance-session-panel";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import type { Database } from "@/lib/supabase/database.types";
import { parseRoleRanking } from "@/lib/balance/role-preferences";
import { parseMaSnapshot } from "@/lib/balance/ma-snapshot";
import { loadBalanceScoreData } from "@/lib/balance/load-balance-score-data";
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
  const linkedAccountsPromise = Promise.resolve(supabase.from("clan_participants").select("id,user_id").eq("clan_id", clanId).eq("is_guest", true).not("user_id", "is", null)).then(result => {
    if (result.error) throw new Error("참가자 연결 정보를 불러오지 못했습니다.");
    return new Map<string, string>((result.data ?? []).map(row => [row.id, row.user_id!]));
  });
  const scoreData = loadBalanceScoreData(supabase, clanId, session, canViewScores, planPremium, linkedAccountsPromise);
  const [
    canManage,
    { data: profilePreference }, { data: roundPreference },
    { data: votes }, { data: heroVotes }, { data: balancePredictions },
    poolResult, { data: rosterPoolRows }, { data: hostRow }, linkedAccounts,
  ] = await Promise.all([
    canManageRound(supabase, user.id, clanId, session.id),
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
    loadClanPlayerNames(clanId, [room.delegated_to ?? room.created_by].filter((id): id is string => !!id))
      .then(names => ({ data: { nickname: names.get((room.delegated_to ?? room.created_by)!) ?? null } })),
    linkedAccountsPromise,
  ]);
  const canEditMscore = canViewScores && (canManage || scorePermission);
  if (poolResult.error) throw new Error("승부예측 정보를 불러오지 못했습니다.", { cause: poolResult.error });
  const predictionPool: PredictionPool | null = poolResult.data == null ? null : parsePredictionPool(poolResult.data);
  const recency = new Map<string, number>();
  (recentRounds ?? []).forEach((round, index) =>
    rosterAssignedUserIds(parseRoster(round.roster)).forEach((id) => {
      if (!recency.has(id)) recency.set(id, index);
      const account = linkedAccounts.get(id);
      if (account && !recency.has(account)) recency.set(account, index);
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
  const scoreScope = [user.id, clanId, session.id, canViewScores, planPremium, session.phase,
    createHash("sha256").update(JSON.stringify(visibleSessionScores)).digest("hex")].join(":");

  const hostNickname = (room.delegated_to ?? room.created_by)
    ? hostRow?.nickname ?? "게임 ID 미등록"
    : session.operator_name ?? null;

  // Request-time clock aligns the initial reveal on this authenticated server page.
  // eslint-disable-next-line react-hooks/purity -- 인증된 비동기 서버 요청의 현재 시각
  const serverNow = Date.now();
  return (
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
      scoreData={scoreData}
      scoreScope={scoreScope}
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
        (process.env.NEXT_PUBLIC_SUPABASE_URL ===
          "https://moretvteewfcztxvwztw.supabase.co" ||
          (process.env.CLANSYNC_E2E === "1" &&
            process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55431"))
      }
    />
  );
}
