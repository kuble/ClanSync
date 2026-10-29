import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";

async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }

test("repeatable three-slot packs keep coins, capacity and permissions consistent", async t => {
  const f = await createIsolatedBalanceFixture(3), svc = f.service;
  const member = await f.memberClient(1);
  t.after(async () => { await member.auth.signOut(); await f.cleanup(); });
  await ok(svc.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
  await ok(svc.from("clans").update({ coin_balance: 2000 }).eq("id", f.clanId));
  const buy = (checkout = randomUUID(), slug = "clan_emoji_slots_3", actor = f.users[0].id) => ok(svc.rpc("apply_store_purchase", { p_actor_id: actor, p_context_clan_id: f.clanId, p_item_slug: slug, p_checkout_id: checkout }));
  const balance = async () => (await ok(svc.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance;
  const access = () => ok(member.rpc("clan_cosmetic_access", { p_clan_id: f.clanId }));
  const visible = () => ok(member.from("clan_emojis").select("id,slot_index").eq("clan_id", f.clanId).order("slot_index"));
  const add = (name, actor = f.users[0].id) => { const id = randomUUID(); return ok(svc.rpc("add_clan_emoji", { p_actor_id: actor, p_clan_id: f.clanId, p_id: id, p_name: name, p_image_path: `${f.clanId}/${id}/${randomUUID()}.webp` })); };
  const voidPurchase = id => ok(svc.rpc("void_clan_store_purchase", { p_actor_id: f.users[2].id, p_purchase_id: id, p_reason: "격리 슬롯 검증" }));
  let first;
  await t.test("catalog sells three slots for 100 while retiring only the old SKU", async () => {
    const items = await ok(svc.from("store_items").select("slug,price_coins,is_active,pool_source").in("slug", ["clan_emoji_slots_3", "clan_emoji_slots_10"]));
    assert.deepEqual(items.find(i => i.slug.endsWith("_3")), { slug: "clan_emoji_slots_3", price_coins: 100, is_active: true, pool_source: "clan" });
    assert.equal(items.find(i => i.slug.endsWith("_10")).is_active, false);
    assert.equal((await access()).emojiSlots, 0);
  });
  await t.test("member and client writes cannot buy, allocate or forge repeatable purchases", async () => {
    assert.deepEqual(await buy(randomUUID(), "clan_emoji_slots_3", f.users[1].id), { ok: false, error: "officer_required" });
    assert.deepEqual(await add("권한확인", f.users[1].id), { ok: false, error: "officer_required" });
    assert.deepEqual(await add("미구매"), { ok: false, error: "not_owned" });
    assert.ok((await member.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: "clan_emoji_slots_3", p_checkout_id: randomUUID() })).error);
    assert.ok((await member.rpc("add_clan_emoji", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_id: randomUUID(), p_name: "위조", p_image_path: "invalid" })).error);
    assert.equal(await balance(), 2000);
  });
  await t.test("one checkout adds three once; distinct concurrent checkouts each add three", async () => {
    const checkout = randomUUID();
    const same = await Promise.all([buy(checkout), buy(checkout)]);
    assert.equal(same.filter(r => r.ok).length, 1);
    first = same.find(r => r.ok).purchase_id;
    assert.equal(await balance(), 1900); assert.equal((await access()).emojiSlots, 3);
    assert.equal((await buy(checkout)).ok, false);
    assert.ok((await member.from("purchases").update({ repeatable: false }).eq("id", first).select()).data?.length === 0);
    assert.ok((await Promise.all([buy(), buy()])).every(r => r.ok));
    assert.equal(await balance(), 1700); assert.equal((await access()).emojiSlots, 9);
    const rows = await ok(svc.from("purchases").select("price_coins,repeatable").eq("clan_id", f.clanId));
    assert.equal(rows.length, 3); assert.ok(rows.every(r => r.repeatable && r.price_coins === 100));
  });
  await t.test("parallel uploads cannot exceed quota and voiding hides overflow without deleting it", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => add(`반응_${i}`)));
    assert.equal(results.filter(r => r.ok).length, 9);
    assert.equal(results.filter(r => r.error === "slots_full").length, 3);
    assert.deepEqual((await visible()).map(r => r.slot_index), [1,2,3,4,5,6,7,8,9]);
    assert.deepEqual(await voidPurchase(first), { ok: true });
    assert.equal(await balance(), 1800); assert.equal((await access()).emojiSlots, 6);
    assert.equal((await visible()).length, 6);
    assert.equal((await ok(svc.from("clan_emojis").select("id").eq("clan_id", f.clanId))).length, 9);
    assert.equal((await voidPurchase(first)).ok, false); assert.equal(await balance(), 1800);
    const low = (await visible())[0];
    await ok(svc.from("clan_emojis").delete().eq("id", low.id));
    assert.deepEqual(await add("빈자리"), { ok: true });
    assert.deepEqual(await add("정원초과"), { ok: false, error: "slots_full" });
    assert.equal((await buy()).ok, true);
    assert.equal((await visible()).length, 9); assert.equal((await access()).emojiSlots, 9);
  });
  await t.test("insufficient funds, one-time products and departed members retain their restrictions", async () => {
    await ok(svc.from("clans").update({ coin_balance: 99 }).eq("id", f.clanId));
    assert.deepEqual(await buy(), { ok: false, error: "insufficient_coins" });
    assert.equal((await access()).emojiSlots, 9); assert.equal(await balance(), 99);
    await ok(svc.from("clans").update({ coin_balance: 1700 }).eq("id", f.clanId));
    assert.equal((await buy(randomUUID(), "clan_photo_stickers")).ok, true);
    assert.deepEqual(await buy(randomUUID(), "clan_photo_stickers"), { ok: false, error: "already_purchased" });
    assert.equal(await balance(), 1600);
    await ok(svc.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    assert.deepEqual(await access(), {}); assert.deepEqual(await visible(), []);
    await ok(svc.from("clan_members").update({ status: "active" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
  });
  await t.test("historical ten-slot purchases retain ten and combine with the new packs", async () => {
    const old = await ok(svc.from("store_items").select("id").eq("slug", "clan_emoji_slots_10").single());
    // Isolated historical fixture; the retired global catalog never becomes active.
    const tx = await ok(svc.from("coin_transactions").insert({ clan_id: f.clanId, pool_type: "clan", amount: -200, reason: "purchase_store", reference_type: "store_checkout", reference_id: randomUUID(), sub_key: "", balance_after: 1400, created_by: f.users[0].id }).select("id").single());
    await ok(svc.from("clans").update({ coin_balance: 1400 }).eq("id", f.clanId));
    const purchase = await ok(svc.from("purchases").insert({ user_id: f.users[0].id, clan_id: f.clanId, item_id: old.id, pool_source: "clan", price_coins: 200, coin_transaction_id: tx.id }).select("id").single());
    assert.equal((await access()).emojiSlots, 19);
    assert.deepEqual(await voidPurchase(purchase.id), { ok: true });
    assert.equal((await access()).emojiSlots, 9); assert.equal(await balance(), 1600);
  });
});
