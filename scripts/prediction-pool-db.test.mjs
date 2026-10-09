import { test } from "node:test";
import assert from "node:assert/strict";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("coin pool reserves, refunds, pays exactly once and scopes public event rankings", async (t) => {
  const f = await createIsolatedBalanceFixture(14);
  t.after(() => f.cleanup());
  const [leader, a, b, c, outsider] = await Promise.all([0, 10, 11, 12, 13].map((i) => f.memberClient(i)));
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[13].id));
  await ok(f.service.from("users").update({ coin_balance: 100 }).in("id", f.users.slice(10, 13).map((u) => u.id)));
  const opened = await ok(leader.rpc("open_balance_session_series", { p_clan_id: f.clanId }));
  let id = opened.round_id;
  const ids = f.users.slice(0, 10).map((u) => u.id);
  const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
  await ok(leader.from("balance_sessions").update({ roster }).eq("id", id));
  const bet = (client, pick, stake) => client.rpc("place_balance_prediction_pool", { p_session_id: id, p_pick: pick, p_stake: stake });
  const pool = (client = a) => ok(client.rpc("read_balance_prediction_pool", { p_session_id: id }));
  const balance = async (index) => (await ok(f.service.from("users").select("coin_balance").eq("id", f.users[index].id).single())).coin_balance;
  const live = async () => {
    await ok(leader.from("balance_sessions").update({ resolved_map_label: "리장 타워" }).eq("id", id));
    await ok(f.service.from("balance_sessions").update({ phase: "match_live" }).eq("id", id));
  };
  const outcome = (value, client = leader) => client.rpc("set_balance_match_outcome", { p_session_id: id, p_outcome: value });
  const next = async () => { id = (await ok(leader.rpc("next_balance_round", { p_clan_id: f.clanId, p_round_id: id }))).round_id; };

  await t.test("editing accepts stake changes atomically; forged writes and private disclosure fail", async () => {
    assert.equal((await f.activeRound(opened.series_id)).prediction_pool_enabled, true);
    assert.equal((await f.activeRound(opened.series_id)).prediction_deadline_at, null);
    await ok(bet(a, 1, 10));
    assert.equal(await balance(10), 90);
    await ok(bet(a, 2, 20));
    assert.equal(await balance(10), 80);
    await ok(bet(a, 1, 5));
    assert.equal(await balance(10), 95);
    const before = await pool();
    for (const [pick, stake] of [[1, 101], [1, -1], [4, 1], [null, 1], [1, 1.5]]) assert.ok((await bet(a, pick, stake)).error);
    assert.deepEqual(await pool(), before, "failed requests must not change reserved coins");
    assert.ok((await bet(leader, 1, 1)).error, "players cannot bet");
    assert.ok((await bet(outsider, 1, 1)).error);
    assert.ok((await outsider.rpc("read_balance_prediction_pool", { p_session_id: id })).error);
    assert.ok((await a.from("balance_session_predictions").insert({ session_id: id, user_id: f.users[10].id, pick_team: 1, stake_coins: 1 })).error);
    assert.deepEqual(await ok(a.from("balance_session_predictions").update({ stake_coins: 0, payout_coins: 999 }).eq("session_id", id).select("user_id")), []);
    assert.deepEqual(await ok(a.from("balance_session_predictions").delete().eq("session_id", id).select("user_id")), []);
    assert.deepEqual(await ok(b.from("balance_session_predictions").select("user_id,pick_team").eq("session_id", id)), []);
    assert.equal((await pool(b)).total, 5);
    assert.equal((await pool(b)).mine, null);
    assert.equal((await pool(b)).balance, 100);
    await ok(bet(a, 1, 0));
    assert.equal(await balance(10), 100);
    assert.equal((await pool()).count, 0);
    await Promise.all([ok(bet(a, 1, 10)), ok(bet(a, 1, 10))]);
    assert.equal(await balance(10), 90, "simultaneous retries reserve once");
    await ok(bet(a, 1, 0));
    for (const tier of ["free", "premium"]) {
      await ok(f.service.from("clans").update({ subscription_tier: tier }).eq("id", f.clanId));
      if (tier === "free") assert.ok((await bet(a, 1, 1)).error);
    }
    await ok(f.service.from("balance_rooms").update({ kind: "flash" }).eq("series_id", opened.series_id));
    assert.ok((await bet(a, 1, 1)).error);
    await ok(f.service.from("balance_rooms").update({ kind: "regular" }).eq("series_id", opened.series_id));
    await ok(bet(a, 1, 7));
    const settings = (await f.activeRound(opened.series_id)).formation_settings;
    async function enable(value) {
      const r = await f.activeRound(opened.series_id);
      return ok(leader.rpc("set_balance_prematch_settings", { p_round_id: id, p_clan_id: f.clanId, p_revision: r.formation_revision, p_settings: { ...settings, predictionEnabled: value }, p_map_ban: r.map_ban_enabled, p_hero_ban: r.hero_ban_enabled, p_map_ban_seconds: r.map_ban_seconds, p_hero_ban_seconds: r.hero_ban_seconds, p_hero_bans_per_team: r.hero_bans_per_team, p_map_types: r.map_types }));
    }
    await enable(false);
    assert.equal(await balance(10), 100);
    assert.equal((await pool()).mine, null);
    assert.ok((await bet(a, 1, 1)).error);
    await enable(true);
    assert.ok((await leader.from("balance_sessions").update({ prediction_pool_enabled: false }).eq("id", id)).error);
  });

  await t.test("a spectator entering the lineup gets a refund before a shared five-minute deadline", async () => {
    await ok(bet(a, 1, 10));
    const replacement = structuredClone(roster);
    replacement.team1.tank = f.users[10].id;
    await ok(leader.from("balance_sessions").update({ roster: replacement }).eq("id", id));
    assert.equal(await balance(10), 100);
    assert.equal((await pool()).mine, null);
    assert.ok((await bet(a, 1, 10)).error);
    await ok(leader.from("balance_sessions").update({ roster }).eq("id", id));
    await ok(bet(a, 1, 10)); await ok(bet(b, 1, 20)); await ok(bet(c, 2, 30));
    assert.deepEqual((await pool()).teams, [30, 30, 0]);
    await live();
    const deadline = Date.parse((await f.activeRound(opened.series_id)).prediction_deadline_at);
    assert.ok(deadline - Date.now() > 290_000 && deadline - Date.now() <= 301_000, `deadline delta: ${deadline - Date.now()}ms`);
    await ok(leader.from("balance_sessions").update({ roster }).eq("id", id));
    assert.equal(Date.parse((await f.activeRound(opened.series_id)).prediction_deadline_at), deadline, "unrelated writes do not restart timer");
    await ok(f.service.from("balance_sessions").update({ prediction_deadline_at: new Date(Date.now() - 1000).toISOString() }).eq("id", id));
    assert.ok((await bet(a, 2, 10)).error);
    assert.ok((await bet(a, 1, 0)).error, "cannot cancel after cutoff");
    assert.equal((await ok(outcome("team1", a))).error, "forbidden");
    const clanBalance = (await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance;
    const attempts = await Promise.all([ok(outcome("team1")), ok(outcome("team1"))]);
    assert.equal(attempts.filter((r) => r.ok).length, 1);
    assert.deepEqual(await Promise.all([10, 11, 12].map(balance)), [110, 120, 70]);
    assert.equal((await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance, clanBalance, "pool settlement does not spend clan coins");
    const result = await pool(c);
    assert.equal(result.mine.settlement, "lose");
    assert.equal(result.ranking.length, 3);
    assert.deepEqual(result.ranking.map((r) => [r.hits, r.played, r.profit]), [[1, 1, 20], [1, 1, 10], [0, 1, -30]]);
    const payouts = await ok(f.service.from("balance_session_predictions").select("payout_coins").eq("session_id", id));
    assert.equal(payouts.reduce((sum, r) => sum + r.payout_coins, 0), 60);
    assert.equal((await ok(f.service.from("coin_transactions").select("amount").eq("reference_type", "balance_prediction_pool").eq("reference_id", id))).reduce((sum, r) => sum + r.amount, 0), 0);
    assert.equal((await ok(outcome("draw"))).error, "already_resolved");
  });

  await t.test("integer rounding, draws, voids and no-hit outcomes conserve every coin", async () => {
    await next();
    await ok(bet(a, 1, 1)); await ok(bet(b, 1, 1)); await ok(bet(c, 2, 1));
    await live(); await ok(outcome("team1"));
    const payouts = await ok(f.service.from("balance_session_predictions").select("user_id,payout_coins").eq("session_id", id).order("user_id"));
    const winners = payouts.filter((r) => r.user_id !== f.users[12].id);
    assert.deepEqual(winners.map((r) => r.payout_coins), [2, 1]);
    for (const value of ["draw", "void", "team2"]) {
      await next();
      const balances = await Promise.all([10, 11, 12].map(balance));
      await ok(bet(a, value === "draw" ? 3 : 1, 4)); await ok(bet(c, 1, 6));
      await live(); assert.equal((await ok(outcome(value))).ok, true);
      const current = await pool();
      if (value === "draw") { assert.equal(current.mine.payout, 10); assert.equal(current.mine.settlement, "win"); }
      else { assert.equal(current.mine.payout, 4); assert.equal(current.mine.settlement, "refund"); assert.deepEqual(await Promise.all([10, 11, 12].map(balance)), balances); }
      assert.equal((await ok(f.service.from("balance_session_predictions").select("payout_coins").eq("session_id", id))).reduce((sum, r) => sum + r.payout_coins, 0), 10);
    }
    const ranking = (await pool()).ranking;
    assert.equal(ranking.find((r) => r.user_id === f.users[10].id).played, 3, "refunds do not count as incorrect predictions");
  });

  await t.test("unstarted close and deletion return reserved coins; new sessions reset rankings", async () => {
    await next();
    const before = await balance(10);
    await ok(bet(a, 1, 7));
    assert.equal((await ok(leader.rpc("close_balance_session_series", { p_clan_id: f.clanId, p_round_id: id }))).ok, true);
    assert.equal(await balance(10), before);
    const reopened = await ok(leader.rpc("open_balance_session_series", { p_clan_id: f.clanId }));
    id = reopened.round_id;
    assert.deepEqual((await pool()).ranking, []);
    await ok(bet(a, 1, 7));
    await ok(f.service.from("balance_sessions").delete().eq("id", id));
    assert.equal(await balance(10), before);
  });

  await t.test("historical fixed-reward rounds keep their original settlement", async () => {
    const series = await ok(f.service.from("balance_session_series").insert({ clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id }).select("id").single());
    const round = await ok(f.service.from("balance_sessions").insert({ clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, series_id: series.id, prediction_pool_enabled: false, phase: "match_live", resolved_map_label: "부산", roster, prediction_deadline_at: new Date(Date.now() + 60_000).toISOString() }).select("id").single());
    id = round.id;
    await ok(f.service.from("clans").update({ coin_balance: 20 }).eq("id", f.clanId));
    const before = await balance(10);
    assert.ok((await bet(a, 1, 1)).error);
    await ok(a.from("balance_session_predictions").insert({ session_id: id, user_id: f.users[10].id, pick_team: 1 }));
    assert.equal((await ok(outcome("team1"))).ok, true);
    assert.equal(await balance(10), before + 5);
    assert.equal((await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance, 15);
  });
});
