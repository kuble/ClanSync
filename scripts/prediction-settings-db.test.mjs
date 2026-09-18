import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("round prediction settings enforce Premium, persistence and spectator RLS", async (t) => {
  const tag = randomUUID().slice(0, 8), users = [];
  let clanId, roundId, seriesId;
  t.after(async () => {
    if (clanId) {
      await ok(svc.from("balance_sessions").delete().eq("clan_id", clanId));
      await ok(svc.from("balance_session_series").delete().eq("clan_id", clanId));
      await ok(svc.from("clans").delete().eq("id", clanId));
    }
    for (const user of users) {
      if (user.client) await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let i = 0; i < 12; i++) {
    const email = `prediction-setting-${tag}-${i}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { nickname: `pred_${tag}_${i}`, birth_year: 2000 } }));
    const client = i < 3 ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options) : null;
    users.push({ id: user.id, client });
    if (client) await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, spectator, outsider] = users;
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  clanId = (await ok(svc.from("clans").insert({ game_id: game.id, name: `Prediction-${tag}` }).select("id").single())).id;
  await ok(svc.from("clan_members").insert(users.filter((_, i) => i !== 2).map((user, i) => ({
    clan_id: clanId, user_id: user.id, role: i ? "member" : "leader", status: "active",
  }))));
  ({ round_id: roundId, series_id: seriesId } = await ok(leader.client.rpc("open_balance_session_series", { p_clan_id: clanId })));
  const ids = [leader, ...users.slice(3)].map((user) => user.id);
  const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) },
    team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
  await ok(leader.client.from("balance_sessions").update({ roster }).eq("id", roundId));
  const read = () => ok(svc.from("balance_sessions").select("*").eq("id", roundId).single());
  const save = async (predictionEnabled, client = leader.client) => {
    const row = await read();
    return client.rpc("set_balance_prematch_settings", {
      p_round_id: roundId, p_clan_id: clanId, p_revision: row.formation_revision,
      p_settings: { ...row.formation_settings, predictionEnabled },
      p_map_ban: row.map_ban_enabled, p_hero_ban: row.hero_ban_enabled,
      p_map_ban_seconds: row.map_ban_seconds, p_hero_ban_seconds: row.hero_ban_seconds,
      p_hero_bans_per_team: row.hero_bans_per_team, p_map_types: row.map_types,
    });
  };
  const setTier = (subscription_tier) => ok(svc.from("clans").update({ subscription_tier }).eq("id", clanId));
  const live = async () => {
    await ok(leader.client.from("balance_sessions").update({ resolved_map_label: "리장 타워" }).eq("id", roundId));
    await ok(svc.from("balance_sessions").update({ phase: "match_live", roster,
      prediction_deadline_at: new Date(Date.now() + 60_000).toISOString() }).eq("id", roundId));
  };
  const prediction = (client, id, pick_team = 1) => client.from("balance_session_predictions").upsert({
    session_id: roundId, user_id: id, pick_team,
  }, { onConflict: "session_id,user_id" });

  await t.test("Free clans retain legacy defaults but cannot toggle through a forged request", async () => {
    assert.equal(await ok(save(true)), true);
    assert.match((await save(false)).error?.message ?? "", /Premium/);
    assert.ok((await save("false")).error);
    for (const user of [spectator, outsider]) assert.ok((await save(false, user.client)).error);
    assert.ok((await leader.client.from("balance_sessions").update({
      formation_settings: { ...(await read()).formation_settings, predictionEnabled: false },
    }).eq("id", roundId)).error);
    assert.equal((await read()).formation_settings.predictionEnabled, true);
  });

  await t.test("Premium manager changes prediction without resetting completed formation", async () => {
    await setTier("premium");
    const formation = { stage: "complete", roster, sourceRoster: roster, mode: "keep", appliedAt: Date.now() };
    await ok(svc.from("balance_sessions").update({ formation_state: formation }).eq("id", roundId));
    assert.equal(await ok(save(false)), true);
    assert.equal((await read()).formation_settings.predictionEnabled, false);
    assert.deepEqual((await read()).formation_state, formation);
  });

  await t.test("disabled prediction blocks inserts, updates and upserts at the database boundary", async () => {
    await live();
    assert.ok((await prediction(spectator.client, spectator.id)).error);
    await ok(svc.from("balance_session_predictions").insert({ session_id: roundId, user_id: spectator.id, pick_team: 1 }));
    assert.deepEqual(await ok(spectator.client.from("balance_session_predictions").update({ pick_team: 2 })
      .eq("session_id", roundId).eq("user_id", spectator.id).select("pick_team")), []);
    assert.ok((await prediction(spectator.client, spectator.id, 2)).error);
    assert.equal((await ok(svc.from("balance_session_predictions").select("pick_team").eq("session_id", roundId).single())).pick_team, 1);
    assert.equal(await ok(save(true)), false, "prediction cannot be changed after match starts");
  });

  await t.test("disabled option carries into next round and legacy RPC cannot enable it on Free", async () => {
    assert.equal((await ok(leader.client.rpc("set_balance_match_outcome", { p_session_id: roundId, p_outcome: "void" }))).ok, true);
    ({ round_id: roundId } = await ok(leader.client.rpc("next_balance_round", { p_clan_id: clanId, p_round_id: roundId })));
    assert.equal((await read()).formation_settings.predictionEnabled, false);
    await setTier("free");
    assert.equal(await ok(save(false)), true, "unchanged inherited false remains saveable");
    assert.match((await save(true)).error?.message ?? "", /Premium/);
    const row = await read();
    const { roles, teams, auctionBudget, minBid, durationSeconds } = row.formation_settings;
    const legacy = await leader.client.rpc("set_balance_formation_settings", {
      p_round_id: roundId, p_revision: row.formation_revision,
      p_settings: { roles, teams, auctionBudget, minBid, durationSeconds }, p_map_ban: false, p_hero_ban: false,
    });
    assert.match(legacy.error?.message ?? "", /Premium/);
    assert.equal((await read()).formation_settings.predictionEnabled, false);
  });

  await t.test("enabled predictions preserve Premium, regular, spectator and deadline restrictions", async () => {
    await setTier("premium");
    assert.equal(await ok(save(true)), true);
    await live();
    await ok(prediction(spectator.client, spectator.id));
    assert.ok((await prediction(leader.client, leader.id)).error);
    assert.ok((await prediction(outsider.client, outsider.id)).error);
    assert.ok((await prediction(spectator.client, leader.id)).error);
    await ok(svc.from("balance_rooms").update({ kind: "flash" }).eq("series_id", seriesId));
    assert.ok((await prediction(spectator.client, spectator.id, 2)).error);
    await ok(svc.from("balance_rooms").update({ kind: "regular" }).eq("series_id", seriesId));
    await setTier("free");
    assert.ok((await prediction(spectator.client, spectator.id, 2)).error);
    await setTier("premium");
    await ok(svc.from("balance_sessions").update({ prediction_deadline_at: new Date(Date.now() - 1_000).toISOString() }).eq("id", roundId));
    assert.ok((await prediction(spectator.client, spectator.id, 2)).error);
  });
});
