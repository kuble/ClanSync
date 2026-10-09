import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { createIsolatedBalanceFixture } from "./isolated-balance-fixture";
import { loadClanStatsPage, loadClanStatsPeriod, loadClanStatsArchive, loadClanStatsDetail } from "../src/lib/clan/stats/load-clan-stats";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("stats read model stays exact across results, corrections, predictions, cascades and permission changes", async () => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const now = new Date("2026-10-09T12:00:00Z");
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(2);
    const seriesId = randomUUID(), roundIds = [randomUUID(), randomUUID(), randomUUID()];
    const explicitId = randomUUID();
    await ok(f.service.from("balance_session_series").insert({ id: seriesId, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: "2026-09-30T14:50:00Z", closed_at: "2026-10-01T17:00:00Z" }));
    // The series compatibility trigger creates its matching room.
    await ok(f.service.from("balance_rooms").update({ kind: "regular", title: "집계 검증", status: "closed" }).eq("id", seriesId));
    for (const [i, id] of roundIds.entries()) {
      await ok(f.service.from("balance_sessions").insert({
        id, series_id: seriesId, round_number: i + 1, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id,
        opened_at: `2026-10-01T0${i}:00:00Z`, phase: "map_ban", match_outcome: "pending", prediction_pool_enabled: false,
        hero_ban_enabled: true, map_ban_enabled: true, map_ban_deadline_at: new Date(Date.now() + 60_000).toISOString(), map_candidates: ["부산", "네팔", "오아시스"],
        roster: { team1: { tank: f.users[0].id, dmg: [null, null], sup: [null, null] }, team2: { tank: f.users[1].id, dmg: [null, null], sup: [null, null] } },
        ma_snapshot: { [f.users[0].id]: { m: 1.2, a: 2.3 }, [f.users[1].id]: { m: -0.5, a: null } },
      }));
      await ok(f.service.from("balance_session_map_votes").insert({ session_id: id, user_id: f.users[0].id, choice_idx: 1 }));
      await ok(f.service.from("balance_session_predictions").insert({ session_id: id, user_id: f.users[2].id, pick_team: i === 1 ? 3 : 1 }));
      await ok(f.service.from("balance_sessions").update({ phase: "match_live", map_ban_deadline_at: null, match_outcome: (["team1", "draw", "team2"] as const)[i], resolved_map_label: "부산",
        closed_at: `2026-10-01T0${i}:30:00Z`, predictions_settled_at: `2026-10-01T0${i}:20:00Z`, banned_heroes: i ? [] : ["ana"],
      }).eq("id", id));
    }
    await ok(f.service.from("matches").insert({ id: explicitId, clan_id: f.clanId, game_id: f.gameId, played_at: "2026-10-05T15:00:00Z", status: "finished" }));
    await ok(f.service.from("match_players").insert([{ match_id: explicitId, user_id: f.users[0].id, team: 1 }, { match_id: explicitId, user_id: f.users[1].id, team: 2 }]));
    await ok(f.service.from("match_results").insert({ match_id: explicitId, winner_team: 1 }));
    async function parity() {
      const [reference, summary] = await Promise.all([
        loadClanStatsPage(leader, f.users[0].id, f.clanId, { now }),
        loadClanStatsPage(leader, f.users[0].id, f.clanId, { now, deferDetails: true }),
      ]);
      expect(summary?.summary).toEqual(reference?.summary);
      expect(summary?.hof.periods).toEqual(reference?.hof.periods);
      expect(summary?.intraPeriods.all).toEqual(reference?.intraPeriods.all);
      for (const key of ["2026-09", "2026-10", "2026-09-30", "2026-10-06"]) {
        const period = await loadClanStatsPeriod(leader, f.clanId, key, now);
        expect(period?.kind).toBe("period");
        if (period?.kind === "period" && reference?.intraPeriods[key]) expect(period.intra).toEqual(reference.intraPeriods[key]);
      }
      return summary!;
    }
    expect((await parity()).summary.intraCount).toBe(4);
    await Promise.all([
      ok(f.service.from("match_results").update({ winner_team: 2 }).eq("match_id", explicitId)),
      ok(f.service.from("balance_session_predictions").update({ pool_settlement: "refund" }).eq("session_id", roundIds[1])),
    ]);
    await parity();
    // Explicit corrections mask the round while its predictions retain the session date.
    await ok(f.service.from("matches").insert({ id: roundIds[0], clan_id: f.clanId, game_id: f.gameId, played_at: "2026-10-06T15:00:00Z", status: "draft" }));
    expect((await parity()).summary.intraCount).toBe(3);
    await ok(f.service.from("balance_session_predictions").update({ pick_team: 2 }).eq("session_id", roundIds[0]));
    await parity();
    await ok(f.service.from("matches").delete().eq("id", roundIds[0]));
    expect((await parity()).summary.intraCount).toBe(4);
    await ok(f.service.from("matches").update({ played_at: "2026-08-01T15:00:00Z" }).eq("id", explicitId));
    await ok(f.service.from("match_players").delete().eq("match_id", explicitId).eq("user_id", f.users[1].id));
    await parity();
    await ok(f.service.from("match_results").delete().eq("match_id", explicitId));
    expect((await parity()).summary.intraCount).toBe(3);
    const archive = await loadClanStatsArchive(leader, f.clanId, "2026-08-02");
    expect(archive?.kind === "archive" && archive.archive.sampleByDate["2026-08-02"][0].outcome).toBe("unrecorded");
    await ok(f.service.from("balance_session_series").update({ opened_at: "2026-09-29T14:50:00Z" }).eq("id", seriesId));
    await parity();
    await ok(f.service.from("balance_rooms").update({ kind: "flash" }).eq("id", seriesId));
    expect((await parity()).summary.intraCount).toBe(0);
    await ok(f.service.from("balance_rooms").update({ kind: "regular" }).eq("id", seriesId));
    await parity();
    const env = loadTestEnv(), anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    for (const client of [member, anon]) {
      expect((await client.rpc("read_clan_stats_summary", { p_clan_id: f.clanId, p_periods: ["all"] })).error).not.toBeNull();
      expect((await client.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_day: "2026-09-29" })).error).not.toBeNull();
    }
    await ok(f.service.from("clan_settings").update({ hof_config: { monthly_rank_visibility: "month_start", yearly_rank_visibility: "year_start" } }).eq("clan_id", f.clanId));
    for (const key of ["2026", "2026-10", "2026-10-06"]) {
      const period = await loadClanStatsPeriod(member, f.clanId, key, now);
      expect(period?.kind === "period" && period.hof.undisclosed).toBe(true);
    }
    expect(await loadClanStatsDetail(member, f.users[2].id, f.clanId, f.users[0].id)).toBeNull();
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    expect(await loadClanStatsPage(member, f.users[2].id, f.clanId, { deferDetails: true })).toBeNull();
    expect(await loadClanStatsPeriod(member, f.clanId, "all")).toBeNull();
    await ok(f.service.from("balance_sessions").delete().in("id", roundIds));
    expect((await parity()).summary.intraCount).toBe(0);
  } finally { await f.cleanup(); }
});
