import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv(), options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
async function denied(query) { const { error } = await query; assert.ok(error, "Unauthorized or stale operation unexpectedly succeeded"); return error; }

test("membership departure and return preserve identity, records and permission boundaries", async (t) => {
  const tag = randomUUID().slice(0, 8), users = [], clans = [];
  t.after(async () => {
    for (const id of clans) { await ok(svc.from("balance_sessions").delete().eq("clan_id", id)); await ok(svc.from("clans").delete().eq("id", id)); }
    for (const user of users) { await ok(user.client.auth.signOut()); await ok(svc.auth.admin.deleteUser(user.id)); }
  });
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  for (let i = 0; i < 4; i++) {
    const email = `membership-${tag}-${i}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { birth_year: 2000 } }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client }); await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, returning, member, outsider] = users;
  await ok(svc.from("user_game_profiles").insert(users.map((u) => ({ user_id: u.id, game_id: game.id, game_uid: `membership-${tag}-${u.id}`, battle_tag: `QA${u.id.replaceAll("-", "").slice(0, 12)}#1234`, is_verified: true }))));
  const clan = await ok(svc.from("clans").insert({ game_id: game.id, name: `Membership-${tag}`, subscription_tier: "premium" }).select("id").single()); clans.push(clan.id);
  await ok(svc.from("clan_members").insert(users.slice(0, 3).map((u, i) => ({ clan_id: clan.id, user_id: u.id, status: "active", role: i === 0 ? "leader" : i === 1 ? "officer" : "member" }))));
  const change = (actor, action, target) => actor.rpc("change_clan_membership", { p_clan_id: clan.id, p_action: action, ...(target ? { p_user_id: target } : {}) });
  const read = () => ok(svc.from("clan_members").select("*").eq("clan_id", clan.id).eq("user_id", returning.id).single());
  const apply = () => ok(returning.client.from("clan_join_requests").insert({ clan_id: clan.id, game_id: game.id, user_id: returning.id }).select("id").single());
  const approve = (id, client = leader.client) => client.rpc("approve_clan_join_with_participant", { p_clan_id: clan.id, p_request_id: id });
  await ok(svc.rpc("edit_clan_match_record", { p_clan_id: clan.id, p_actor_id: leader.id, p_operation: "create", p_id: null, p_revision: null,
    p_record: { playedAt: "2026-10-01T10:00:00Z", occurredAt: "2026-10-01T10:00:00Z", mapLabel: "부산", outcome: "team1", players: [{ userId: returning.id, team: 1, role: "tank", m: 3.5, a: 0.8 }, { userId: leader.id, team: 2, role: "tank" }] } }));
  const records = () => ok(svc.rpc("read_clan_stats_records", { p_clan_id: clan.id, p_user_id: returning.id }));
  const original = await records(), membership = await read();
  assert.equal(original.length, 1);
  const coins = await ok(svc.from("users").select("id,coin_balance").in("id", users.map((u) => u.id)).order("id"));

  await t.test("only the owner can leave; leaders and inactive/foreign actors cannot", async () => {
    await denied(change(anon, "leave")); await denied(change(outsider.client, "leave"));
    assert.match((await denied(change(leader.client, "leave"))).message, /클랜장/);
    await denied(change(member.client, "leave", returning.id)); await denied(change(member.client, "kick", returning.id));
    await ok(change(returning.client, "leave"));
    const row = await read(); assert.equal(row.status, "left"); assert.equal(row.departure_kind, "left"); assert.ok(row.departed_at); assert.equal(row.id, membership.id);
    assert.equal(await ok(returning.client.rpc("is_active_clan_member", { p_clan_id: clan.id })), false);
    assert.ok((await ok(leader.client.rpc("clan_peer_nicknames", { p_clan_id: clan.id }))).some((u) => u.user_id === returning.id));
    assert.ok(!(await ok(leader.client.rpc("list_balance_roster_pool", { p_clan_id: clan.id }))).some((u) => u.user_id === returning.id));
    await denied(change(returning.client, "allow_rejoin", member.id));
    assert.deepEqual(await records(), original);
  });
  await t.test("approval restores the same membership and record subject as a regular member, once", async () => {
    const request = await apply();
    await denied(approve(request.id, outsider.client));
    const attempts = await Promise.all([approve(request.id), approve(request.id)]);
    assert.equal(attempts.filter((r) => !r.error).length, 1);
    const row = await read(); assert.equal(row.id, membership.id); assert.equal(row.role, "member"); assert.equal(row.status, "active");
    assert.equal(row.departed_at, null); assert.equal(row.departure_kind, null); assert.ok(Date.parse(row.joined_at) >= Date.parse(membership.joined_at));
    assert.equal((await ok(svc.from("clan_participants").select("id").eq("clan_id", clan.id).eq("id", returning.id))).length, 1);
    assert.deepEqual(await records(), original);
  });
  await t.test("returning approvals enforce capacity, registered game ID and another active clan", async () => {
    await ok(change(returning.client, "leave")); const request = await apply();
    await ok(svc.from("clans").update({ max_members: 2 }).eq("id", clan.id));
    assert.match((await denied(approve(request.id))).message, /정원/);
    await ok(svc.from("clans").update({ max_members: 30 }).eq("id", clan.id));
    const identity = await ok(svc.from("user_game_profiles").select("battle_tag").eq("user_id", returning.id).eq("game_id", game.id).single());
    await ok(svc.from("user_game_profiles").update({ battle_tag: null, is_verified: false }).eq("user_id", returning.id));
    assert.match((await denied(approve(request.id))).message, /게임 ID/);
    await ok(svc.from("user_game_profiles").update({ battle_tag: identity.battle_tag }).eq("user_id", returning.id));
    const other = await ok(svc.from("clans").insert({ game_id: game.id, name: `Other-${tag}` }).select("id").single()); clans.push(other.id);
    await ok(svc.from("clan_members").insert({ clan_id: other.id, user_id: returning.id, status: "active", role: "member" }));
    assert.match((await denied(approve(request.id))).message, /소속/);
    await ok(svc.from("clan_members").delete().eq("clan_id", other.id));
    assert.equal((await read()).status, "left");
    await ok(approve(request.id)); assert.deepEqual(await records(), original);
  });
  await t.test("a kick blocks all application/approval paths until staff explicitly allow rejoining", async () => {
    const stale = await apply(); await ok(change(leader.client, "kick", returning.id));
    const kicked = await read(); assert.equal(kicked.status, "banned"); assert.equal(kicked.departure_kind, "kicked");
    assert.equal((await ok(svc.from("clan_join_requests").select("status").eq("id", stale.id).single())).status, "canceled");
    await denied(returning.client.from("clan_join_requests").insert({ clan_id: clan.id, game_id: game.id, user_id: returning.id }));
    await denied(svc.from("clan_join_requests").update({ status: "pending" }).eq("id", stale.id));
    await denied(approve(stale.id)); await denied(change(member.client, "allow_rejoin", returning.id)); await denied(change(outsider.client, "allow_rejoin", returning.id));
    const attempts = await Promise.all([change(leader.client, "allow_rejoin", returning.id), change(leader.client, "allow_rejoin", returning.id)]);
    assert.equal(attempts.filter((r) => !r.error).length, 1);
    const allowed = await read(); assert.equal(allowed.status, "left"); assert.equal(allowed.departure_kind, "kicked"); assert.equal(allowed.departed_at, kicked.departed_at);
    assert.equal(await ok(returning.client.rpc("is_active_clan_member", { p_clan_id: clan.id })), false);
    await ok(approve((await apply()).id)); assert.deepEqual(await records(), original);
  });
  await t.test("unfinished rosters and flash hosts must finish or leave the room before departure", async () => {
    const room = await ok(member.client.rpc("create_balance_room", { p_clan_id: clan.id, p_kind: "flash", p_title: `Membership room ${tag}` }));
    assert.match((await denied(change(member.client, "leave"))).message, /호스트/);
    const round = await ok(svc.from("balance_sessions").select("id").eq("series_id", room.series_id).single());
    const roster = { team1: { tank: returning.id, dmg: [null, null], sup: [null, null] }, team2: { tank: null, dmg: [null, null], sup: [null, null] } };
    await ok(svc.from("balance_sessions").update({ roster }).eq("id", round.id));
    assert.match((await denied(change(returning.client, "leave"))).message, /내전/);
    await denied(change(leader.client, "kick", returning.id));
    await ok(member.client.rpc("close_balance_session_series", { p_clan_id: clan.id, p_round_id: round.id }));
    assert.deepEqual(await records(), original);
  });
  assert.deepEqual(await ok(svc.from("users").select("id,coin_balance").in("id", users.map((u) => u.id)).order("id")), coins);
});
