import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { qaFixtureEmail } from "./fixtures/qa-fixtures.mjs";

// Add only the leader's missing QA demo records; never reseed or overwrite a profile.
const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
assert(process.argv.slice(2).every((arg) => arg === "--apply"), "Only --apply is supported");
const apply = process.argv.includes("--apply");
const demoClanId = "725f86a1-6537-42d7-9d55-591e3c1adc7c";
const demoClanName = "QA_01_Valorant_Clan";
const demoRiotId = "QALeader01#QA1";
async function checked(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
const leader = await checked(db.from("users").select("*").eq("email", qaFixtureEmail("Leader", "01").toLowerCase()).single());
const game = await checked(db.from("games").select("id").eq("slug", "valorant").eq("is_active", true).single());
const memberships = await checked(db.from("clan_members").select("*,clans!inner(id,name,game_id)").eq("user_id", leader.id).order("id"));
const profiles = await checked(db.from("user_game_profiles").select("*").eq("user_id", leader.id).order("id"));
const existingProfile = profiles.find((profile) => profile.game_id === game.id);
if (existingProfile) assert(existingProfile.is_verified && existingProfile.riot_id, "Existing Valorant profile requires manual review; it will not be overwritten");
const valorantMembership = memberships.find((member) => member.clans.game_id === game.id);
if (valorantMembership) assert.equal(valorantMembership.status, "active", "Existing Valorant membership will not be changed");
const clanId = valorantMembership?.clan_id ?? demoClanId;
const existingClan = await checked(db.from("clans").select("id,name,game_id").eq("id", clanId).maybeSingle());
if (existingClan) {
  assert.equal(existingClan.game_id, game.id);
  if (!valorantMembership) assert.equal(existingClan.name, demoClanName);
}

const preserved = async () => Promise.all([
  checked(db.from("users").select("*").eq("id", leader.id).single()),
  checked(db.from("user_housing_rooms").select("*").eq("user_id", leader.id)),
  checked(db.from("user_housing_inventory").select("*").eq("user_id", leader.id).order("id")),
  checked(db.from("user_namecard_selections").select("*").eq("user_id", leader.id).order("category")),
  checked(db.from("profile_visibility").select("*").eq("user_id", leader.id)),
  checked(db.from("clans").select("*").in("id", memberships.map((member) => member.clan_id)).order("id")),
]);
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: existingClan?.name ?? demoClanName,
  riotId: existingProfile?.riot_id ?? demoRiotId, addClan: !existingClan, addGameProfile: !existingProfile, addMembership: !valorantMembership }));
if (apply) {
  const before = await preserved();
  if (!existingProfile) await checked(db.from("user_game_profiles").insert({ user_id: leader.id, game_id: game.id,
    game_uid: `qa_valorant_${leader.id.replaceAll("-", "")}`, riot_id: demoRiotId, is_verified: true, verified_at: new Date().toISOString() }));
  if (!existingClan) await checked(db.from("clans").insert({ id: clanId, game_id: game.id, name: demoClanName,
    description: "QA 리더 프로필의 다중 게임 클랜 카드 확인용입니다." }));
  if (!valorantMembership) await checked(db.from("clan_members").insert({ clan_id: clanId, user_id: leader.id, role: "leader", status: "active" }));

  const afterProfiles = await checked(db.from("user_game_profiles").select("*").eq("user_id", leader.id).order("id"));
  const afterMemberships = await checked(db.from("clan_members").select("*,clans!inner(id,name,game_id)").eq("user_id", leader.id).order("id"));
  for (const profile of profiles) assert.deepEqual(afterProfiles.find((row) => row.id === profile.id), profile);
  for (const member of memberships) assert.deepEqual(afterMemberships.find((row) => row.id === member.id), member);
  assert.equal(afterProfiles.length, profiles.length + Number(!existingProfile));
  assert.equal(afterMemberships.length, memberships.length + Number(!valorantMembership));
  assert(afterProfiles.some((row) => row.game_id === game.id && row.is_verified && row.riot_id === (existingProfile?.riot_id ?? demoRiotId)));
  assert(afterMemberships.some((row) => row.clan_id === clanId && row.status === "active"));
  assert.deepEqual(await preserved(), before, "Existing account, coins, clans, room, inventory, namecard and privacy must be preserved");
  console.log("Verified Valorant clan/profile addition; existing account, game profiles, memberships, coins and room data preserved.");
}
