import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { buildVarietyHistory, summarizeVariety, VARIETY_CLAN_ID as CLAN_ID, VARIETY_TITLE } from "./fixtures/qa-stats-variety.mjs";

// Additive, resumable history import. Never runs the account/clan seed or awards coins.
const apply = process.argv.includes("--apply");
assert(process.argv.slice(2).every((arg) => arg === "--apply"), "Use no arguments (preview) or --apply.");
const env = loadTestEnv(); // Exact isolated QA project allowlist; production is rejected.
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = async (query) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
const chunks = (items, size = 40) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
async function all(table) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const page = await checked(db.from(table).select("*").eq("clan_id", CLAN_ID).order(table === "clan_settings" ? "clan_id" : "id").range(from, from + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
async function children(table, ids) {
  const rows = [];
  for (const group of chunks(ids)) {
    rows.push(...await checked(db.from(table).select("*").in("session_id", group).order("session_id").order("user_id")));
  }
  return rows;
}
const clan = await checked(db.from("clans").select("id,name,game_id,subscription_tier").eq("id", CLAN_ID).single());
assert.equal(clan.name, "QA_01_Clan");
assert.equal(clan.subscription_tier, "premium");
const members = await all("clan_members");
const people = await checked(db.from("users").select("id,nickname").in("id", members.filter((m) => m.status === "active").map((m) => m.user_id)).order("nickname"));
assert.deepEqual(people.map((p) => p.nickname), ["QA_Leader_01", ...Array.from({ length: 11 }, (_, i) => `QA_Member_${String(i + 2).padStart(2, "0")}`)]);
assert(members.some((m) => m.user_id === people[0].id && m.role === "leader"));
assert.equal((await checked(db.from("games").select("slug").eq("id", clan.game_id).single())).slug, "overwatch");
const history = buildVarietyHistory(people, clan.game_id);
const { series, rounds } = history;
const seriesIds = new Set(series.map((s) => s.id));
const roundIds = new Set(rounds.map(({ row }) => row.id));
assert(series.every((s) => Date.parse(s.closed_at) < Date.now()), "All fixtures must be historical.");
async function snapshot() {
  return {
    clan: await checked(db.from("clans").select("*").eq("id", CLAN_ID).single()),
    rooms: (await all("balance_rooms")).filter((r) => !seriesIds.has(r.id)),
    series: (await all("balance_session_series")).filter((r) => !seriesIds.has(r.id)),
    rounds: (await all("balance_sessions")).filter((r) => !roundIds.has(r.id)),
    members: await all("clan_members"), settings: await all("clan_settings"),
    coins: await checked(db.from("users").select("id,coin_balance").in("id", people.map((p) => p.id)).order("id")),
  };
}
const before = await snapshot();
const latestFixture = Math.max(...rounds.map(({ row }) => Date.parse(row.opened_at)));
assert(before.rounds.some((r) => Date.parse(r.opened_at) > latestFixture), "Do not change the latest source of inherited clan settings.");
const storedSeries = new Map((await all("balance_session_series")).map((s) => [s.id, s]));
const storedRounds = new Map((await all("balance_sessions")).map((r) => [r.id, r]));
for (const s of series) {
  const old = storedSeries.get(s.id);
  if (old) {
    assert.equal(Date.parse(old.opened_at), Date.parse(s.opened_at), "Fixture ID collision.");
    assert(old.closed_at, "Refusing to modify an open gathering.");
  }
}
for (const { row } of rounds) {
  const old = storedRounds.get(row.id);
  if (!old) continue;
  assert.equal(old.series_id, row.series_id, "Fixture ID collision.");
  assert.equal(Date.parse(old.opened_at), Date.parse(row.opened_at), "Fixture ID collision.");
  assert.deepEqual(old.roster, row.roster, "Existing fixture lineup differs; inspect instead of overwriting.");
  assert(old.closed_at || ["editing", "map_ban"].includes(old.phase), "Unexpected unfinished fixture state.");
}
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: clan.name, ...summarizeVariety(history), missingGatherings: series.filter((s) => !storedSeries.has(s.id)).length, unfinishedRounds: rounds.filter(({ row }) => !storedRounds.get(row.id)?.closed_at).length }));
if (!apply) process.exit(0);

for (const group of chunks(series.filter((s) => !storedSeries.has(s.id)))) await checked(db.from("balance_session_series").insert(group));
for (const group of chunks([...seriesIds])) await checked(db.from("balance_rooms").update({ title: VARIETY_TITLE }).in("id", group).eq("clan_id", CLAN_ID));
let completed = 0;
// Process round numbers in order so INSERT inheritance always sees its preceding
// round. Small batches keep ballot deadlines live without disabling DB guards.
for (let number = 1; number <= Math.max(...rounds.map(({ row }) => row.round_number)); number++) {
  for (const batch of chunks(rounds.filter(({ row }) => row.round_number === number), 20)) {
    const pending = batch.filter(({ row }) => !storedRounds.get(row.id)?.closed_at);
    const missing = pending.filter(({ row }) => !storedRounds.has(row.id));
    if (missing.length) await checked(db.from("balance_sessions").insert(missing.map(({ row }) => ({
      id: row.id, series_id: row.series_id, clan_id: CLAN_ID, game_id: clan.game_id, host_user_id: row.host_user_id,
      opened_at: row.opened_at, round_number: number, roster: row.roster,
      phase: number === 1 ? "editing" : "map_ban",
      map_candidates: row.map_candidates,
      map_ban_deadline_at: number === 1 ? null : new Date(Date.now() + 300_000).toISOString(),
    }))));
    const editing = pending.filter(({ row }) => storedRounds.get(row.id)?.phase === "editing" || (number === 1 && !storedRounds.has(row.id)));
    if (editing.length) {
      await checked(db.from("balance_sessions").update({
        formation_settings: { roles: "manual", teams: "keep", predictionEnabled: true },
        map_ban_enabled: true, map_ban_seconds: 300, map_types: [], hero_ban_enabled: true, hero_bans_per_team: 1,
      }).in("id", editing.map(({ row }) => row.id)).eq("clan_id", CLAN_ID).eq("phase", "editing").is("closed_at", null));
      for (const { row } of editing) await checked(db.from("balance_sessions").update({ phase: "map_ban", map_candidates: row.map_candidates }).eq("id", row.id).eq("clan_id", CLAN_ID).is("closed_at", null));
    }
    if (pending.length) {
      const ids = pending.map(({ row }) => row.id);
      // Also resumes a previous interrupted ballot whose deadline expired.
      await checked(db.from("balance_sessions").update({ map_ban_deadline_at: new Date(Date.now() + 300_000).toISOString() }).in("id", ids).eq("clan_id", CLAN_ID).eq("phase", "map_ban").is("closed_at", null));
      const oldVotes = await children("balance_session_map_votes", ids);
      const voteKeys = new Set(oldVotes.map((v) => `${v.session_id}:${v.user_id}`));
      const votes = pending.flatMap((r) => r.votes).filter((v) => !voteKeys.has(`${v.session_id}:${v.user_id}`));
      if (votes.length) await checked(db.from("balance_session_map_votes").insert(votes));
      for (const { row } of pending) {
        // Finish only these newly created fixtures; no settlement RPC or rewards.
        const saved = await checked(db.from("balance_sessions").update(row).eq("id", row.id).eq("clan_id", CLAN_ID).is("closed_at", null).select("id"));
        assert.equal(saved.length, 1, "Fixture unexpectedly changed during import.");
      }
    }
    const oldPicks = await children("balance_session_predictions", batch.map(({ row }) => row.id));
    const pickKeys = new Set(oldPicks.map((v) => `${v.session_id}:${v.user_id}`));
    const picks = batch.flatMap((r) => r.picks).filter((v) => !pickKeys.has(`${v.session_id}:${v.user_id}`));
    if (picks.length) await checked(db.from("balance_session_predictions").insert(picks));
    completed += batch.length;
    console.log(`History imported/resumed: ${completed}/${rounds.length} rounds`);
  }
}
const finalRounds = new Map((await all("balance_sessions")).filter((r) => roundIds.has(r.id)).map((r) => [r.id, r]));
assert.equal(finalRounds.size, rounds.length);
for (const { row } of rounds) {
  const saved = finalRounds.get(row.id);
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_at") && value !== null) assert.equal(Date.parse(saved[key]), Date.parse(value), key);
    else assert.deepEqual(saved[key], value, key);
  }
  assert(saved.formation_settings.predictionEnabled && saved.map_ban_enabled && saved.hero_ban_enabled);
}
const sortRows = (rows) => rows.sort((a, b) => `${a.session_id}:${a.user_id}`.localeCompare(`${b.session_id}:${b.user_id}`));
const finalVotes = await children("balance_session_map_votes", [...roundIds]);
assert.deepEqual(sortRows(finalVotes.map(({ session_id, user_id, choice_idx }) => ({ session_id, user_id, choice_idx }))), sortRows(rounds.flatMap((r) => r.votes)));
const finalPicks = await children("balance_session_predictions", [...roundIds]);
assert.deepEqual(sortRows(finalPicks.map(({ session_id, user_id, pick_team, created_at }) => ({ session_id, user_id, pick_team, created_at: new Date(created_at).toISOString() }))), sortRows(rounds.flatMap((r) => r.picks)));
assert.deepEqual(await snapshot(), before, "Existing QA state changed during import; inspect before continuing.");
console.log("Verified fixture rows, votes and predictions; existing clan, rooms, rounds, memberships, settings and coin balances unchanged.");
