import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { qaFixtureEmail } from "./fixtures/qa-fixtures.mjs";

const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function ok(query) { const { data, error } = await query; if (error) throw error; return data; }
const user = await ok(db.from("users").select("id").eq("email", qaFixtureEmail("Leader", "01").toLowerCase()).single());
const game = await ok(db.from("games").select("id").eq("slug", "overwatch").single());
const memberships = await ok(db.from("clan_members").select("clan_id,clans!inner(name,game_id)").eq("user_id", user.id).eq("role", "leader").eq("status", "active").eq("clans.game_id", game.id));
assert.equal(memberships.length, 1, "Expected one QA Overwatch leader membership");
assert.equal(memberships[0].clans.name, "QA_01_Clan", "Only the allowlisted QA clan can receive samples");
const profile = await ok(db.from("user_game_profiles").select("is_verified").eq("user_id", user.id).eq("game_id", game.id).single());
assert.equal(profile.is_verified, true, "QA game identity must already be verified");
const samples = ["QALeaderAlt01#1101", "QALeaderAlt02#1102"];
const snapshot = () => ok(db.from("user_alt_accounts").select("*").eq("user_id", user.id).eq("game_id", game.id).order("id"));
const before = await snapshot();
const missing = samples.filter(name => !before.some(row => row.alt_nick === name));
console.log(JSON.stringify({ apply: process.argv.includes("--apply"), account: "QA_Leader_01", game: "overwatch", existing: before.length, add: missing }));
if (process.argv.includes("--apply")) {
  if (missing.length) await ok(db.from("user_alt_accounts").upsert(missing.map(alt_nick => ({ user_id: user.id, game_id: game.id, alt_nick, note: "QA 미리보기용 임시 부계정" })), { onConflict: "user_id,game_id,alt_nick", ignoreDuplicates: true }));
  const after = await snapshot();
  assert.deepEqual(after.filter(row => before.some(previous => previous.id === row.id)), before, "Existing alternate accounts must stay unchanged");
  assert.ok(samples.every(name => after.some(row => row.alt_nick === name)));
  console.log(`Verified ${samples.length} QA sample alternate accounts; existing rows preserved.`);
}
