import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
async function denied(query) { assert.ok((await query).error, "Unauthorized or stale change succeeded"); }

test("leadership transfers are atomic and serialize with role and membership changes", async t => {
  const f = await createIsolatedBalanceFixture(5);
  const clients = await Promise.all(f.users.map((_, i) => f.memberClient(i)));
  t.after(async () => { await Promise.all(clients.map(c => c.auth.signOut())); await f.cleanup(); });
  const env = loadTestEnv(), anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const [leader, officer, member, former, outsider] = clients;
  await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
  await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[3].id));
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[4].id));
  const change = (client, index, role = "leader") => client.rpc("set_clan_member_role", { p_clan_id: f.clanId, p_user_id: f.users[index].id, p_role: role });
  const rows = () => ok(f.service.from("clan_members").select("user_id,role,status,joined_at").eq("clan_id", f.clanId).order("user_id"));
  const clan = () => ok(f.service.from("clans").select("coin_balance,ownership_transferred_at,created_at").eq("id", f.clanId).single());
  const before = await rows(), initialClan = await clan();
  await t.test("members, officers, former members and anonymous users cannot change roles or transfer", async () => {
    for (const client of [officer, member, former, outsider, anon]) for (const role of ["leader", "officer", "member"]) await denied(change(client, 2, role));
    assert.deepEqual(await rows(), before); assert.deepEqual(await clan(), initialClan);
  });
  await t.test("self, inactive, outside, missing and invalid requests leave both roles unchanged", async () => {
    for (const index of [0, 3, 4]) await denied(change(leader, index));
    for (const p_user_id of [null, randomUUID()]) await denied(leader.rpc("set_clan_member_role", { p_clan_id: f.clanId, p_user_id, p_role: "leader" }));
    for (const p_role of [null, "admin"]) await denied(change(leader, 2, p_role));
    await denied(leader.rpc("set_clan_member_role", { p_clan_id: randomUUID(), p_user_id: f.users[2].id, p_role: "leader" }));
    const direct = await leader.from("clan_members").update({ role: "leader" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id).select();
    assert.ok(direct.error || !direct.data?.length);
    assert.deepEqual(await rows(), before); assert.deepEqual(await clan(), initialClan);
  });
  await t.test("promotion and demotion retain the existing member/officer rules", async () => {
    await ok(change(leader, 2, "officer")); await denied(change(leader, 2, "officer"));
    await ok(change(leader, 2, "member")); await denied(change(leader, 2, "member"));
  });
  await t.test("an officer can receive leadership and the old leader becomes a member", async () => {
    await ok(change(leader, 1));
    const current = await rows();
    assert.equal(current.find(r => r.user_id === f.users[0].id).role, "member");
    assert.equal(current.find(r => r.user_id === f.users[1].id).role, "leader");
    await denied(change(leader, 2)); await denied(change(leader, 2, "officer"));
    await ok(change(officer, 0)); await ok(change(leader, 1, "officer"));
  });
  await t.test("two simultaneous transfers produce exactly one successor", async () => {
    const result = await Promise.all([change(leader, 1), change(leader, 2)]);
    assert.equal(result.filter(r => !r.error).length, 1);
    const current = await rows(), successors = current.filter(r => r.status === "active" && r.role === "leader");
    assert.equal(successors.length, 1);
    assert.equal(current.find(r => r.user_id === f.users[0].id).role, "member");
    const successor = f.users.findIndex(u => u.id === successors[0].user_id);
    await denied(change(leader, 1, "member"));
    await ok(change(clients[successor], 0));
  });
  await t.test("transfer racing with target departure never leaves a departed leader or no leader", async () => {
    const result = await Promise.all([change(leader, 2), member.rpc("change_clan_membership", { p_clan_id: f.clanId, p_action: "leave" })]);
    assert.equal(result.filter(r => !r.error).length, 1);
    const current = await rows();
    assert.equal(current.filter(r => r.role === "leader" && r.status === "active").length, 1);
    assert.equal(current.some(r => r.role === "leader" && r.status !== "active"), false);
    assert.equal((await clan()).coin_balance, initialClan.coin_balance);
    assert.equal((await clan()).created_at, initialClan.created_at);
    assert.ok((await clan()).ownership_transferred_at);
    for (const row of current) assert.equal(row.joined_at, before.find(r => r.user_id === row.user_id).joined_at);
    if (current.find(r => r.user_id === f.users[2].id).role === "leader") {
      await ok(leader.rpc("change_clan_membership", { p_clan_id: f.clanId, p_action: "leave" }));
      assert.equal((await rows()).find(r => r.user_id === f.users[0].id).status, "left");
    }
  });
});
