import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";
import { parseRiotId } from "../src/lib/game-auth/riot-id.ts";

test("Riot display IDs retain the complete tag and reject malformed or control-character identities", () => {
  assert.equal(parseRiotId(" Player#KR1 "), "Player#KR1");
  assert.equal(parseRiotId("함께하는 사람#KR1"), "함께하는 사람#KR1");
  for (const value of ["Player", "ab#KR1", "Player#K1", "Player#KR1234", "Player#KR1#x", "Player\n#KR1", "a".repeat(17) + "#KR1"]) assert.equal(parseRiotId(value), null);
});

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
test("account namecards share one appearance across games and titles debit personal coins exactly once", async (t) => {
  const f = await createIsolatedBalanceFixture(3);
  const [owner, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
  let valorantClan;
  t.after(async () => { if (valorantClan) await ok(f.service.from("clans").delete().eq("id", valorantClan)); await Promise.all([owner, member, outsider].map((c) => c.auth.signOut())); await f.cleanup(); await ok(f.service.from("nameplate_options").delete().eq("code", "title-fixture-" + f.clanId)); });
  await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
  await ok(f.service.from("nameplate_options").insert({ game_id: f.gameId, category: "sub", code: "title-fixture-" + f.clanId, name_ko: "새벽의 전략가", unlock_source: "store", price_coins: 180 }));
  const catalog = await ok(owner.from("nameplate_options").select("id,game_id,category,code,name_ko,price_coins,unlock_source").eq("is_active",true));
  const title = catalog.find((item) => item.code === "title-fixture-" + f.clanId);
  const free = catalog.find((item) => item.code === "symbol-normal-orbit");
  const read = (client = member, clanId = f.clanId) => ok(client.rpc("get_clan_namecards", { p_clan_id: clanId }));
  const equip = (category, optionId, client = owner) => client.from("user_namecard_selections").upsert({ user_id: f.users[0].id, category, option_id: optionId });
  const buy = (id = title.id, client = owner) => client.rpc("purchase_profile_title", { p_option_id: id });
  await ok(f.service.from("users").update({ coin_balance: 500 }).eq("id", f.users[0].id));
  await ok(f.service.from("users").update({ coin_balance: 0 }).eq("id", f.users[1].id));

  await t.test("only default designs remain available without inventory grants", async () => {
    assert.equal(catalog.some(item => /^(starter-|theme-|pf_entrance_store:)/.test(item.code)), false);
    assert.equal(catalog.some(item => item.code === "ow-emblem-default"), false);
    const defaults = catalog.filter(item => item.code.startsWith("symbol-normal-") || item.code.startsWith("background-normal-") || item.code === "portrait-default" || item.code.startsWith("ow-") && item.code.endsWith("-default"));
    assert.equal(defaults.length, 14);
    for (const item of defaults) {
      assert.equal(item.unlock_source, "default"); assert.equal(item.price_coins, 0);
      await ok(equip(item.category, item.id));
      const card = (await read())[f.users[0].id];
      assert.equal(card[item.category === "sub" ? "title" : item.category], item.category === "sub" ? null : item.code);
    }
    assert.deepEqual(await ok(owner.from("user_nameplate_inventory").select("option_id").eq("user_id", f.users[0].id)), []);
  });

  await t.test("unowned, mismatched and foreign selections are rejected", async () => {
    assert.ok((await equip("sub", title.id)).error);
    assert.ok((await equip("frame", free.id)).error);
    assert.ok((await equip("emblem", free.id, member)).error);
    await ok(equip("emblem", free.id));
    assert.equal((await ok(owner.from("user_namecard_selections").select("*").eq("user_id", f.users[0].id).eq("category", "emblem"))).length, 1);
    assert.deepEqual(await ok(member.from("user_namecard_selections").select("*").eq("user_id", f.users[0].id)), []);
  });
  await t.test("a mismatched multi-layer selection rolls back atomically", async () => {
    const before = await ok(owner.from("user_namecard_selections").select("category,option_id").order("category"));
    const frame = catalog.find(item => item.code === "ow-frame-default");
    const portrait = catalog.find(item => item.code === "portrait-default");
    const rejected = await owner.from("user_namecard_selections").upsert([
      { user_id: f.users[0].id, category: "frame", option_id: frame.id },
      { user_id: f.users[0].id, category: "portrait", option_id: free.id },
    ]);
    assert.ok(rejected.error);
    assert.deepEqual(await ok(owner.from("user_namecard_selections").select("category,option_id").order("category")), before);
    assert.ok((await equip("portrait", portrait.id, member)).error);
    await ok(equip("portrait", portrait.id));
    assert.equal((await read())[f.users[0].id].portrait, "portrait-default");
  });
  await t.test("concurrent repeat purchases charge once; prices, actor, refunds and inventory cannot be forged", async () => {
    const results = await Promise.all([buy(), buy(), buy()]);
    for (const result of results) { assert.equal(result.error, null, result.error?.message); assert.equal(result.data.coinBalance, 320); }
    const entries = await ok(f.service.from("coin_transactions").select("amount,reason,pool_type,balance_after,clan_id").eq("user_id", f.users[0].id));
    assert.deepEqual(entries, [{ amount: -180, reason: "purchase_title", pool_type: "personal", balance_after: 320, clan_id: null }]);
    assert.equal((await ok(owner.from("user_nameplate_inventory").select("option_id").eq("option_id", title.id))).length, 1);
    assert.ok((await buy(free.id)).error);
    assert.ok((await buy(title.id, member)).error);
    assert.ok((await owner.rpc("purchase_profile_title", { p_option_id: title.id, p_price: 0 })).error);
    assert.ok((await member.from("user_nameplate_inventory").insert({ user_id: f.users[1].id, option_id: title.id })).error);
    await ok(equip("sub", title.id));
    assert.equal((await read())[f.users[0].id].title, "새벽의 전략가");
  });
  await t.test("one saved title follows full BattleTag and Riot ID, never exposing provider IDs or private account fields", async () => {
    await ok(f.service.from("user_game_profiles").update({ battle_tag: "NamecardQA#12345" }).eq("user_id", f.users[0].id).eq("game_id", f.gameId));
    const game = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    const clan = await ok(f.service.from("clans").insert({ name: `Namecard-${f.clanId.slice(0,8)}`, game_id: game.id }).select("id").single()); valorantClan = clan.id;
    await ok(f.service.from("clan_members").insert([0,1].map((index) => ({ clan_id: clan.id, user_id: f.users[index].id, role: index ? "member" : "leader", status: "active" }))));
    await ok(f.service.from("user_game_profiles").insert({ user_id: f.users[0].id, game_id: game.id, game_uid: `private-puuid-${f.users[0].id}`, riot_id: "RiotPlayer#KR1", is_verified: true }));
    const ow = (await read())[f.users[0].id], val = (await read(member, clan.id))[f.users[0].id];
    assert.equal(ow.displayName, "NamecardQA#12345"); assert.equal(val.displayName, "RiotPlayer#KR1");
    assert.equal(ow.title, val.title); assert.equal(ow.title, "새벽의 전략가");
    for (const value of ["private-puuid", f.users[0].email, "coinBalance", "birth_year"]) assert.ok(!JSON.stringify(val).includes(value));
    const alternative = catalog.find((item) => item.code === "symbol-normal-spark");
    await ok(equip("emblem", alternative.id));
    assert.equal((await read())[f.users[0].id].emblem, alternative.code);
    assert.equal((await read(member, clan.id))[f.users[0].id].emblem, alternative.code);
    assert.equal((await ok(owner.from("user_namecard_selections").select("option_id").eq("category", "emblem"))).length, 1);
  });
  await t.test("anonymous, outsiders and revoked memberships cannot read clan namecards", async () => {
    const env = loadTestEnv(); const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    assert.ok((await anon.rpc("get_clan_namecards", { p_clan_id: f.clanId })).error);
    assert.ok((await anon.rpc("purchase_profile_title", { p_option_id: title.id })).error);
    assert.ok((await outsider.rpc("get_clan_namecards", { p_clan_id: f.clanId })).error);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    assert.ok((await member.rpc("get_clan_namecards", { p_clan_id: f.clanId })).error);
  });
  await t.test("inventory revocation clears the shared appearance without deleting legacy selections", async () => {
    await ok(f.service.from("user_nameplate_inventory").delete().eq("user_id", f.users[0].id).eq("option_id", title.id));
    assert.deepEqual(await ok(owner.from("user_namecard_selections").select("option_id").eq("category", "sub")), []);
    assert.equal((await read(owner))[f.users[0].id].title, null);
    assert.ok((await equip("sub", title.id)).error);
  });
});
