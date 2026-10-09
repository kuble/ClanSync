import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createIsolatedBalanceFixture } from "./isolated-balance-fixture";
import { loadClanStatsPage, loadClanStatsPageFromRecords, loadClanStatsArchive } from "../src/lib/clan/stats/load-clan-stats";

test("statistics scale benchmark uses an isolated 10,000-match clan", async () => {
  test.skip(process.env.STATS_BENCHMARK !== "1", "Opt-in isolated scale benchmark");
  test.setTimeout(600_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const ids = Array.from({ length: 10_000 }, () => randomUUID());
  try {
    for (let from = 0; from < ids.length; from += 250) {
      const batch = ids.slice(from, from + 250);
      const batchStarted = performance.now();
      let operation = 0;
      for (const result of [
        await fixture.service.from("matches").insert(batch.map((id, i) => ({
          id, clan_id: fixture.clanId, game_id: fixture.gameId, match_type: "intra" as const,
          status: "finished" as const, map_label: (from + i) % 2 ? "부산" : "네팔",
          played_at: new Date(Date.UTC(2024, 0, 1) + (from + i) * 3600_000).toISOString(),
        }))),
        await fixture.service.from("match_players").insert(batch.flatMap((id) => fixture.users.map((user, i) => ({ match_id: id, user_id: user.id, team: i < 5 ? 1 : 2 })))),
        await fixture.service.from("match_results").insert(batch.map((id, i) => ({ match_id: id, winner_team: (from + i) % 3 === 0 ? null : (from + i) % 2 + 1 }))),
      ]) {
        if (result.error) throw new Error(`Batch ${from}, operation ${operation}`, { cause: result.error });
        operation++;
      }
      console.log("STATS_IMPORT", from + batch.length, Math.round(performance.now()-batchStarted));
    }
    const client = await fixture.memberClient(0);
    const times: number[] = [];
    let bytes = 0;
    for (let i = 0; i < 3; i++) {
      const started = performance.now();
      const model = await loadClanStatsPage(client, fixture.users[0].id, fixture.clanId, { deferDetails: true });
      times.push(Math.round(performance.now() - started));
      expect(model?.summary.totalMatches).toBe(10_000);
      expect(model?.intraPeriods.all.completed).toBe(10_000);
      bytes = Buffer.byteLength(JSON.stringify(model));
    }
    console.log("STATS_SCALE", JSON.stringify({ matches: 10_000, players: 100_000, milliseconds: times, bytes }));
    const correctedAt = performance.now();
    const correction = await fixture.service.from("match_results").update({ winner_team: 2 }).eq("match_id", ids[0]);
    if (correction.error) throw correction.error;
    console.log("STATS_CORRECTION_MS", Math.round(performance.now() - correctedAt));
    const dayStarted = performance.now();
    const day = await loadClanStatsArchive(client, fixture.clanId, "2024-01-02");
    expect(day?.kind === "archive" && day.archive.sampleByDate["2024-01-02"].length).toBe(24);
    console.log("STATS_DAY", JSON.stringify({ milliseconds: Math.round(performance.now() - dayStarted), bytes: Buffer.byteLength(JSON.stringify(day)) }));
    if (process.env.STATS_COMPARE_REFERENCE === "1") {
      const started = performance.now();
      try {
        const reference = await loadClanStatsPageFromRecords(client, fixture.users[0].id, fixture.clanId, { deferDetails: true });
        console.log("STATS_REFERENCE", JSON.stringify({ milliseconds: Math.round(performance.now() - started), bytes: Buffer.byteLength(JSON.stringify(reference)) }));
        expect(reference?.summary.totalMatches).toBe(10_000);
      } catch (error) {
        console.log("STATS_REFERENCE", JSON.stringify({ milliseconds: Math.round(performance.now() - started), error: error instanceof Error ? error.cause ?? error.message : error }));
      }
    }
  } catch (error) { console.error("STATS_SCALE_ERROR", error); throw error;
  } finally {
    for (let from = 0; from < ids.length; from += 250) {
      const batch = ids.slice(from, from + 250);
      // Delete child rows in one statement instead of 250 FK cascade statements.
      for (const result of [
        await fixture.service.from("match_results").delete().in("match_id", batch),
        await fixture.service.from("match_players").delete().in("match_id", batch),
        await fixture.service.from("matches").delete().eq("clan_id", fixture.clanId).in("id", batch),
      ]) if (result.error) throw result.error;
    }
    await fixture.cleanup();
  }
});
