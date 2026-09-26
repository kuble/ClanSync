import test from "node:test";
import assert from "node:assert/strict";
import { buildVarietyHistory, summarizeVariety, rosterIds } from "./fixtures/qa-stats-variety.mjs";

const people = Array.from({ length: 12 }, (_, i) => ({ id: `user-${i}` }));
const history = buildVarietyHistory(people, "qa-game");

test("six years include seasonal peaks, quiet months and enough history to exercise pagination", () => {
  const summary = summarizeVariety(history);
  assert.deepEqual(Object.keys(summary.roundsByYear), ["2021", "2022", "2023", "2024", "2025", "2026"]);
  assert(history.rounds.length > 900);
  assert(Math.max(...Object.values(summary.roundsByYear)) > Math.min(...Object.values(summary.roundsByYear)) * 2);
  assert(!history.series.some((s) => s.opened_at.startsWith("2021-04")));
  assert(history.series.every((s) => Date.parse(s.closed_at) < Date.parse("2026-09-24")));
  assert.deepEqual(buildVarietyHistory(people, "qa-game"), history, "Re-runs must reproduce IDs, lineups and results exactly.");
});

test("rounds have valid lineups, candidate votes, spectator predictions and chronological boundaries", () => {
  assert.equal(new Set(history.rounds.map(({ row }) => row.id)).size, history.rounds.length);
  const series = new Map(history.series.map((s) => [s.id, s]));
  for (const { row, votes, picks } of history.rounds) {
    const ids = rosterIds(row.roster);
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
    assert(ids.every((id) => people.some((p) => p.id === id)));
    assert(Date.parse(row.opened_at) >= Date.parse(series.get(row.series_id).opened_at));
    assert(Date.parse(row.closed_at) <= Date.parse(series.get(row.series_id).closed_at));
    assert.equal(new Set(row.map_candidates).size, 3);
    assert(row.map_candidates.includes(row.resolved_map_label));
    assert.equal(new Set(votes.map((v) => v.user_id)).size, votes.length);
    assert(votes.every((v) => v.session_id === row.id && v.choice_idx >= 0 && v.choice_idx < 3));
    assert(picks.every((p) => p.session_id === row.id && !ids.includes(p.user_id) && [1, 2].includes(p.pick_team)));
    assert.equal(new Set(row.banned_heroes).size, row.banned_heroes.length);
    assert([0, 2].includes(row.banned_heroes.length));
  }
});

test("rankings, attendance, map preferences, hero bans and prediction accuracy are not uniform", () => {
  const results = people.map((p) => {
    const played = history.rounds.filter(({ row }) => row.match_outcome !== "void" && rosterIds(row.roster).includes(p.id));
    const won = played.filter(({ row }) => ["team1", "team2"].includes(row.match_outcome) && rosterIds({ winning: row.roster[row.match_outcome] }).includes(p.id));
    const picks = history.rounds.flatMap(({ row, picks }) => picks.filter((v) => v.user_id === p.id && ["team1", "team2"].includes(row.match_outcome)).map((v) => v.pick_team === (row.match_outcome === "team1" ? 1 : 2)));
    return { rate: won.length / played.length, games: played.length, attendance: new Set(played.map(({ row }) => row.opened_at.slice(0, 10))).size, accuracy: picks.filter(Boolean).length / picks.length };
  });
  assert(Math.max(...results.map((r) => r.rate)) - Math.min(...results.map((r) => r.rate)) > 0.2);
  assert(new Set(results.map((r) => r.games)).size >= 10);
  assert(new Set(results.map((r) => r.attendance)).size >= 8);
  assert(Math.max(...results.map((r) => r.accuracy)) - Math.min(...results.map((r) => r.accuracy)) > 0.4);
  const summary = summarizeVariety(history);
  assert(summary.votes > 8000);
  assert(summary.predictions > 1000);
  assert(Math.max(...Object.values(summary.maps)) > Math.min(...Object.values(summary.maps)) * 10);
  assert(Math.max(...Object.values(summary.heroBans)) > Math.min(...Object.values(summary.heroBans)) * 1.5);
  assert(summary.outcomes.draw > 0 && summary.outcomes.void > 0);
  assert(history.rounds.some(({ row }) => row.banned_heroes.length === 0));
});

test("March 2024 has a known member below the minimum-games threshold", () => {
  const month = history.rounds.filter(({ row }) => row.opened_at.startsWith("2024-03") && row.match_outcome !== "void");
  assert.equal(month.filter(({ row }) => rosterIds(row.roster).includes(people[11].id)).length, 1);
  assert(month.filter(({ row }) => rosterIds(row.roster).includes(people[0].id)).length >= 10);
});
