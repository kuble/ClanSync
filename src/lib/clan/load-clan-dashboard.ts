import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MainClanPlan } from "@/lib/clan/load-main-clan-context";
import type { ClanEventRecord } from "@/lib/clan/expand-clan-event-occurrences";
import {
  minGamesToQualify,
  resolveHofConfig,
} from "@/lib/clan/stats/hof-config";
import { toKstParts } from "@/lib/clan/stats/kst";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { normalizeClanMatchRecords } from "@/lib/clan/stats/normalize-clan-match-records";
import { loadDashboardRows } from "./load-dashboard-rows";
import { loadClanHistory } from "./load-clan-history";
import { readClanCommunityLinks, type ClanCommunityLinks } from "./community-links";

export type DashboardNotice = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  kind: "notice" | "poll";
  isPinned: boolean;
};

export type DashboardMvp = {
  rank: number;
  userId: string;
  nickname: string;
  percentage: number;
  tiedCount: number;
};

export type ClanDashboardModel = {
  notices: DashboardNotice[];
  rules: string | null;
  events: ClanEventRecord[];
  createdAt: string;
  completedIntraCount: number | null;
  previousMonth: string;
  communityLinks: ClanCommunityLinks;
  discordConnected: boolean | null;
  mvp: {
    winRate: DashboardMvp[];
    participation: DashboardMvp[];
    prediction: DashboardMvp[];
  };
  errors: {
    notices: boolean;
    rules: boolean;
    events: boolean;
    rankings: boolean;
  };
  now: string;
};

function topMvpRanks<T>(rows: T[], sameScore: (a: T, b: T) => boolean, describe: (row: T) => Omit<DashboardMvp, "rank" | "tiedCount">): DashboardMvp[] {
  return rows.slice(0, 3).map(row => ({
    ...describe(row),
    rank: rows.findIndex(candidate => sameScore(candidate, row)) + 1,
    tiedCount: rows.filter(candidate => sameScore(candidate, row)).length,
  }));
}

/** Authenticate membership before reading the legacy server-only event tables. */
export async function loadClanDashboard(
  supabase: SupabaseClient<Database>,
  clanId: string,
  plan: MainClanPlan,
  now = new Date(),
): Promise<ClanDashboardModel | null> {
  const membership = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  if (membership.error || membership.data?.[0]?.status !== "active")
    return null;
  const eventClient: SupabaseClient<Database> = createServiceRoleClient();
  const { y, m } = toKstParts(now);
  const monthStart = new Date(Date.UTC(y, m - 2, 1, -9));
  const monthEnd = new Date(Date.UTC(y, m - 1, 1, -9));
  const month = toKstParts(monthStart);
  const [clan, polls, events, settings, notices, history, discord] = await Promise.all([
    supabase
      .from("clans")
      .select("rules, created_at, discord_url, kakao_url")
      .eq("id", clanId)
      .maybeSingle(),
    eventClient
      .from("clan_polls")
      .select("id, title, created_at, deadline_at")
      .eq("clan_id", clanId)
      .eq("post_to_notice", true)
      .is("closed_at", null)
      .gt("deadline_at", now.toISOString())
      .lte("starts_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(3),
    eventClient
      .from("clan_events")
      .select(
        "id, title, kind, start_at, place, source, repeat, repeat_weekdays, repeat_time",
      )
      .eq("clan_id", clanId)
      .is("cancelled_at", null)
      .or(`repeat.neq.none,start_at.gte.${now.toISOString()}`)
      .order("start_at", { ascending: true })
      .limit(500),
    supabase
      .from("clan_settings")
      .select("hof_config,community_links")
      .eq("clan_id", clanId)
      .maybeSingle(),
    supabase
      .from("clan_notices")
      .select("id, title, content, is_pinned, created_at")
      .eq("clan_id", clanId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    loadClanHistory(eventClient, clanId),
    eventClient.from("clan_discord_connections").select("clan_id").eq("clan_id", clanId).maybeSingle(),
  ]);
  if (!clan.data) return null;

  const model: ClanDashboardModel = {
    notices: [
      ...(notices.data ?? []).map((notice): DashboardNotice => ({
        id: notice.id,
        title: notice.title,
        content: notice.content,
        createdAt: notice.created_at,
        kind: "notice",
        isPinned: notice.is_pinned,
      })),
      ...(polls.data ?? []).map((poll): DashboardNotice => ({
        id: poll.id,
        title: poll.title,
        content:
          "클랜원 여러분의 의견을 기다리고 있어요. 투표에서 내용을 확인하고 참여해 주세요.",
        createdAt: poll.created_at,
        kind: "poll",
        isPinned: false,
      })),
    ]
      .sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3),
    rules: clan.data.rules,
    events: events.data ?? [],
    createdAt: clan.data.created_at,
    completedIntraCount: history.completedRegular,
    previousMonth: `${month.y}년 ${month.m}월`,
    communityLinks: readClanCommunityLinks(settings.data?.community_links, settings.data ? clan.data : undefined),
    discordConnected: discord.error ? null : !!discord.data,
    mvp: { winRate: [], participation: [], prediction: [] },
    errors: {
      notices: !!polls.error || !!notices.error,
      rules: !!clan.error,
      events: !!events.error,
      rankings: !!settings.error,
    },
    now: now.toISOString(),
  };
  // expose_hof controls external sharing; this dashboard is gated to active members.
  // A settings read error cannot silently select different eligibility rules.
  if (settings.error || !settings.data) {
    model.errors.rankings = true;
    return model;
  }

  const [matches, nicknames, sessions, predictions] = await Promise.all([
    loadDashboardRows((from, to) => supabase
      .from("matches")
      .select(
        "id, played_at, match_type, status, map_label, match_players(user_id, team), match_results(winner_team)",
        {
          count: "exact",
        },
      )
      .eq("clan_id", clanId)
      .eq("match_type", "intra")
      .eq("status", "finished")
      .order("id")
      .range(from, to)),
    supabase.rpc("clan_peer_nicknames", { p_clan_id: clanId }),
    // Membership was checked above; only aggregates, never raw rounds, leave this loader.
    loadDashboardRows((from, to) => eventClient
      .from("balance_sessions")
      .select(
        "id, opened_at, closed_at, predictions_settled_at, resolved_map_label, roster, ma_snapshot, match_outcome, balance_session_series!inner(opened_at,balance_rooms!inner(kind))",
        { count: "exact" },
      )
      .eq("clan_id", clanId)
      .eq("balance_session_series.balance_rooms.kind", "regular")
      .neq("match_outcome", "pending")
      .order("id")
      .range(from, to)),
    plan === "premium"
      ? loadDashboardRows((from, to) => eventClient
          .from("balance_sessions")
          .select(
            "id, match_outcome, balance_session_predictions(user_id, pick_team), balance_session_series!inner(opened_at,balance_rooms!inner(kind))",
            { count: "exact" },
          )
          .eq("clan_id", clanId)
          .eq("balance_session_series.balance_rooms.kind", "regular")
          .in("match_outcome", ["team1", "team2", "draw"])
          .gte("balance_session_series.opened_at", monthStart.toISOString())
          .lt("balance_session_series.opened_at", monthEnd.toISOString())
          .order("id")
          .range(from, to))
      : Promise.resolve({ data: [], error: null, count: 0 }),
  ]);
  // Never award a winner from a truncated result set or failed request.
  if (
    matches.error ||
    nicknames.error ||
    predictions.error ||
    sessions.error ||
    (sessions.count ?? 0) > (sessions.data?.length ?? 0) ||
    (matches.count ?? 0) > (matches.data?.length ?? 0) ||
    (predictions.count ?? 0) > (predictions.data?.length ?? 0)
  ) {
    model.errors.rankings = true;
    return model;
  }
  const nick = new Map(
    (nicknames.data ?? []).map((row) => [row.user_id, row.nickname]),
  );
  const scores = new Map<
    string,
    { userId: string; played: number; decided: number; wins: number }
  >();
  const records = normalizeClanMatchRecords(
    matches.data ?? [],
    sessions.data ?? [],
  ).filter((record) => record.outcome !== "void");
  const monthly = records.filter((record) => {
    const playedAt = new Date(record.played_at).getTime();
    return playedAt >= monthStart.getTime() && playedAt < monthEnd.getTime();
  });
  for (const match of monthly) {
    const winner = match.match_results?.winner_team;
    for (const player of match.match_players) {
      const score = scores.get(player.user_id) ?? {
        userId: player.user_id,
        played: 0,
        decided: 0,
        wins: 0,
      };
      score.played++;
      if (winner != null) {
        score.decided++;
        if (player.team === winner) score.wins++;
      }
      scores.set(player.user_id, score);
    }
  }
  const minimum = minGamesToQualify(
    monthly.length,
    resolveHofConfig(settings.data?.hof_config),
  );
  const eligible = [...scores.values()].filter(
    (score) => score.played >= minimum && nick.has(score.userId),
  );
  const byWin = eligible
    .filter((score) => score.decided > 0)
    .toSorted(
      (a, b) =>
        b.wins / b.decided - a.wins / a.decided ||
        b.wins - a.wins ||
        a.userId.localeCompare(b.userId),
    );
  const byParticipation = eligible.toSorted(
    (a, b) => b.played - a.played || a.userId.localeCompare(b.userId),
  );
  model.mvp.winRate = topMvpRanks(byWin,
    (a, b) => a.wins / a.decided === b.wins / b.decided && a.wins === b.wins,
    win => ({
      userId: win.userId,
      nickname: nick.get(win.userId)!,
      percentage: win.wins / win.decided * 100,
    }));
  model.mvp.participation = topMvpRanks(byParticipation,
    (a, b) => a.played === b.played,
    participant => ({
      userId: participant.userId,
      nickname: nick.get(participant.userId)!,
      percentage: participant.played / monthly.length * 100,
    }));
  const predictionScores = new Map<
    string,
    { userId: string; correct: number; total: number }
  >();
  for (const session of predictions.data ?? []) {
    const winner = session.match_outcome === "team1" ? 1 : session.match_outcome === "team2" ? 2 : 3;
    for (const prediction of session.balance_session_predictions) {
      const score = predictionScores.get(prediction.user_id) ?? {
        userId: prediction.user_id,
        correct: 0,
        total: 0,
      };
      score.total++;
      if (prediction.pick_team === winner) score.correct++;
      predictionScores.set(prediction.user_id, score);
    }
  }
  const rankedPredictions = [...predictionScores.values()]
    .filter((score) => score.correct > 0 && nick.has(score.userId))
    .sort(
      (a, b) =>
        b.correct / b.total - a.correct / a.total ||
        b.correct - a.correct ||
        a.userId.localeCompare(b.userId),
    );
  model.mvp.prediction = topMvpRanks(rankedPredictions,
    (a, b) => a.correct === b.correct && a.total === b.total,
    prediction => ({
      userId: prediction.userId,
      nickname: nick.get(prediction.userId)!,
      percentage: prediction.correct / prediction.total * 100,
    }));
  return model;
}
