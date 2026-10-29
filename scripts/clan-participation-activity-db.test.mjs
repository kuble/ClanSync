import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }

test("daily participation uses recorded games and exact 4/8-week boundaries at KST midnight", async t => {
  const f = await createIsolatedBalanceFixture(9), cutoff = Date.parse("2026-10-29T15:00:00Z"), day = 86_400_000;
  const ago = days => new Date(cutoff - days * day).toISOString();
  const clients = await Promise.all([f.memberClient(0), f.memberClient(1)]);
  t.after(async () => { await Promise.all(clients.map(c => c.auth.signOut())); await f.cleanup(); });
  const env = loadTestEnv(), anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await ok(f.service.from("clan_members").update({ joined_at: ago(90), last_activity_at: new Date().toISOString() }).eq("clan_id", f.clanId));
  for (const [index, days] of [[3,27],[4,28],[5,56]]) await ok(f.service.from("clan_members").update({ joined_at: ago(days) }).eq("clan_id", f.clanId).eq("user_id", f.users[index].id));
  await ok(f.service.from("clan_members").update({ joined_at: null, created_at: ago(40) }).eq("clan_id", f.clanId).eq("user_id", f.users[8].id));
  const rows = async () => new Map((await ok(f.service.from("clan_members").select("user_id,participation_status,last_participated_at,participation_checked_on,last_activity_at").eq("clan_id", f.clanId))).map(r => [r.user_id,r]));
  const refresh = (at = new Date(cutoff).toISOString(), client = f.service) => client.rpc("refresh_clan_member_participation", { p_clan_id: f.clanId, p_at: at });
  async function match(index, time, type = "intra", result = true) {
    const id = randomUUID();
    await ok(f.service.from("matches").insert({ id, clan_id: f.clanId, game_id: f.gameId, played_at: time, match_type: type, status: "finished" }));
    await ok(f.service.from("match_players").insert([{ match_id: id, user_id: f.users[index].id, team: 1 },{ match_id: id, user_id: f.users[6].id, team: 2 }]));
    if (result) await ok(f.service.from("match_results").insert({ match_id: id, winner_team: 1 }));
    return id;
  }
  const recent = await match(0, new Date(cutoff - 28 * day + 1).toISOString());
  await match(1, ago(28)); await match(2, ago(56));
  await match(5, ago(1), "scrim"); await match(5, ago(1), "intra", false); await match(2, ago(-1));
  const series = randomUUID();
  await ok(f.service.from("balance_session_series").insert({ id: series, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: ago(2), closed_at: ago(1) }));
  await ok(f.service.from("balance_rooms").update({ kind: "flash", status: "closed", title: "참여 판정 검증" }).eq("id", series));
  const flash = randomUUID();
  await ok(f.service.from("balance_sessions").insert({ id: flash, series_id: series, round_number: 1, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: ago(2), closed_at: ago(1), phase: "match_live", match_outcome: "draw", prediction_pool_enabled: false, roster: { team1: { tank: f.users[7].id, dmg: [], sup: [] }, team2: { tank: f.users[6].id, dmg: [], sup: [] } } }));
  await ok(f.service.from("balance_sessions").insert({ id: randomUUID(), series_id: series, round_number: 2, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: ago(1), phase: "map_ban", match_outcome: "pending", prediction_pool_enabled: false, roster: { team1: { tank: f.users[5].id, dmg: [], sup: [] }, team2: { tank: f.users[6].id, dmg: [], sup: [] } } }));
  await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[6].id));

  await t.test("only the service can run the daily job or forge participation state", async () => {
    for (const client of [...clients, anon]) assert.ok((await refresh(undefined, client)).error);
    const direct = await clients[0].from("clan_members").update({ participation_status: "dormant" }).eq("clan_id", f.clanId).select();
    assert.ok(direct.error || !direct.data?.length);
  });
  await t.test("28 and 56 days, no-history grace, missing join dates and flash participation", async () => {
    await ok(refresh()); const current = await rows();
    for (const [index, state] of [[0,"active"],[1,"inactive"],[2,"dormant"],[3,"active"],[4,"inactive"],[5,"dormant"],[7,"active"],[8,"inactive"]]) {
      assert.equal(current.get(f.users[index].id).participation_status, state, `member ${index}`);
      assert.equal(current.get(f.users[index].id).participation_checked_on, "2026-10-30");
    }
    assert.equal(current.get(f.users[6].id).participation_checked_on, null);
    assert.equal(Date.parse(current.get(f.users[7].id).last_participated_at), Date.parse(ago(1)));
  });
  await t.test("a site visit does not reactivate a member or recalculate their snapshot", async () => {
    const before = await rows(); await ok(clients[1].rpc("record_clan_activity", { p_clan_id: f.clanId })); const after = await rows();
    assert.equal(after.get(f.users[1].id).participation_status, "inactive");
    assert.equal(after.get(f.users[1].id).participation_checked_on, before.get(f.users[1].id).participation_checked_on);
  });
  await t.test("games after today's midnight enter the snapshot at the following midnight", async () => {
    await match(1, new Date(cutoff + 3_600_000).toISOString());
    await ok(refresh(new Date(cutoff + 12 * 3_600_000).toISOString()));
    assert.equal((await rows()).get(f.users[1].id).participation_status, "inactive");
    await ok(refresh(new Date(cutoff + day).toISOString()));
    assert.equal((await rows()).get(f.users[1].id).participation_status, "active");
  });
  await t.test("corrected/deleted games are recalculated instead of retaining a stale last appearance", async () => {
    await ok(f.service.from("matches").update({ played_at: ago(40) }).eq("id", recent)); await ok(refresh());
    assert.equal((await rows()).get(f.users[0].id).participation_status, "inactive");
    await ok(f.service.from("matches").delete().eq("id", recent)); await ok(refresh());
    assert.equal((await rows()).get(f.users[0].id).participation_status, "dormant");
    assert.equal((await rows()).get(f.users[0].id).last_participated_at, null);
  });
  await t.test("rejoining resets the participation grace period and clears the previous snapshot", async () => {
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    await ok(f.service.from("clan_members").update({ status: "active", joined_at: new Date(cutoff).toISOString() }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    const current = (await rows()).get(f.users[2].id);
    assert.equal(current.participation_status, "active"); assert.equal(current.participation_checked_on, null); assert.equal(current.last_participated_at, null);
    await ok(refresh()); assert.equal((await rows()).get(f.users[2].id).participation_status, "active");
  });
});
