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

test("housing preserves personal coin accounting, ownership and atomic revisioned layouts", async (t) => {
  const f = await createIsolatedBalanceFixture(2);
  const clients = await Promise.all([f.memberClient(0), f.memberClient(1)]);
  t.after(async () => {
    for (const client of clients) await ok(client.auth.signOut());
    await f.cleanup();
  });
  const [owner, other] = clients;
  const env = loadTestEnv();
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  await ok(f.service.from("users").update({ coin_balance: 1000 }).eq("id", f.users[0].id));
  await ok(f.service.from("users").update({ coin_balance: 0 }).eq("id", f.users[1].id));
  const clanBefore = (await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance;
  const read = (client = owner) => ok(client.rpc("get_my_housing"));
  const buy = (catalogId, client = owner) => client.rpc("purchase_housing_furniture", { p_catalog_id: catalogId });
  const ledger = (index = 0) => ok(f.service.from("coin_transactions")
    .select("id,user_id,clan_id,pool_type,amount,reason,reference_type,reference_id,balance_after,created_by")
    .eq("user_id", f.users[index].id).order("created_at"));
  const save = (revision, placements, overrides = {}, client = owner) => client.rpc("save_my_housing_room", {
    p_revision: revision, p_wallpaper: "sage", p_floor: "walnut", p_placements: placements, ...overrides,
  });
  let state;
  let otherState;

  await t.test("initialization is idempotent, owns three placed starters and never grants or spends coins", async () => {
    const states = await Promise.all([read(), read()]);
    assert.deepEqual(states[0], states[1]);
    state = states[0];
    otherState = await read(other);
    assert.equal(state.catalog.length, 16);
    assert.equal(state.coinBalance, 1000);
    assert.equal(otherState.coinBalance, 0);
    assert.equal(state.room.revision, 0);
    assert.deepEqual(state.inventory.map((i) => i.catalogId).sort(), ["low-table", "mint-sofa", "small-plant"]);
    assert.ok(state.inventory.every((i) => i.x !== null && i.y !== null && i.rotation === 0));
    assert.deepEqual(await ledger(), []);
    assert.deepEqual(await ledger(1), []);
  });

  await t.test("concurrent duplicate purchases debit and record exactly once, with server-owned pricing", async () => {
    const purchased = await Promise.all([buy("oak-desk"), buy("oak-desk"), buy("oak-desk")]);
    for (const result of purchased) assert.equal(result.error, null, result.error?.message);
    state = await read();
    assert.equal(state.coinBalance, 820);
    assert.equal(state.inventory.filter((i) => i.catalogId === "oak-desk").length, 1);
    const desk = state.inventory.find((i) => i.catalogId === "oak-desk");
    assert.equal(desk.x, null);
    assert.equal(desk.y, null);
    const entries = await ledger();
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], {
      id: entries[0].id, user_id: f.users[0].id, clan_id: null, pool_type: "personal", amount: -180,
      reason: "purchase_housing", reference_type: "housing_purchase", reference_id: desk.id,
      balance_after: 820, created_by: f.users[0].id,
    });
    const owned = await ok(f.service.from("user_housing_inventory").select("acquired_price,coin_transaction_id").eq("id", desk.id).single());
    assert.deepEqual(owned, { acquired_price: 180, coin_transaction_id: entries[0].id });
    const forged = await owner.rpc("purchase_housing_furniture", { p_catalog_id: "single-bed", p_price: 0 });
    assert.ok(forged.error);
    assert.deepEqual(await read(), state);
    assert.ok((await buy("not-a-furniture")).error);
    assert.deepEqual(await read(), state);
    assert.deepEqual(await ok(buy("oak-desk")), state);
    state = await ok(buy("single-bed"));
    assert.equal(state.coinBalance, 560);
    assert.equal(1000 + (await ledger()).reduce((sum, row) => sum + row.amount, 0), state.coinBalance);
    assert.equal((await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance, clanBefore);
  });

  await t.test("insufficient funds and competing purchases preserve balances, inventory and immutable ledger", async () => {
    assert.equal((await buy("oak-desk", other)).error?.message, "housing_insufficient_coins");
    assert.deepEqual(await read(other), otherState);
    assert.deepEqual(await ledger(1), []);
    await ok(f.service.from("users").update({ coin_balance: 100 }).eq("id", f.users[1].id));
    const attempts = await Promise.all([buy("cat-cushion", other), buy("reading-lamp", other)]);
    assert.equal(attempts.filter((result) => !result.error).length, 1);
    assert.equal(attempts.filter((result) => result.error?.message === "housing_insufficient_coins").length, 1);
    otherState = await read(other);
    assert.ok(otherState.coinBalance === 10 || otherState.coinBalance === 30);
    const entries = await ledger(1);
    assert.equal(entries.length, 1);
    assert.equal(100 + entries[0].amount, otherState.coinBalance);
    assert.equal(entries[0].balance_after, otherState.coinBalance);
    assert.equal(otherState.inventory.length, 4);
    assert.deepEqual(await read(), state);
  });

  await t.test("RLS isolates owners and anonymous users cannot read or execute; direct mutation and forged actors fail", async () => {
    assert.deepEqual(await ok(other.from("user_housing_inventory").select("id").eq("user_id", f.users[0].id)), []);
    assert.deepEqual(await ok(other.from("user_housing_rooms").select("user_id").eq("user_id", f.users[0].id)), []);
    assert.ok((await anon.from("housing_catalog").select("id")).error);
    assert.ok((await anon.from("user_housing_rooms").select("user_id")).error);
    assert.ok((await anon.from("user_housing_inventory").select("id")).error);
    for (const client of [anon, f.service]) {
      assert.equal((await client.rpc("get_my_housing")).error?.code, "42501");
      assert.equal((await buy("oak-desk", client)).error?.code, "42501");
      assert.equal((await save(0, [], {}, client)).error?.code, "42501");
    }
    for (const query of [
      owner.from("users").update({ coin_balance: 999999 }).eq("id", f.users[0].id),
      owner.from("housing_catalog").update({ price: 0 }).eq("id", "oak-desk"),
      owner.from("housing_catalog").insert({ id: "forged-free-item", name: "free", description: "", category: "decor", price: 0, width: 1, depth: 1, visual_key: "x", is_starter: true, sort_order: 99 }),
      owner.from("user_housing_inventory").insert({ user_id: f.users[0].id, catalog_id: "gaming-chair", acquired_price: 0 }),
      owner.from("user_housing_inventory").update({ x: 0 }).eq("user_id", f.users[0].id),
      owner.from("user_housing_inventory").delete().eq("user_id", f.users[0].id),
      owner.from("user_housing_rooms").update({ revision: 0 }).eq("user_id", f.users[0].id),
      owner.from("user_housing_rooms").delete().eq("user_id", f.users[0].id),
    ]) assert.equal((await query).error?.code, "42501");
    assert.ok((await owner.rpc("get_my_housing", { p_user_id: f.users[1].id })).error);
    const entries = await ledger();
    for (const query of [
      owner.from("coin_transactions").update({ amount: 999 }).eq("id", entries[0].id).select("id"),
      owner.from("coin_transactions").delete().eq("id", entries[0].id).select("id"),
    ]) {
      const result = await query;
      assert.ok(result.error || result.data.length === 0);
    }
    assert.ok((await owner.from("coin_transactions").insert({
      user_id: f.users[0].id, pool_type: "personal", amount: 999, reason: "forged_housing", reference_type: "housing_purchase",
      reference_id: randomUUID(), balance_after: 999, created_by: f.users[0].id,
    })).error);
    assert.deepEqual(await ledger(), entries);
    assert.deepEqual(await read(), state);
    assert.deepEqual(await read(other), otherState);
    assert.equal((await ok(f.service.from("housing_catalog").select("price").eq("id", "oak-desk").single())).price, 180);
  });

  await t.test("save moves, rotates and stores owned furniture atomically without touching coins", async () => {
    const desk = state.inventory.find((i) => i.catalogId === "oak-desk");
    const bed = state.inventory.find((i) => i.catalogId === "single-bed");
    const entries = await ledger();
    state = await ok(save(state.room.revision, [
      { inventoryId: desk.id, x: 5, y: 0, rotation: 1 },
      { inventoryId: bed.id, x: 2, y: 3, rotation: 1 },
    ]));
    assert.deepEqual(state.room, { revision: 1, wallpaper: "sage", floor: "walnut" });
    assert.deepEqual(state.inventory.find((i) => i.id === desk.id), { ...desk, x: 5, y: 0, rotation: 1 });
    assert.deepEqual(state.inventory.find((i) => i.id === bed.id), { ...bed, x: 2, y: 3, rotation: 1 });
    assert.equal(state.inventory.filter((i) => i.x === null && i.y === null).length, 3);
    assert.equal(state.coinBalance, 560);
    assert.deepEqual(await ledger(), entries);
    assert.deepEqual(await read(other), otherState);
  });

  await t.test("invalid ownership, duplicate ids, overlap, rotations and bounds preserve the entire saved room", async () => {
    const desk = state.inventory.find((i) => i.catalogId === "oak-desk");
    const bed = state.inventory.find((i) => i.catalogId === "single-bed");
    const valid = { inventoryId: desk.id, x: 0, y: 0, rotation: 0 };
    const invalidLayouts = [
      [valid, { inventoryId: randomUUID(), x: 2, y: 0, rotation: 0 }],
      [valid, { inventoryId: otherState.inventory[0].id, x: 2, y: 0, rotation: 0 }],
      [valid, { ...valid, x: 2 }],
      [valid, { ...valid, inventoryId: valid.inventoryId.toUpperCase(), x: 2 }],
      [valid, { inventoryId: bed.id, x: 1, y: 0, rotation: 1 }],
      [{ inventoryId: desk.id, x: 5, y: 0, rotation: 0 }],
      [{ inventoryId: desk.id, x: 0, y: 5, rotation: 1 }],
      [{ inventoryId: bed.id, x: 4, y: 3, rotation: 1 }],
      [{ inventoryId: bed.id, x: 2, y: 4, rotation: 0 }],
      [{ ...valid, x: -1 }], [{ ...valid, y: 6 }], [{ ...valid, x: 1.5 }],
      [{ ...valid, rotation: 4 }], [{ ...valid, rotation: -1 }], [{ ...valid, x: "0" }],
      [{ ...valid, inventoryId: "invalid" }], [{ inventoryId: desk.id, x: 0, y: 0 }],
      [null], null, {}, "invalid", Array(37).fill(valid),
    ];
    const entries = await ledger();
    for (const placements of invalidLayouts) {
      const result = await save(state.room.revision, placements, { p_wallpaper: "rose" });
      assert.ok(result.error, `Expected invalid layout: ${JSON.stringify(placements)}`);
      assert.deepEqual(await read(), state);
    }
    for (const overrides of [{ p_revision: -1 }, { p_revision: null }, { p_wallpaper: null }, { p_wallpaper: "forged" }, { p_floor: "forged" }]) {
      assert.ok((await save(state.room.revision, [], overrides)).error);
      assert.deepEqual(await read(), state);
    }
    assert.deepEqual(await ledger(), entries);
  });

  await t.test("stale tabs fail, concurrent saves choose one complete room, storage remains permanent", async () => {
    const desk = state.inventory.find((i) => i.catalogId === "oak-desk");
    const originalInventoryIds = state.inventory.map((i) => i.id).sort();
    const oldRevision = state.room.revision;
    const attempts = await Promise.all([
      save(oldRevision, [{ inventoryId: desk.id, x: 0, y: 0, rotation: 2 }], { p_wallpaper: "rose" }),
      save(oldRevision, [{ inventoryId: desk.id, x: 4, y: 4, rotation: 3 }], { p_wallpaper: "midnight" }),
    ]);
    assert.equal(attempts.filter((result) => !result.error).length, 1);
    assert.equal(attempts.filter((result) => result.error?.message === "housing_stale_revision").length, 1);
    state = await read();
    assert.deepEqual(state, attempts.find((result) => !result.error).data);
    assert.equal(state.room.revision, oldRevision + 1);
    assert.equal((await save(oldRevision, [])).error?.message, "housing_stale_revision");
    assert.deepEqual(await read(), state);
    state = await ok(save(state.room.revision, []));
    assert.ok(state.inventory.every((i) => i.x === null && i.y === null));
    assert.deepEqual(state.inventory.map((i) => i.id).sort(), originalInventoryIds);
    assert.deepEqual(await read(), state, "loading must not re-place stored starter furniture");
    assert.deepEqual(await ok(buy("oak-desk")), state, "repeated purchase must not reset stored furniture");
    assert.equal((await ledger()).length, 2);
    assert.equal(state.coinBalance, 560);
    assert.equal((await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single())).coin_balance, clanBefore);
  });
});
