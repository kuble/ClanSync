import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
test("signed-in visitors see public profiles without exposing private account or stored furniture data", async t => {
  const f = await createIsolatedBalanceFixture(3);
  const [owner, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
  t.after(async () => { await Promise.all([owner, member, outsider].map(c => c.auth.signOut())); await f.cleanup(); });
  const userId = f.users[0].id, battleTag = "Public" + userId.slice(0, 8) + "#1234", intro = "공개 소개 표식";
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
  await ok(f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", userId).eq("game_id", f.gameId));
  await ok(f.service.auth.admin.updateUserById(userId, { user_metadata: { profile_intro: intro } }));
  const visit = (client = outsider, id = userId) => ok(client.rpc("read_player_profile", { p_user_id: id }));
  await t.test("a visit shares intro, clan and verified game ID without creating inventory or spending coins", async () => {
    const room = await visit();
    assert.equal(room.intro, intro); assert.equal(room.memberships[0].accountId, battleTag);
    assert.equal(room.memberships[0].clanId, f.clanId);
    assert.deepEqual(room.games, [{ slug: "overwatch", nameKo: "오버워치" }]);
    assert.deepEqual(await visit(member), room);
    assert.deepEqual(room.housing.inventory, []);
    assert.deepEqual(await ok(f.service.from("user_housing_rooms").select("user_id").eq("user_id", userId)), []);
    assert.deepEqual(await ok(f.service.from("coin_transactions").select("id").eq("user_id", userId)), []);
  });
  await t.test("only placed furniture is projected; email, provider IDs, balances and room revision stay private", async () => {
    const state = await ok(owner.rpc("get_my_housing"));
    const stored = state.inventory.find(item => item.catalogId === "small-plant");
    await ok(f.service.from("user_housing_inventory").update({ x: null, y: null }).eq("id", stored.id));
    const room = await visit();
    assert.deepEqual(Object.keys(room).sort(), ["games", "housing", "intro", "memberships", "userId"]);
    assert.deepEqual(Object.keys(room.housing).sort(), ["catalog", "inventory", "room"]);
    assert.equal(room.housing.inventory.length, 9);
    const serialized = JSON.stringify(room);
    for (const value of [f.users[0].email, f.users[0].nickname, stored.id, "game_uid", "coinBalance", "coin_balance", "acquired_price", "revision", "auto_login"]) assert.ok(!serialized.includes(value), value);
    assert.deepEqual(await ok(outsider.from("user_housing_inventory").select("id").eq("user_id", userId)), []);
    assert.deepEqual(await ok(outsider.from("user_housing_rooms").select("user_id").eq("user_id", userId)), []);
  });
  await t.test("retired false preferences no longer hide a profile and authenticated clients cannot edit them", async () => {
    await ok(f.service.from("profile_visibility").upsert({ user_id: userId, room_public: false, show_intro: false, show_games: false, show_clan: false, show_emblems: false }));
    assert.equal((await visit()).intro, intro);
    assert.equal((await visit(owner)).memberships[0].accountId, battleTag);
    for (const client of [owner, member, outsider]) {
      assert.equal((await client.from("profile_visibility").select("*")).error?.code, "42501");
      assert.equal((await client.from("profile_visibility").upsert({ user_id: userId, room_public: false })).error?.code, "42501");
    }
  });
  await t.test("each current clan shares its verified game identity and unverified/provider identifiers stay excluded", async () => {
    const game = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    const clanId = randomUUID(), riotId = "PublicRiot#QA1";
    await ok(f.service.from("clans").insert({ id: clanId, game_id: game.id, name: "Public-" + clanId.slice(0, 8) }));
    try {
      await ok(f.service.from("clan_members").insert({ clan_id: clanId, user_id: userId, role: "member", status: "active" }));
      await ok(f.service.from("user_game_profiles").insert({ user_id: userId, game_id: game.id, game_uid: "private-provider-id", riot_id: riotId, is_verified: true }));
      let room = await visit();
      assert.equal(room.memberships.find(m => m.gameSlug === "valorant").accountId, riotId);
      assert.ok(!JSON.stringify(room).includes("private-provider-id"));
      await ok(f.service.from("user_game_profiles").update({ is_verified: false }).eq("user_id", userId).eq("game_id", game.id));
      room = await visit();
      assert.equal(room.memberships.find(m => m.gameSlug === "valorant").accountId, null);
      assert.ok(!JSON.stringify(room).includes(riotId));
    } finally { await ok(f.service.from("clans").delete().eq("id", clanId)); }
  });
  await t.test("leaving the last clan removes membership, while the room and intro remain viewable", async () => {
    const before = (await visit()).housing;
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("user_id", userId));
    const after = await visit();
    assert.equal(after.intro, intro); assert.deepEqual(after.memberships, []); assert.deepEqual(after.housing, before);
  });
  await t.test("anonymous users cannot visit and missing/deleted users return no profile", async () => {
    const env = loadTestEnv();
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    assert.equal((await anon.rpc("read_player_profile", { p_user_id: userId })).error?.code, "42501");
    assert.equal(await visit(outsider, randomUUID()), null);
  });
});
