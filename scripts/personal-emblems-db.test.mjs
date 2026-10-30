import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv(), options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const table = "clan_personal_emblem_picks";
async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
async function denied(query, code = "42501") { const { error } = await query; assert.equal(error?.code, code, error?.message ?? "Forbidden operation unexpectedly succeeded"); }

test("personal emblem picks keep service-only writes and owner/current-membership reads", async (t) => {
  const tag = randomUUID().slice(0, 8), users = [], clans = [];
  t.after(async () => {
    for (const id of clans) await ok(svc.from("clans").delete().eq("id", id));
    for (const user of users) { await ok(user.client.auth.signOut()); await ok(svc.auth.admin.deleteUser(user.id)); }
  });
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  for (let i = 0; i < 3; i++) {
    const email = `emblem-${tag}-${i}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { birth_year: 2000 } }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client }); await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [owner, member, outsider] = users;
  const clan = await ok(svc.from("clans").insert({ game_id: game.id, name: `Emblem-${tag}` }).select("id").single()); clans.push(clan.id);
  const otherClan = await ok(svc.from("clans").insert({ game_id: game.id, name: `Emblem-other-${tag}` }).select("id").single()); clans.push(otherClan.id);
  await ok(svc.from("clan_members").insert(users.slice(0, 2).map((user, i) => ({ clan_id: clan.id, user_id: user.id, status: "active", role: i === 0 ? "leader" : "member" }))));
  const keys = ["milestone-sessions-1", "milestone-matches-1", "milestone-wins-1"];
  const ownRow = { clan_id: clan.id, user_id: owner.id, emblem_keys: keys };
  const ownerRead = () => ok(owner.client.from(table).select("*").eq("clan_id", clan.id));

  await t.test("service saves at most three and the owner reads only their current clan row", async () => {
    const saved = await ok(svc.from(table).upsert(ownRow).select("*").single());
    assert.deepEqual(saved.emblem_keys, keys); assert.ok(Number.isFinite(Date.parse(saved.updated_at)));
    await ok(svc.from(table).insert([
      { clan_id: clan.id, user_id: member.id, emblem_keys: [keys[1]] },
      { clan_id: clan.id, user_id: outsider.id, emblem_keys: [keys[2]] },
      { clan_id: otherClan.id, user_id: owner.id, emblem_keys: [keys[0]] },
    ]));
    const own = await ownerRead(); assert.equal(own.length, 1); assert.equal(own[0].user_id, owner.id); assert.deepEqual(own[0].emblem_keys, keys);
    const memberRows = await ok(member.client.from(table).select("*").eq("clan_id", clan.id));
    assert.deepEqual(memberRows.map((row) => row.user_id), [member.id]);
    assert.deepEqual(await ok(member.client.from(table).select("*").eq("clan_id", clan.id).eq("user_id", owner.id)), []);
    assert.deepEqual(await ok(outsider.client.from(table).select("*").eq("clan_id", clan.id)), []);
    assert.deepEqual(await ok(owner.client.from(table).select("*").eq("clan_id", otherClan.id)), []);
    await denied(anon.from(table).select("*").eq("clan_id", clan.id));
  });
  await t.test("authenticated owners, peers and outsiders cannot insert, upsert, update or delete picks", async () => {
    for (const actor of users) {
      await denied(actor.client.from(table).insert({ ...ownRow, user_id: actor.id }));
      await denied(actor.client.from(table).upsert({ ...ownRow, user_id: actor.id, emblem_keys: [] }));
      await denied(actor.client.from(table).update({ emblem_keys: [] }).eq("clan_id", clan.id).eq("user_id", owner.id));
      await denied(actor.client.from(table).delete().eq("clan_id", clan.id).eq("user_id", owner.id));
    }
    assert.deepEqual((await ownerRead())[0].emblem_keys, keys);
  });
  await t.test("database rejects oversized, multidimensional, null and null-element arrays", async () => {
    for (const invalid of [[...keys, "milestone-wins-2"], [[keys[0]]], [keys[0], null]]) {
      await denied(svc.from(table).update({ emblem_keys: invalid }).eq("clan_id", clan.id).eq("user_id", owner.id), "23514");
    }
    await denied(svc.from(table).update({ emblem_keys: null }).eq("clan_id", clan.id).eq("user_id", owner.id), "23502");
    assert.deepEqual((await ownerRead())[0].emblem_keys, keys);
  });
  await t.test("empty picks persist and service updates/deletes remain available", async () => {
    const updatedAt = new Date().toISOString();
    await ok(svc.from(table).upsert({ ...ownRow, emblem_keys: [], updated_at: updatedAt }));
    const [empty] = await ownerRead(); assert.deepEqual(empty.emblem_keys, []); assert.equal(Date.parse(empty.updated_at), Date.parse(updatedAt));
    await ok(svc.from(table).delete().eq("clan_id", clan.id).eq("user_id", member.id));
    assert.deepEqual(await ok(member.client.from(table).select("*").eq("clan_id", clan.id)), []);
    const defaults = await ok(svc.from(table).insert({ clan_id: clan.id, user_id: member.id }).select("*").single());
    assert.deepEqual(defaults.emblem_keys, []);
  });
  await t.test("leaving hides even the former member's own picks and the same identity can read after return", async () => {
    await ok(svc.from("clan_members").update({ status: "left" }).eq("clan_id", clan.id).eq("user_id", member.id));
    assert.deepEqual(await ok(member.client.from(table).select("*").eq("clan_id", clan.id)), []);
    await ok(svc.from("clan_members").update({ status: "active" }).eq("clan_id", clan.id).eq("user_id", member.id));
    assert.equal((await ok(member.client.from(table).select("*").eq("clan_id", clan.id))).length, 1);
  });
});
