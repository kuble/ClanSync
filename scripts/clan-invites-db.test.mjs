import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";
import { expireClanInvite } from "./fixtures/clan-invite-expiry.mjs";

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
async function denied(query) {
  const { error } = await query;
  assert.ok(error, "Restricted operation unexpectedly succeeded");
  return error;
}

test("30-minute clan invites enforce membership, expiry and atomic capacity", async t => {
  const f = await createIsolatedBalanceFixture(6);
  const clients = await Promise.all(f.users.map((_, index) => f.memberClient(index)));
  const [leader, first, second, third, fourth, outsider] = clients;
  const env = loadTestEnv();
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  let otherClan;
  t.after(async () => {
    if (otherClan) await f.service.from("clans").delete().eq("id", otherClan);
    await Promise.all(clients.map(client => client.auth.signOut()));
    await f.cleanup();
  });
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).neq("user_id", f.users[0].id));
  let invite;
  const issue = () => leader.rpc("get_clan_join_invite", { p_clan_id: f.clanId });
  const joinInvite = client => client.rpc("join_clan_by_invite", { p_token: invite.token });
  const member = index => f.service.from("clan_members").select("id,status,role").eq("clan_id", f.clanId).eq("user_id", f.users[index].id).maybeSingle();

  await t.test("only officers issue reusable 30-minute invites; tokens are not listable", async () => {
    await denied(first.rpc("get_clan_join_invite", { p_clan_id: f.clanId }));
    await denied(anon.rpc("get_clan_join_invite", { p_clan_id: f.clanId }));
    const issued = await Promise.all([ok(issue()), ok(issue())]);
    invite = issued[0][0];
    assert.equal(invite.token, issued[1][0].token);
    const duration = Date.parse(invite.expires_at) - Date.parse(invite.server_now);
    assert.ok(duration > 1_795_000 && duration <= 1_800_000);
    await denied(first.schema("private").from("clan_join_invites").select("*"));
    await denied(anon.rpc("read_clan_join_invite", { p_token: invite.token }));
    await denied(joinInvite(anon));
    assert.equal((await ok(first.rpc("read_clan_join_invite", { p_token: invite.token })))[0].clan_id, f.clanId);
  });
  await t.test("game identity, recruitment rules, bans and existing clans are enforced", async () => {
    await ok(f.service.from("user_game_profiles").update({ battle_tag: null }).eq("user_id", f.users[1].id).eq("game_id", f.gameId));
    assert.match((await denied(joinInvite(first))).message, /게임 ID/);
    await ok(f.service.from("user_game_profiles").update({ battle_tag: "InviteTest#1234" }).eq("user_id", f.users[1].id).eq("game_id", f.gameId));
    await ok(f.service.from("users").update({ birth_year: 2000, gender: "female" }).eq("id", f.users[1].id));
    await ok(leader.rpc("update_clan_recruitment", { p_clan_id: f.clanId, p_birth_year_from: 2001 }));
    await denied(joinInvite(first));
    await ok(leader.rpc("update_clan_recruitment", { p_clan_id: f.clanId, p_gender_policy: "male" }));
    await ok(joinInvite(first));
    await ok(first.rpc("change_clan_membership", { p_clan_id: f.clanId, p_action: "leave" }));
    await ok(f.service.from("users").update({ gender: "undisclosed" }).eq("id", f.users[1].id));
    await ok(leader.rpc("update_clan_recruitment", { p_clan_id: f.clanId, p_gender_policy: "female" }));
    await ok(joinInvite(first));
    await ok(first.rpc("change_clan_membership", { p_clan_id: f.clanId, p_action: "leave" }));
    await ok(leader.rpc("update_clan_recruitment", { p_clan_id: f.clanId }));
    await ok(f.service.from("clan_members").update({ role: "officer", status: "banned" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await denied(joinInvite(first));
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    otherClan = (await ok(f.service.from("clans").insert({ name: "Invite-isolated-other", game_id: f.gameId }).select("id").single())).id;
    await ok(f.service.from("clan_members").insert({ clan_id: otherClan, user_id: f.users[5].id, role: "leader", status: "active" }));
    assert.match((await denied(joinInvite(outsider))).message, /다른 클랜/);
    await ok(f.service.from("clans").update({ moderation_status: "hidden" }).eq("id", f.clanId));
    await denied(joinInvite(first));
    await ok(f.service.from("clans").update({ moderation_status: "clean" }).eq("id", f.clanId));
  });
  await t.test("instant join is idempotent, restores member role and clears pending applications", async () => {
    const before = await ok(member(1));
    await ok(second.from("clan_join_requests").insert({ clan_id: otherClan, game_id: f.gameId, user_id: f.users[2].id }));
    await Promise.all([ok(joinInvite(first)), ok(joinInvite(first)), ok(joinInvite(second))]);
    const restored = await ok(member(1));
    assert.equal(restored.id, before.id);
    assert.deepEqual({ role: restored.role, status: restored.status }, { role: "member", status: "active" });
    assert.equal((await ok(f.service.from("clan_participants").select("id").eq("clan_id", f.clanId).eq("user_id", f.users[1].id))).length, 1);
    assert.equal((await ok(f.service.from("clan_join_requests").select("status").eq("user_id", f.users[2].id).eq("game_id", f.gameId))).every(row => row.status === "canceled"), true);
  });
  await t.test("only one concurrent claimant can take the last place", async () => {
    await ok(f.service.from("clans").update({ max_members: 4 }).eq("id", f.clanId));
    const results = await Promise.all([joinInvite(third), joinInvite(fourth)]);
    assert.equal(results.filter(result => !result.error).length, 1);
    assert.match(results.find(result => result.error).error.message, /정원/);
    assert.equal((await ok(f.service.from("clan_members").select("id").eq("clan_id", f.clanId).eq("status", "active"))).length, 4);
  });
  await t.test("demoted issuers and expired or rotated tokens cannot grant membership", async () => {
    await ok(f.service.from("clan_members").update({ role: "member" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    assert.deepEqual(await ok(first.rpc("read_clan_join_invite", { p_token: invite.token })), []);
    await denied(joinInvite(outsider));
    await ok(f.service.from("clan_members").update({ role: "leader" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    expireClanInvite(f.clanId);
    assert.deepEqual(await ok(first.rpc("read_clan_join_invite", { p_token: invite.token })), []);
    await denied(joinInvite(outsider));
    const old = invite.token;
    const issued = await Promise.all([ok(issue()), ok(issue())]);
    assert.notEqual(issued[0][0].token, old);
    assert.equal(issued[0][0].token, issued[1][0].token);
    assert.deepEqual(await ok(first.rpc("read_clan_join_invite", { p_token: old })), []);
  });
});
