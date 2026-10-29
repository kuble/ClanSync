import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }

test("one normal pattern purchase includes every color", async t => {
  const f = await createIsolatedBalanceFixture(3);
  const member = await f.memberClient(1);
  t.after(async () => { await member.auth.signOut(); await f.cleanup(); });
  await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
  await ok(f.service.from("clans").update({ coin_balance: 25, subscription_tier: "free" }).eq("id", f.clanId));
  const items = await ok(f.service.from("store_items").select("*").like("slug", "clan_banner_normal_%").order("slug"));
  const buy = (item = items[0], actor = f.users[0].id) => ok(f.service.rpc("apply_store_purchase", { p_actor_id: actor, p_context_clan_id: f.clanId, p_item_slug: item.slug, p_checkout_id: randomUUID() }));
  const equip = (item = items[0], palette = "graphite", actor = f.users[0].id) => ok(f.service.rpc("set_clan_banner", { p_actor_id: actor, p_clan_id: f.clanId, p_item_slug: item?.slug ?? null, p_palette_id: palette }));
  const state = () => ok(f.service.from("clans").select("banner_url,coin_balance").eq("id", f.clanId).single());
  let first, second;
  await t.test("ten normal clan patterns cost ten each with no premium requirement", () => {
    assert.equal(items.length, 10);
    for (const item of items) { assert.equal(item.rarity, "normal"); assert.equal(item.price_coins, 10); assert.equal(item.pool_source, "clan"); assert.equal(item.is_active, true); assert.equal(item.is_premium_only, false); }
  });
  await t.test("ownership, palette and operator checks precede writes; clients cannot call service RPCs", async () => {
    assert.deepEqual(await equip(), { ok: false, error: "not_owned" });
    assert.deepEqual(await equip(items[0], "bad"), { ok: false, error: "invalid_palette" });
    assert.deepEqual(await buy(items[0], f.users[1].id), { ok: false, error: "officer_required" });
    assert.deepEqual(await equip(items[0], "blue", f.users[1].id), { ok: false, error: "officer_required" });
    assert.ok((await member.rpc("set_clan_banner", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_item_slug: items[0].slug })).error);
    assert.ok((await member.rpc("void_clan_store_purchase", { p_actor_id: f.users[0].id, p_purchase_id: randomUUID(), p_reason: "권한 확인" })).error);
    assert.ok((await member.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: items[0].slug, p_checkout_id: randomUUID() })).error);
    assert.equal((await state()).coin_balance, 25);
  });
  await t.test("simultaneous and repeated purchases debit ten exactly once", async () => {
    const results = await Promise.all([buy(), buy()]);
    assert.equal(results.filter(result => result.ok).length, 1);
    first = results.find(result => result.ok).purchase_id;
    assert.equal((await state()).coin_balance, 15);
    assert.equal((await buy()).ok, false);
    assert.deepEqual(await ok(f.service.from("purchases").select("price_coins").eq("clan_id", f.clanId)), [{ price_coins: 10 }]);
  });
  await t.test("six colors reuse the same ownership with zero extra debits", async () => {
    for (const palette of ["graphite", "blue", "green", "purple", "rose", "amber"]) {
      assert.deepEqual(await equip(items[0], palette), { ok: true });
      assert.deepEqual(await state(), { banner_url: items[0].asset_url + "?palette=" + palette, coin_balance: 15 });
    }
    assert.equal((await ok(f.service.from("coin_transactions").select("id").eq("clan_id", f.clanId).eq("reason", "purchase_store"))).length, 1);
    assert.deepEqual(await equip(items[1], "rose"), { ok: false, error: "not_owned" });
  });
  await t.test("another pattern costs ten and insufficient funds leave the ledger unchanged", async () => {
    second = (await buy(items[1])).purchase_id;
    assert.ok(second); assert.equal((await state()).coin_balance, 5);
    assert.deepEqual(await buy(items[2]), { ok: false, error: "insufficient_coins" });
    assert.equal((await state()).coin_balance, 5);
  });
  await t.test("voiding refunds once and clears only the currently applied pattern with its color", async () => {
    const voidPurchase = id => ok(f.service.rpc("void_clan_store_purchase", { p_actor_id: f.users[2].id, p_purchase_id: id, p_reason: "격리 배너 검증" }));
    await equip(items[1], "green");
    assert.deepEqual(await voidPurchase(first), { ok: true });
    assert.deepEqual(await state(), { banner_url: items[1].asset_url + "?palette=green", coin_balance: 15 });
    assert.deepEqual(await voidPurchase(second), { ok: true });
    assert.deepEqual(await state(), { banner_url: null, coin_balance: 25 });
    assert.equal((await voidPurchase(second)).ok, false);
    assert.equal((await state()).coin_balance, 25);
    assert.deepEqual(await equip(items[1], "purple"), { ok: false, error: "not_owned" });
  });
});
