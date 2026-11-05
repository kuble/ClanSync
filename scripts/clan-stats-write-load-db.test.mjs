import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";
import { assertLocalWorkdir, checked, container } from "./local-tests/runtime.mjs";

// Physical-write/repair checks require the disposable local DB, never shared QA.
loadTestEnv();
async function sql(query) {
  assertLocalWorkdir();
  return checked("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: query });
}
async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("stats refresh avoids unchanged row rewrites and preserves milestone repair", async (t) => {
  const f = await createIsolatedBalanceFixture(3);
  t.after(() => f.cleanup());
  const ids = Array.from({ length: 10 }, () => randomUUID());
  const playedAt = (i) => new Date(Date.UTC(2026, 0, 10, 1, i)).toISOString();
  await ok(f.service.from("matches").insert(ids.map((id, i) => ({ id, clan_id: f.clanId, game_id: f.gameId, match_type: "intra", status: "finished", played_at: playedAt(i), map_label: "부산" }))));
  await ok(f.service.from("match_players").insert(ids.flatMap((match_id) => f.users.slice(0, 2).map((u, i) => ({ match_id, user_id: u.id, team: i + 1 })))));
  await ok(f.service.from("match_results").insert(ids.map((match_id, i) => ({ match_id, winner_team: i % 2 + 1 }))));
  const clan = `'${f.clanId}'::uuid`;
  const rows = () => sql(`select jsonb_agg(jsonb_build_object('period',period,'data',data,'location',ctid::text,'version',xmin::text) order by period) from private.clan_stats_periods where clan_id=${clan};`).then(JSON.parse);
  const milestones = () => ok(f.service.from("clan_personal_emblem_milestones").select("*").eq("clan_id", f.clanId).order("user_id").order("emblem_key"));
  const before = await rows(), earned = await milestones();
  assert.equal(earned.length, 2);
  for (const award of earned) {
    assert.equal(award.emblem_key, "milestone-matches-1");
    assert.equal(Date.parse(award.earned_at), Date.parse(playedAt(9)));
  }
  for (const player of before.find((row) => row.period === "all").data.players) {
    assert.equal(player.played, 10); assert.equal(player.wins, 5); assert.equal(player.longest, 1);
  }
  await t.test("unchanged refresh keeps physical summary rows and permanent awards", async () => {
    await sql(`select private.refresh_clan_stats(${clan},array['2026-01-10']); select private.refresh_clan_stats(${clan},array['2026-01-10']);`);
    assert.deepEqual(await rows(), before);
    assert.deepEqual(await milestones(), earned);
    assert.equal(await ok(f.service.rpc("refresh_clan_personal_emblem_milestones", { p_clan_id: f.clanId })), 0);
  });
  await t.test("a missing award is reconstructed from its original threshold date", async () => {
    for (const missingSummary of [false, true]) {
      const result = await sql(`begin;
        delete from public.clan_personal_emblem_milestones where clan_id=${clan} and user_id='${f.users[0].id}';
        ${missingSummary ? `delete from private.clan_stats_periods where clan_id=${clan} and period='all';` : ""}
        do $$ begin if private.refresh_clan_personal_emblem_milestones(${clan}) <> 1 then raise exception 'Expected one repaired award'; end if; end $$;
        select jsonb_agg(to_jsonb(m) order by user_id,emblem_key) from public.clan_personal_emblem_milestones m where clan_id=${clan}; rollback;`);
      const repaired = JSON.parse(result);
      assert.equal(repaired.length, earned.length);
      repaired.forEach((award, i) => assert.deepEqual({ ...award, earned_at: Date.parse(award.earned_at) }, { ...earned[i], earned_at: Date.parse(earned[i].earned_at) }));
    }
  });
  await t.test("new thresholds still award only their first qualifying match", async () => {
    const id = randomUUID();
    await ok(f.service.from("matches").insert({ id, clan_id: f.clanId, game_id: f.gameId, match_type: "intra", status: "finished", played_at: playedAt(10) }));
    await ok(f.service.from("match_players").insert({ match_id: id, user_id: f.users[0].id, team: 1 }));
    // Nine earlier consecutive wins plus this new win crosses the win threshold.
    await ok(f.service.from("match_results").update({ winner_team: 1 }).in("match_id", ids.slice(0, 9)));
    await ok(f.service.from("match_results").insert({ match_id: id, winner_team: 1 }));
    const winner = (await milestones()).filter((row) => row.user_id === f.users[0].id);
    assert.equal(Date.parse(winner.find((row) => row.emblem_key === "milestone-wins-1").earned_at), Date.parse(playedAt(10)));
    assert.equal(winner.find((row) => row.emblem_key === "milestone-streak-4"), undefined);
    assert.equal(Date.parse(winner.find((row) => row.emblem_key === "milestone-streak-3").earned_at), Date.parse(playedAt(6)));
    assert.equal(Date.parse(winner.find((row) => row.emblem_key === "milestone-matches-1").earned_at), Date.parse(playedAt(9)));
  });
});
