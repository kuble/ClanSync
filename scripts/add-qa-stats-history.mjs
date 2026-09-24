import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

// Explicitly requested historical fixtures, not the destructive account/clan seed.
// Stable IDs allow interrupted runs to resume without duplicating completed history.
const CLAN_ID = "73441bc9-2ffd-4789-8da4-f50423073706";
const PREFIX = "clansync:qa-stats:2026-09-24:v1";
const TITLE = "[통계 QA] 과거 내전";
const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const apply = process.argv.includes("--apply");
assert(process.argv.slice(2).every((arg) => arg === "--apply"), "Use no arguments (preview) or --apply.");
const checked = async (query) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
const uuid = (key) => {
  const hex = createHash("sha256").update(`${PREFIX}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
async function all(table, select = "*", column = "clan_id", value = CLAN_ID) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const page = await checked(db.from(table).select(select).eq(column, value).order(table === "clan_settings" ? "clan_id" : "id").range(from, from + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
const clan = await checked(db.from("clans").select("id,name,game_id,subscription_tier").eq("id", CLAN_ID).single());
assert.equal(clan.name, "QA_01_Clan");
assert.equal(clan.subscription_tier, "premium", "Prediction fixtures require the existing QA Premium entitlement.");
const members = await all("clan_members");
const people = await checked(db.from("users").select("id,nickname,coin_balance").in("id", members.filter((m) => m.status === "active").map((m) => m.user_id)).order("nickname"));
assert.equal(people.length, 12, "Expected the existing twelve QA members; no account creation is allowed.");
assert.deepEqual(people.map((p) => p.nickname), ["QA_Leader_01", ...Array.from({ length: 11 }, (_, i) => `QA_Member_${String(i + 2).padStart(2, "0")}`)]);
const host = people[0].id;
assert(members.some((m) => m.user_id === host && m.role === "leader"));
const game = await checked(db.from("games").select("slug").eq("id", clan.game_id).single());
assert.equal(game.slug, "overwatch");

const maps = ["리장 타워", "오아시스", "일리오스", "네팔", "부산", "뉴 퀸 스트리트", "콜로세오", "이스페란사", "도라도", "66번 국도", "쓰레기촌", "리알토", "왕의 길", "눔바니", "할리우드", "아이헨발데", "블리자드 월드", "미드타운", "파라이수"];
const heroes = ["ana", "kiriko", "tracer", "genji", "winston", "sigma", "dva", "cassidy"];
const dates = Array.from({ length: 15 }, (_, month) => [3, 9, 16, 22].map((day) => new Date(Date.UTC(2025, 6 + month, day, 11)).toISOString())).flat();
const series = dates.map((date, index) => ({
  id: uuid(`gathering:${index}`), clan_id: CLAN_ID, game_id: clan.game_id,
  host_user_id: host, opened_at: date, closed_at: new Date(Date.parse(date) + 180 * 60_000).toISOString(),
  last_activity_at: new Date(Date.parse(date) + 180 * 60_000).toISOString(),
}));
const seriesIds = new Set(series.map((s) => s.id));
const team = (ids) => ({ tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) });
const rounds = series.flatMap((s, i) => Array.from({ length: 5 }, (_, r) => {
  // Reproducible shuffle varies attendance, team partners, opponents and roles.
  const shuffled = [...people].sort((a, b) => uuid(`${i}:${r}:${a.id}`).localeCompare(uuid(`${i}:${r}:${b.id}`)));
  const ids = shuffled.slice(0, 10).map((p) => p.id);
  const n = i * 5 + r;
  const opened = Date.parse(s.opened_at) + r * 35 * 60_000;
  const outcome = n % 13 === 0 ? "draw" : n % 29 === 0 ? "void" : n % 7 < 4 ? "team1" : "team2";
  return {
    id: uuid(`round:${i}:${r}`), series_id: s.id, clan_id: CLAN_ID, game_id: clan.game_id,
    host_user_id: host, round_number: r + 1, opened_at: new Date(opened).toISOString(),
    closed_at: new Date(opened + 30 * 60_000).toISOString(), phase: "match_live", match_outcome: outcome,
    predictions_settled_at: new Date(opened + 30 * 60_000).toISOString(),
    prediction_deadline_at: new Date(opened + 2 * 60_000).toISOString(),
    roster: { team1: team(ids.slice(0, 5)), team2: team(ids.slice(5)) },
    ma_snapshot: Object.fromEntries(ids.map((id) => {
      const index = people.findIndex((p) => p.id === id);
      const m = Math.round((Math.sin(n / 19 + index) * 2.5 + index / 5 - 1) * 10) / 10;
      return [id, { m, a: Math.round((m * 0.7 + Math.cos(n / 11 + index)) * 10) / 10 }];
    })),
    resolved_map_label: maps[n % maps.length],
    banned_heroes: [heroes[n % heroes.length], heroes[(n + 3) % heroes.length]],
    spectators: shuffled.slice(10).map((p, index) => ({
      session_id: uuid(`round:${i}:${r}`), user_id: p.id,
      pick_team: (n + index + people.findIndex((v) => v.id === p.id)) % 3 === 0 ? 2 : 1,
      created_at: new Date(opened + 60_000).toISOString(),
    })),
  };
}));
const roundIds = new Set(rounds.map((r) => r.id));
assert(series.every((s) => Date.parse(s.closed_at) < Date.now()), "Historical fixtures must be in the past.");
assert.equal(roundIds.size, 300);

// Compare existing operational records before/after without logging their contents.
async function snapshot() {
  return {
    rooms: (await all("balance_rooms")).filter((r) => !seriesIds.has(r.id)),
    series: (await all("balance_session_series")).filter((r) => !seriesIds.has(r.id)),
    rounds: (await all("balance_sessions")).filter((r) => !roundIds.has(r.id)),
    members: await all("clan_members"), settings: await all("clan_settings", "*", "clan_id"),
    coins: await checked(db.from("users").select("id,coin_balance").in("id", people.map((p) => p.id)).order("id")),
  };
}
const before = await snapshot();
assert(before.rounds.some((r) => Date.parse(r.opened_at) > Date.parse(rounds.at(-1).opened_at)), "Fixtures must predate the existing latest round so inherited clan defaults stay unchanged.");
const existingSeries = new Map((await all("balance_session_series")).map((r) => [r.id, r]));
const existingRounds = new Map((await all("balance_sessions")).map((r) => [r.id, r]));
for (const s of series) {
  const old = existingSeries.get(s.id);
  if (old) {
    assert.equal(Date.parse(old.opened_at), Date.parse(s.opened_at), "Fixture ID collision.");
    assert(old.closed_at, "Refusing to touch an open gathering.");
  }
}
for (const r of rounds) {
  const old = existingRounds.get(r.id);
  if (old) {
    assert.equal(old.series_id, r.series_id, "Fixture ID collision.");
    assert.equal(Date.parse(old.opened_at), Date.parse(r.opened_at), "Fixture ID collision.");
  }
}
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: clan.name, period: [dates[0], dates.at(-1)], plannedGatherings: series.length, plannedRounds: rounds.length, plannedPredictions: rounds.length * 2, missingGatherings: series.filter((s) => !existingSeries.has(s.id)).length, unfinishedRounds: rounds.filter((r) => !existingRounds.get(r.id)?.closed_at).length }));
if (!apply) process.exit(0);

const missingSeries = series.filter((s) => !existingSeries.has(s.id));
if (missingSeries.length) await checked(db.from("balance_session_series").insert(missingSeries));
// The series insert trigger creates its room. Only these generated room IDs are named.
await checked(db.from("balance_rooms").update({ title: TITLE }).in("id", [...seriesIds]).eq("clan_id", CLAN_ID));
for (const s of series) {
  const ownRounds = rounds.filter((r) => r.series_id === s.id);
  for (const round of ownRounds) {
    const row = { ...round };
    delete row.spectators;
    const old = existingRounds.get(row.id);
    if (old?.closed_at) {
      assert.equal(old.phase, "match_live", "Unexpected completed fixture state; inspect instead of overwriting.");
      continue;
    }
    if (row.round_number === 1) {
      // First-round insert inherits live clan defaults. Configure this new fixture
      // while editing, then finish it; never modify the source defaults or old rounds.
      if (!existingRounds.has(row.id)) await checked(db.from("balance_sessions").insert({
        id: row.id, series_id: row.series_id, clan_id: CLAN_ID, game_id: clan.game_id,
        host_user_id: host, opened_at: row.opened_at, round_number: 1, roster: row.roster,
      }));
      await checked(db.from("balance_sessions").update({
        formation_settings: { roles: "manual", teams: "keep", predictionEnabled: true },
        map_ban_enabled: false, hero_ban_enabled: true, hero_bans_per_team: 1,
      }).eq("id", row.id).eq("clan_id", CLAN_ID).is("closed_at", null));
      // Choosing a manual map resets the preparation phase; do it before completion.
      await checked(db.from("balance_sessions").update({ resolved_map_label: row.resolved_map_label }).eq("id", row.id).eq("clan_id", CLAN_ID).is("closed_at", null));
      await checked(db.from("balance_sessions").update(row).eq("id", row.id).eq("clan_id", CLAN_ID).is("closed_at", null));
    } else {
      await checked(db.from("balance_sessions").insert(row));
    }
  }
  // Only spectators predict. Imported settled records do not award or spend coins.
  const oldPicks = await checked(db.from("balance_session_predictions").select("session_id,user_id").in("session_id", ownRounds.map((r) => r.id)));
  const keys = new Set(oldPicks.map((p) => `${p.session_id}:${p.user_id}`));
  const picks = ownRounds.flatMap((r) => r.spectators).filter((p) => !keys.has(`${p.session_id}:${p.user_id}`));
  if (picks.length) await checked(db.from("balance_session_predictions").insert(picks));
  if ((series.indexOf(s) + 1) % 10 === 0) console.log(`Verified insertion: ${series.indexOf(s) + 1}/${series.length} gatherings`);
}
const storedRounds = (await all("balance_sessions")).filter((r) => roundIds.has(r.id));
assert.equal(storedRounds.length, rounds.length);
assert(storedRounds.every((r) => r.closed_at && r.phase === "match_live" && r.match_outcome !== "pending" && r.formation_settings.predictionEnabled));
const storedPicks = await checked(db.from("balance_session_predictions").select("session_id,user_id").in("session_id", [...roundIds]));
assert.equal(storedPicks.length, 600);
assert.deepEqual(await snapshot(), before, "Existing QA operational data changed during the import; inspect before proceeding.");
console.log("Verified: 60 closed gatherings, 300 rounds, 600 spectator predictions; existing rooms, rounds, memberships, settings and coin balances unchanged.");
