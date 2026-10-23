import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv(), options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
async function ok(query) { const result = await query; assert.equal(result.error, null, result.error?.message); return result.data; }
async function denied(query, code = "42501") { const { error } = await query; assert.equal(error?.code, code, error?.message ?? "Unexpectedly allowed"); }

test("account emblem picks keep three ordered references with owner-only reads and service-only writes", async t => {
  const users = [];
  t.after(async () => { for (const user of users) { await user.client.auth.signOut(); await ok(service.auth.admin.deleteUser(user.id)); } });
  for (let index = 0; index < 2; index++) {
    const email = `account-emblems-${randomUUID()}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(service.auth.admin.createUser({ email, password, email_confirm: true }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client }); await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [owner, peer] = users, table = "account_personal_emblem_picks";
  const keys = [randomUUID() + ":milestone-wins-1", randomUUID() + ":month-2025-02-승률", randomUUID() + ":milestone-wins-1"];
  await t.test("a user with no active clan can read the account's exact three references and order", async () => {
    await ok(service.from(table).insert({ user_id: owner.id, emblem_keys: keys }));
    assert.deepEqual((await ok(owner.client.from(table).select("emblem_keys").single())).emblem_keys, keys);
    assert.deepEqual(await ok(peer.client.from(table).select("*").eq("user_id", owner.id)), []);
    await denied(anon.from(table).select("*"));
  });
  await t.test("owners and peers cannot forge, replace or delete account picks through the data API", async () => {
    for (const actor of users) {
      await denied(actor.client.from(table).insert({ user_id: actor.id, emblem_keys: [] }));
      await denied(actor.client.from(table).upsert({ user_id: owner.id, emblem_keys: [] }));
      await denied(actor.client.from(table).update({ emblem_keys: [] }).eq("user_id", owner.id));
      await denied(actor.client.from(table).delete().eq("user_id", owner.id));
    }
  });
  await t.test("the database rejects more than three, null and multidimensional references", async () => {
    for (const invalid of [[...keys, keys[0]], [keys[0], null], [[keys[0]]]])
      await denied(service.from(table).update({ emblem_keys: invalid }).eq("user_id", owner.id), "23514");
    await denied(service.from(table).update({ emblem_keys: null }).eq("user_id", owner.id), "23502");
    assert.deepEqual((await ok(owner.client.from(table).select("emblem_keys").single())).emblem_keys, keys);
  });
  await t.test("an explicitly empty selection persists independently of any clan", async () => {
    await ok(service.from(table).upsert({ user_id: owner.id, emblem_keys: [] }));
    assert.deepEqual((await ok(owner.client.from(table).select("emblem_keys").single())).emblem_keys, []);
  });
});
