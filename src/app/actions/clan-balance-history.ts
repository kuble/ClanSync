"use server";

import {
  balanceSessionDate,
  parsePublicDrawHistory,
  sortHistoryRounds,
  type BalanceHistoryData,
  type BalanceHistoryRound,
  type BalanceHistorySeries,
} from "@/lib/balance/history";
import { parseRoster } from "@/lib/balance/roster-schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type StoredSeries =
  Database["public"]["Tables"]["balance_session_series"]["Row"];
type StoredRound = Database["public"]["Tables"]["balance_sessions"]["Row"] & {
  draw_history?: unknown;
};
type HistoryResult =
  | { ok: true; data: BalanceHistoryData }
  | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicSeries(
  series: Pick<StoredSeries, "id" | "opened_at" | "closed_at" | "session_date">,
): BalanceHistorySeries {
  return {
    id: series.id,
    opened_at: series.opened_at,
    closed_at: series.closed_at,
    session_date: balanceSessionDate(series.session_date, series.opened_at),
  };
}

export async function loadBalanceHistoryAction(
  gameSlug: string,
  clanId: string,
  requestedSeriesId: string | null = null,
): Promise<HistoryResult> {
  if (
    !UUID.test(clanId) ||
    (requestedSeriesId !== null && !UUID.test(requestedSeriesId)) ||
    typeof gameSlug !== "string" ||
    !gameSlug ||
    gameSlug.length > 80
  )
    return { ok: false, error: "내전 기록 요청을 확인하세요." };
  try {
    // The cookie-scoped client preserves clan membership RLS for every read.
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };
    const { data: memberships, error: membershipError } = await client.rpc(
      "select_my_clan_membership", { p_clan_id: clanId },
    );
    const membership = memberships?.[0];
    if (membershipError || membership?.status !== "active" ||
      (membership.role !== "leader" && membership.role !== "officer")) {
      return { ok: false, error: "내전 기록은 운영진 이상만 확인할 수 있습니다." };
    }
    const { data: game, error: gameError } = await client
      .from("games")
      .select("id")
      .eq("slug", gameSlug)
      .maybeSingle();
    if (gameError || !game)
      return { ok: false, error: "게임을 확인할 수 없습니다." };
    const { data: recent, error } = await client
      .from("balance_session_series")
      .select("id,opened_at,closed_at,session_date")
      .eq("clan_id", clanId)
      .eq("game_id", game.id)
      .order("opened_at", { ascending: false })
      .order("id")
      .limit(30);
    if (error) return { ok: false, error: "내전 기록을 불러오지 못했습니다." };
    const series = (recent ?? []).map(publicSeries);
    let selected = requestedSeriesId
      ? series.find((row) => row.id === requestedSeriesId)
      : (series.find((row) => row.closed_at === null) ?? series[0]);
    if (requestedSeriesId && !selected) {
      const { data: requested, error: requestedError } = await client
        .from("balance_session_series")
        .select("id,opened_at,closed_at,session_date")
        .eq("id", requestedSeriesId)
        .eq("clan_id", clanId)
        .eq("game_id", game.id)
        .maybeSingle();
      if (requestedError || !requested)
        return { ok: false, error: "이 내전 기록을 볼 수 없습니다." };
      selected = publicSeries(requested);
      series.push(selected);
    }
    if (!selected)
      return { ok: true, data: { series, selectedSeriesId: null, rounds: [] } };
    const rounds: BalanceHistoryRound[] = [];
    // Page reads avoid silently truncating a long session at the Data API row limit.
    for (let offset = 0; ; offset += 200) {
      const { data: rows, error: roundError } = await client
        .from("balance_sessions")
        .select("*")
        .eq("series_id", selected.id)
        .eq("clan_id", clanId)
        .eq("game_id", game.id)
        .order("round_number")
        .order("id")
        .range(offset, offset + 199);
      if (roundError)
        return { ok: false, error: "라운드 기록을 불러오지 못했습니다." };
      for (const row of (rows ?? []) as StoredRound[]) {
        rounds.push({
          id: row.id,
          round_number: row.round_number,
          opened_at: row.opened_at,
          closed_at: row.closed_at,
          match_outcome: row.match_outcome,
          phase: row.phase,
          resolved_map_label: row.resolved_map_label,
          roster: parseRoster(row.roster),
          drawHistory: parsePublicDrawHistory(row.draw_history),
        });
      }
      if (!rows || rows.length < 200) break;
    }
    return {
      ok: true,
      data: {
        series,
        selectedSeriesId: selected.id,
        rounds: sortHistoryRounds(rounds),
      },
    };
  } catch {
    return {
      ok: false,
      error: "내전 기록을 불러오지 못했습니다. 다시 시도하세요.",
    };
  }
}
