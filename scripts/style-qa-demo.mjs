import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { QA_CLAN_ACCOUNT_EMAILS } from "./fixtures/qa-fixtures.mjs";

const clanId = "73441bc9-2ffd-4789-8da4-f50423073706";
const banner = "/images/demo/qa-clan-banner.webp";
const names = ["새벽별", "달빛고양이", "AimZero", "구름여우", "NeonPulse", "힐링모찌",
  "한판더", "감자에임", "Luna", "BlueFox", "바람결", "Ctrl힐"];
const apply = process.argv.includes("--apply");
assert(process.argv.slice(2).every((arg) => arg === "--apply"));
await access(new URL("../public/images/demo/qa-clan-banner.webp", import.meta.url));
const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function checked(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
const clan = await checked(db.from("clans").select("name,banner_url").eq("id", clanId).single());
assert.equal(clan.name, "QA_01_Clan");
const members = await checked(db.from("clan_members").select("user_id,role").eq("clan_id", clanId).eq("status", "active"));
const people = await checked(db.from("users").select("id,email,nickname,coin_balance")
  .in("id", members.map((m) => m.user_id)).order("email"));
assert.deepEqual(people.map((p) => p.email.toLowerCase()), QA_CLAN_ACCOUNT_EMAILS);
assert(members.some((m) => m.role === "leader" && m.user_id === people[0].id));
const ids = new Set(people.map((p) => p.id));
const collisions = await checked(db.from("users").select("id").in("nickname", names));
assert(collisions.every((p) => ids.has(p.id)), "A demo nickname is already used outside the QA clan");
for (const [i, person] of people.entries()) {
  const original = i === 0 ? "QA_Leader_01" : `QA_Member_${String(i + 1).padStart(2, "0")}`;
  assert([original, names[i]].includes(person.nickname), "Refusing to overwrite a separately edited display name");
}
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: clan.name,
  banner, displayNames: names, changes: people.filter((p, i) => p.nickname !== names[i]).length }));
if (apply) {
  for (const [i, person] of people.entries()) {
    if (person.nickname === names[i]) continue;
    await checked(db.from("users").update({ nickname: names[i] }).eq("id", person.id).eq("nickname", person.nickname));
  }
  await checked(db.from("clans").update({ banner_url: banner }).eq("id", clanId));
  const saved = await checked(db.from("users").select("id,email,nickname,coin_balance")
    .in("id", [...ids]).order("email"));
  assert.deepEqual(saved.map((p) => p.nickname), names);
  const identity = ({ id, email, coin_balance }) => ({ id, email, coin_balance });
  assert.deepEqual(saved.map(identity), people.map(identity));
  assert.equal((await checked(db.from("clans").select("banner_url").eq("id", clanId).single())).banner_url, banner);
  console.log("Banner and 12 display names verified; login identities and coin balances preserved.");
}
