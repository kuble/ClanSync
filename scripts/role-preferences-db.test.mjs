import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }

test("private role preferences, saved rules and draw history", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  let clanId;
  t.after(async () => {
    if (clanId) {
      await ok(svc.from("balance_sessions").delete().eq("clan_id", clanId));
      await ok(svc.from("balance_session_series").delete().eq("clan_id", clanId));
      await ok(svc.from("clans").delete().eq("id", clanId));
    }
    for (const user of users) {
      await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let i = 0; i < 2; i++) {
    const email = `role-${tag}-${i}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { nickname: `role_${tag}_${i}`, birth_year: 2000 } }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client });
    await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, member] = users;
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  clanId = (await ok(svc.from("clans").insert({ game_id: game.id, name: `Roles-${tag}` }).select("id").single())).id;
  await ok(svc.from("clan_members").insert(users.map((user, i) => ({ clan_id: clanId, user_id: user.id, role: i ? "member" : "leader", status: "active" }))));
  await ok(svc.from("user_game_profiles").insert(users.map((user, i) => ({ user_id: user.id, game_id: game.id, game_uid: `roles-${tag}-${i}`, is_verified: true }))));
  const { round_id: roundId } = await ok(leader.client.rpc("open_balance_session_series", { p_clan_id: clanId }));
  const roster = { team1: { tank: leader.id, dmg: [null,null], sup: [null,null] }, team2: { tank: member.id, dmg: [null,null], sup: [null,null] } };
  await ok(leader.client.from("balance_sessions").update({ roster }).eq("id", roundId));
  const read = () => ok(svc.from("balance_sessions").select("*").eq("id", roundId).single());
  const resolved = () => ok(svc.rpc("resolve_balance_role_preferences", { p_round_id: roundId }));
  const settings = { roles: "lottery", teams: "random", auctionBudget: 2000, minBid: 50, durationSeconds: 30 };
  const startArgs = (revision) => ({ p_round_id: roundId,p_clan_id: clanId,p_revision: revision,p_actor_id: leader.id,p_command: "start",
    p_roster: roster,p_state: { stage: "complete",mode: "random",settings,sourceRoster: roster,roster,
      draw: { id: randomUUID(),startedAt: Date.now(),durationMs: 4000,roleMode: "lottery" },
      order: users.map((user) => user.id),players: users.map((user) => ({ id: user.id,role: "tank" })) } });

  await t.test("profile defaults are self-only and absent preferences resolve to empty rankings", async () => {
    assert.deepEqual(await resolved(), { [leader.id]: [], [member.id]: [] });
    await ok(member.client.rpc("save_profile_role_preference", { p_game_id: game.id,p_ranking: ["sup","tank","dmg"] }));
    assert.deepEqual((await resolved())[member.id], ["sup","tank","dmg"]);
    assert.deepEqual(await ok(leader.client.from("profile_role_preferences").select("*").eq("user_id", member.id)), []);
    assert.equal((await ok(member.client.from("profile_role_preferences").select("*").eq("user_id", member.id))).length, 1);
    assert.equal((await leader.client.from("profile_role_preferences").upsert({ user_id: member.id,game_id: game.id,ranking: [] })).error?.code, "42501");
    for (const client of [anon,leader.client,member.client]) assert.equal((await client.rpc("resolve_balance_role_preferences", { p_round_id: roundId })).error?.code, "42501");
    assert.ok((await member.client.rpc("save_profile_role_preference", { p_game_id: game.id,p_ranking: ["tank","tank","sup"] })).error);
  });
  await t.test("round override is private, separates no-preference from profile fallback and never changes profile", async () => {
    await ok(member.client.rpc("save_round_role_preference", { p_round_id: roundId,p_ranking: [] }));
    assert.deepEqual((await resolved())[member.id], []);
    const profile = await ok(member.client.from("profile_role_preferences").select("ranking").eq("game_id",game.id).single());
    assert.deepEqual(profile.ranking, ["sup","tank","dmg"]);
    assert.deepEqual(await ok(leader.client.from("balance_round_role_preferences").select("*").eq("round_id",roundId)), []);
    await ok(member.client.rpc("save_round_role_preference", { p_round_id: roundId }));
    assert.deepEqual((await resolved())[member.id], ["sup","tank","dmg"]);
    await ok(leader.client.from("balance_sessions").update({ roster: { ...roster,team2: { ...roster.team2,tank: null } } }).eq("id",roundId));
    assert.equal((await member.client.rpc("save_round_role_preference", { p_round_id: roundId,p_ranking: [] })).error?.code, "42501");
    await ok(leader.client.from("balance_sessions").update({ roster }).eq("id",roundId));
  });
  await t.test("only managers save bounded rules, and stale snapshots cannot start a draw", async () => {
    const revision = (await read()).formation_revision;
    const args = { p_round_id: roundId,p_revision: revision,p_settings: settings,p_map_ban: true,p_hero_ban: false };
    assert.equal((await member.client.rpc("set_balance_formation_settings",args)).error?.code, "42501");
    assert.ok((await leader.client.rpc("set_balance_formation_settings", { ...args,p_settings: { ...settings,auctionBudget: 10 } })).error);
    assert.ok((await leader.client.rpc("set_balance_formation_settings", { ...args,p_settings: { ...settings,captains: [leader.id,member.id] } })).error);
    assert.equal(await ok(leader.client.rpc("set_balance_formation_settings",args)), true);
    assert.equal(await ok(svc.rpc("commit_balance_formation",startArgs(revision))), false);
    const beforePreference = (await read()).formation_revision;
    await ok(member.client.rpc("save_profile_role_preference", { p_game_id: game.id,p_ranking: ["dmg","tank","sup"] }));
    assert.equal(await ok(svc.rpc("commit_balance_formation",startArgs(beforePreference))), false);
    assert.equal((await read()).formation_state, null);
  });
  await t.test("concurrent own override and draw start have exactly one valid ordering", async () => {
    const revision = (await read()).formation_revision;
    const [preference, draw] = await Promise.all([
      member.client.rpc("save_round_role_preference", { p_round_id: roundId,p_ranking: [] }),
      svc.rpc("commit_balance_formation",startArgs(revision)),
    ]);
    assert.equal(draw.error,null);
    if (draw.data) {
      assert.ok(preference.error);
      assert.match(preference.error.message,/편성/);
    } else {
      assert.equal(preference.error,null);
      assert.equal(await ok(svc.rpc("commit_balance_formation",startArgs((await read()).formation_revision))),true);
    }
    assert.ok((await member.client.rpc("save_round_role_preference", { p_round_id: roundId,p_ranking: [] })).error);
    const latest = await read();
    assert.equal(await ok(leader.client.rpc("set_balance_formation_settings", { p_round_id: roundId,p_revision: latest.formation_revision,p_settings: settings,p_map_ban: false,p_hero_ban: false })),false);
    await ok(leader.client.from("balance_sessions").update({ map_ban_enabled: false }).eq("id",roundId));
    assert.deepEqual((await read()).formation_state, latest.formation_state);
  });
  await t.test("shared draw history persists across reset and includes rules without rankings", async () => {
    const row = await read();
    assert.equal(row.draw_history.length,1);
    assert.deepEqual(row.draw_history[0].settings,{ ...settings,captains:null,auctionItemsEnabled:false,strategySeconds:30 });
    assert.equal(JSON.stringify(row.draw_history).includes("ranking"),false);
    assert.equal(JSON.stringify(row.draw_history).includes("preferences"),false);
    const args = { ...startArgs(row.formation_revision),p_command: "reset",p_state: null };
    assert.equal(await ok(svc.rpc("commit_balance_formation",args)),true);
    const reset = await read();
    assert.deepEqual(reset.draw_history.map((event) => event.event),["start","reset"]);
    assert.equal(reset.draw_history[0].draw.id,reset.draw_history[1].draw.id);
    assert.equal(await ok(svc.rpc("commit_balance_formation",startArgs(reset.formation_revision))),true);
    const restarted = await read();
    assert.equal(restarted.draw_history.length,3);
    assert.notEqual(restarted.draw_history[0].draw.id,restarted.draw_history[2].draw.id);
  });
  await t.test("next round keeps rules but clears own overrides and new captain selection", async () => {
    await ok(svc.from("balance_sessions").update({ match_outcome: "void" }).eq("id",roundId));
    const next = await ok(leader.client.rpc("next_balance_round", { p_clan_id: clanId,p_round_id: roundId }));
    const row = await ok(svc.from("balance_sessions").select("*").eq("id",next.round_id).single());
    assert.deepEqual(row.formation_settings,settings);
    assert.deepEqual(row.draw_history,[]);
    assert.equal(row.formation_state,null);
    assert.deepEqual(await ok(member.client.from("balance_round_role_preferences").select("*").eq("round_id",row.id)),[]);
  });
});
