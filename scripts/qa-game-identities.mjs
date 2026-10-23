import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { QA_SEED_ACCOUNTS, qaFixtureEmail, qaFixtureBattleTag } from "./fixtures/qa-fixtures.mjs";

export function qaIdentityPatch(account, profile) {
  const patch = {};
  if (profile.games.slug === "overwatch" && !profile.battle_tag) patch.battle_tag = qaFixtureBattleTag(account.rolePascal, account.numbering);
  if (["valorant", "lol"].includes(profile.games.slug) && !profile.riot_id) patch.riot_id = `QA${account.rolePascal}${account.numbering}#QA1`;
  if (!profile.is_verified && ["overwatch", "valorant", "lol"].includes(profile.games.slug)) patch.is_verified = true;
  return patch;
}

async function main() {
  const env = loadTestEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  async function ok(query) { const { data, error } = await query; if (error) throw error; return data; }
  const accounts = new Map(QA_SEED_ACCOUNTS.map((a) => [qaFixtureEmail(a.rolePascal, a.numbering).toLowerCase(), a]));
  const users = await ok(db.from("users").select("id,email,coin_balance").in("email", [...accounts.keys()]));
  const ids = users.map((u) => u.id);
  if (!ids.length) throw new Error("No allowlisted QA accounts found");
  const profiles = await ok(db.from("user_game_profiles").select("user_id,game_id,game_uid,battle_tag,riot_id,is_verified,games(slug)").in("user_id", ids));
  const changes = profiles.flatMap((profile) => {
    const user = users.find((u) => u.id === profile.user_id);
    const account = accounts.get(user.email.toLowerCase());
    assert.ok(account);
    const patch = qaIdentityPatch(account, profile);
    return Object.keys(patch).length ? [{ profile, patch }] : [];
  });
  console.log(JSON.stringify({ apply: process.argv.includes("--apply"), accounts: users.length, changes: changes.map(({ profile, patch }) => ({ game: profile.games.slug, ...patch })) }));
  if (!process.argv.includes("--apply")) return;
  const snapshot = () => Promise.all([
    ok(db.from("user_housing_rooms").select("*").in("user_id", ids).order("user_id")),
    ok(db.from("user_housing_inventory").select("*").in("user_id", ids).order("id")),
    ok(db.from("users").select("id,coin_balance").in("id", ids).order("id")),
  ]);
  const before = await snapshot();
  for (const { profile, patch } of changes) {
    let update = db.from("user_game_profiles").update(patch).eq("user_id", profile.user_id).eq("game_id", profile.game_id).eq("is_verified", profile.is_verified);
    if ("battle_tag" in patch) update = profile.battle_tag === null ? update.is("battle_tag", null) : update.eq("battle_tag", profile.battle_tag);
    if ("riot_id" in patch) update = profile.riot_id === null ? update.is("riot_id", null) : update.eq("riot_id", profile.riot_id);
    assert.equal((await ok(update.select("user_id"))).length, 1, "QA identity changed concurrently; inspect before retrying");
  }
  const after = await ok(db.from("user_game_profiles").select("user_id,game_id,game_uid,battle_tag,riot_id,is_verified").in("user_id", ids));
  for (const old of profiles) {
    const current = after.find((p) => p.user_id === old.user_id && p.game_id === old.game_id);
    assert.equal(current.game_uid, old.game_uid);
    const change = changes.find((c) => c.profile === old);
    for (const [key, value] of Object.entries(change?.patch ?? {})) assert.equal(current[key], value);
  }
  assert.deepEqual(await snapshot(), before, "Balances and room/inventory must stay unchanged");
  console.log(`Verified ${changes.length} QA identity updates; provider IDs, coins and housing preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
