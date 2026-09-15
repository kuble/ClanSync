import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("badge strip saves are atomic, authenticated and ordered", async (t) => {
  const users = [];
  const badgeIds = [];
  const tag = randomUUID().slice(0, 8);
  t.after(async () => {
    for (const user of users) {
      await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
    if (badgeIds.length) await ok(svc.from("badges").delete().in("id", badgeIds));
  });

  const games = await ok(svc.from("games").select("id,slug").in("slug", ["overwatch", "valorant"]));
  const gameId = games.find((game) => game.slug === "overwatch")?.id;
  const otherGameId = games.find((game) => game.slug === "valorant")?.id;
  assert.ok(gameId && otherGameId);
  for (let i = 0; i < 2; i++) {
    const email = `badge-${tag}-${i}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { nickname: `bd_${tag}_${i}`, birth_year: 2000 },
    }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client });
    await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [owner, other] = users;
  async function badge(suffix, overrides = {}) {
    const result = await ok(svc.from("badges").insert({
      game_id: gameId, category: "clansync", code: `badge-qa-${tag}-${suffix}`,
      name_ko: `QA ${suffix}`, description: "Isolated badge transaction regression fixture",
      icon: "QA", unlock_source: "achievement", unlock_condition: { always: true },
      ...overrides,
    }).select("id").single());
    badgeIds.push(result.id);
    return result.id;
  }
  const starterIds = [];
  for (let i = 0; i < 6; i++) starterIds.push(await badge(`starter-${i}`));
  const ownedId = await badge("owned", { unlock_source: "event", unlock_condition: {} });
  const lockedId = await badge("other-owned", { unlock_source: "event", unlock_condition: {} });
  const inactiveId = await badge("inactive", { is_active: false });
  const wrongGameId = await badge("wrong-game", { game_id: otherGameId });
  await ok(svc.from("user_badge_unlocks").insert([
    { user_id: owner.id, badge_id: ownedId },
    { user_id: other.id, badge_id: lockedId },
  ]));

  const save = (user, ids, gid = gameId) => user.client.rpc("save_my_badge_picks", {
    p_game_id: gid, p_ordered_badge_ids: ids,
  });
  const read = (user, gid = gameId) => ok(svc.from("user_badge_picks")
    .select("user_id,game_id,slot_index,badge_id,updated_at")
    .eq("user_id", user.id).eq("game_id", gid).order("slot_index"));
  async function assertStrip(user, expected, gid = gameId) {
    const rows = await read(user, gid);
    assert.deepEqual(rows.map((row) => row.badge_id), expected);
    assert.deepEqual(rows.map((row) => row.slot_index), expected.map((_, index) => index));
  }

  await t.test("saves five badges in order, including unlocked and always-available badges", async () => {
    const selected = [starterIds[3], ownedId, starterIds[0], starterIds[2], starterIds[1]];
    await ok(save(owner, selected));
    await assertStrip(owner, selected);
  });

  await t.test("later invalid inserts roll back the deletion and preserve all existing rows", async () => {
    const before = await read(owner);
    for (const invalidId of [lockedId, inactiveId, wrongGameId, randomUUID()]) {
      const { error } = await save(owner, [starterIds[5], invalidId]);
      assert.ok(error, `Expected rejected badge ${invalidId}`);
      assert.deepEqual(await read(owner), before);
    }
  });

  await t.test("direct RPC rejects more than five, duplicates, null and multidimensional input", async () => {
    const before = await read(owner);
    for (const ids of [starterIds, [ownedId, ownedId], [null], null, [[ownedId]]]) {
      const { error } = await save(owner, ids);
      assert.equal(error?.code, "22023", JSON.stringify(error));
      assert.deepEqual(await read(owner), before);
    }
    const { error } = await save(owner, [], null);
    assert.equal(error?.code, "22023", JSON.stringify(error));
    assert.deepEqual(await read(owner), before);
  });

  await t.test("caller identity cannot be supplied; anon and service-only requests cannot execute", async () => {
    const before = await read(owner);
    for (const client of [anon, svc]) {
      const { error } = await client.rpc("save_my_badge_picks", {
        p_game_id: gameId, p_ordered_badge_ids: [],
      });
      assert.equal(error?.code, "42501", JSON.stringify(error));
    }
    const { error } = await other.client.rpc("save_my_badge_picks", {
      p_game_id: gameId, p_ordered_badge_ids: [], p_user_id: owner.id,
    });
    assert.ok(error);
    assert.deepEqual(await read(owner), before);
  });

  await t.test("owned badges and changes remain isolated by user and game", async () => {
    const before = await read(owner);
    assert.ok((await save(other, [ownedId])).error);
    await ok(save(other, [lockedId]));
    await assertStrip(other, [lockedId]);
    await ok(save(owner, [wrongGameId], otherGameId));
    await assertStrip(owner, [wrongGameId], otherGameId);
    assert.deepEqual(await read(owner), before);
  });

  await t.test("empty selection clears one strip and repacking produces dense slots", async () => {
    await ok(save(owner, []));
    await assertStrip(owner, []);
    await assertStrip(other, [lockedId]);
    await assertStrip(owner, [wrongGameId], otherGameId);
    await ok(save(owner, [ownedId, starterIds[0]]));
    await ok(save(owner, [starterIds[0]]));
    await assertStrip(owner, [starterIds[0]]);
  });

  await t.test("concurrent replacements of empty and populated strips never mix or fail", async () => {
    const first = starterIds.slice(0, 5);
    const second = [starterIds[5], ownedId];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt === 0) await ok(save(owner, []));
      const results = await Promise.all([save(owner, first), save(owner, second)]);
      for (const result of results) assert.equal(result.error, null, result.error?.message);
      const actual = (await read(owner)).map((row) => row.badge_id);
      assert.ok(JSON.stringify(actual) === JSON.stringify(first) || JSON.stringify(actual) === JSON.stringify(second));
      await assertStrip(owner, actual);
    }
    const results = await Promise.all([save(owner, []), save(owner, first)]);
    for (const result of results) assert.equal(result.error, null, result.error?.message);
    const actual = (await read(owner)).map((row) => row.badge_id);
    assert.ok(actual.length === 0 || JSON.stringify(actual) === JSON.stringify(first));
  });
});
