import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("profile visits project only opted-in fields and placed furniture, with owner-only settings", async (t) => {
  const f = await createIsolatedBalanceFixture(3);
  const [owner, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
  const battleTag = `Visit${f.users[0].id.slice(0, 8)}#1234`;
  await ok(f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", f.users[0].id).eq("game_id", f.gameId));
  t.after(async () => { await Promise.all([owner, member, outsider].map((c) => c.auth.signOut())); await f.cleanup(); });
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
  await ok(f.service.auth.admin.updateUserById(f.users[0].id, { user_metadata: { profile_intro: "비공개 소개 표식" } }));
  const defaults = { room_public: true, show_intro: false, show_games: false, show_clan: false, show_emblems: false };
  const share = (values) => ok(owner.from("profile_visibility").upsert({ user_id: f.users[0].id, ...defaults, ...values }));
  const visit = (client = member, id = f.users[0].id) => ok(client.rpc("read_player_profile", { p_user_id: id }));
  let state;

  await t.test("visiting an uninitialized room never initializes inventory or spends coins", async () => {
    const room = await visit();
    assert.equal("nickname" in room, false);
    assert.equal(room.intro, null);
    assert.deepEqual(room.games, []);
    assert.deepEqual(room.memberships, []);
    assert.deepEqual(room.housing.inventory, []);
    assert.deepEqual(await ok(f.service.from("user_housing_rooms").select("user_id").eq("user_id", f.users[0].id)), []);
    assert.deepEqual(await ok(f.service.from("profile_visibility").select("user_id").eq("user_id", f.users[0].id)), []);
  });

  await t.test("only placed furniture is shared; private balances, IDs, stored items and revisions stay private", async () => {
    state = await ok(owner.rpc("get_my_housing"));
    const stored = state.inventory.find((item) => item.catalogId === "small-plant");
    await ok(f.service.from("user_housing_inventory").update({ x: null, y: null }).eq("id", stored.id));
    const room = await visit();
    assert.deepEqual(Object.keys(room).sort(), ["games", "housing", "intro", "memberships", "userId"]);
    assert.deepEqual(Object.keys(room.housing).sort(), ["catalog", "inventory", "room"]);
    assert.deepEqual(Object.keys(room.housing.room).sort(), ["floor", "wallpaper"]);
    assert.equal(room.housing.inventory.length, 9);
    assert.ok(!JSON.stringify(room).includes(stored.id));
    assert.ok(!room.housing.catalog.some((c) => c.id === "small-plant"));
    const serialized = JSON.stringify(room);
    for (const privateValue of [f.users[0].email, f.users[0].nickname, battleTag, "비공개 소개 표식", "game_uid", "coinBalance", "coin_balance", "acquired_price", "revision"]) assert.ok(!serialized.includes(privateValue));
    assert.deepEqual(await ok(member.from("user_housing_inventory").select("id").eq("user_id", f.users[0].id)), []);
    assert.deepEqual(await ok(member.from("user_housing_rooms").select("user_id").eq("user_id", f.users[0].id)), []);
  });

  await t.test("owners choose individual fields; emblem audience still requires active shared clan membership", async () => {
    await share({ show_intro: true });
    let room = await visit();
    assert.equal(room.intro, "비공개 소개 표식"); assert.deepEqual(room.games, []); assert.deepEqual(room.memberships, []);
    await share({ show_games: true, show_clan: true, show_emblems: true });
    room = await visit();
    assert.equal(room.intro, null);
    assert.deepEqual(room.games, [{ slug: "overwatch", nameKo: "오버워치" }]);
    assert.equal(room.memberships[0].clanId, f.clanId);
    assert.equal(room.memberships[0].accountId, battleTag);
    assert.equal(room.memberships[0].showEmblems, true);
    assert.equal((await visit(outsider)).memberships[0].showEmblems, false);
    assert.equal((await visit(outsider)).memberships[0].accountId, battleTag);
    await ok(f.service.from("user_game_profiles").update({ is_verified: false }).eq("user_id", f.users[0].id).eq("game_id", f.gameId));
    assert.equal((await visit(outsider)).memberships[0].accountId, null);
    await ok(f.service.from("user_game_profiles").update({ is_verified: true }).eq("user_id", f.users[0].id).eq("game_id", f.gameId));
    await share({ show_emblems: true });
    assert.deepEqual((await visit()).memberships, []);
  });

  await t.test("each opted-in clan exposes its own verified game identity without provider IDs", async () => {
    const otherClan = randomUUID();
    const riotId = `Riot${f.users[0].id.slice(0, 8)}#QA1`;
    const game = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    await ok(f.service.from("clans").insert({ id: otherClan, game_id: game.id, name: `Visit-${otherClan.slice(0, 8)}` }));
    try {
      await ok(f.service.from("clan_members").insert({ clan_id: otherClan, user_id: f.users[0].id, role: "member", status: "active" }));
      await ok(f.service.from("user_game_profiles").insert({ user_id: f.users[0].id, game_id: game.id, game_uid: "private-provider-id", riot_id: riotId, is_verified: true }));
      await share({ show_clan: true });
      const room = await visit(outsider);
      assert.equal(room.memberships.find((m) => m.gameSlug === "overwatch").accountId, battleTag);
      assert.equal(room.memberships.find((m) => m.gameSlug === "valorant").accountId, riotId);
      assert.ok(!JSON.stringify(room).includes("private-provider-id"));
      await share({ show_games: true });
      const hidden = JSON.stringify(await visit(outsider));
      assert.ok(!hidden.includes(battleTag)); assert.ok(!hidden.includes(riotId));
    } finally { await ok(f.service.from("clans").delete().eq("id", otherClan)); }
  });

  await t.test("forged settings and anonymous requests cannot access or change another player's policy", async () => {
    assert.deepEqual(await ok(member.from("profile_visibility").select("*").eq("user_id", f.users[0].id)), []);
    assert.deepEqual(await ok(member.from("profile_visibility").update({ show_intro: true }).eq("user_id", f.users[0].id).select()), []);
    assert.ok((await outsider.from("profile_visibility").insert({ user_id: f.users[0].id, show_intro: true })).error);
    assert.ok((await owner.from("profile_visibility").update({ user_id: f.users[1].id }).eq("user_id", f.users[0].id)).error);
    assert.equal((await visit()).intro, null);
    const env = loadTestEnv();
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    assert.ok((await anon.rpc("read_player_profile", { p_user_id: f.users[0].id })).error);
    assert.ok((await anon.from("profile_visibility").select("*")).error);
    assert.equal(await visit(member, randomUUID()), null);
  });

  await t.test("revocation applies immediately without changing the owner's saved room", async () => {
    const before = await ok(owner.rpc("get_my_housing"));
    await share({ room_public: false, show_intro: true, show_games: true, show_clan: true });
    assert.equal(await visit(), null);
    assert.equal(await visit(outsider), null);
    assert.equal(await visit(owner), null);
    assert.deepEqual(await ok(owner.rpc("get_my_housing")), before);
    await share({});
    assert.ok(await visit());
    const ledger = await ok(f.service.from("coin_transactions").select("id").eq("user_id", f.users[0].id));
    assert.deepEqual(ledger, []);
  });
});
