import { createHash } from "node:crypto";

export const VARIETY_CLAN_ID = "73441bc9-2ffd-4789-8da4-f50423073706";
export const VARIETY_TITLE = "[통계 QA] 연도별 활동·선호 분포";
const namespace = "clansync:qa-stats-variety:2026-09-26:v1";
const digest = (key) => createHash("sha256").update(`${namespace}:${key}`).digest("hex");
const random = (key) => parseInt(digest(key).slice(0, 8), 16) / 0x1_0000_0000;
const uuid = (key) => {
  const hex = digest(key);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const iso = (time) => new Date(time).toISOString();
const team = (ids) => ({ tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) });
export const rosterIds = (roster) => Object.values(roster).flatMap((t) => [t.tank, ...t.dmg, ...t.sup]);
const maps = ["리장 타워", "왕의 길", "일리오스", "네팔", "부산", "도라도", "66번 국도", "쓰레기촌", "리알토", "눔바니", "할리우드", "아이헨발데", "블리자드 월드", "오아시스", "뉴 퀸 스트리트", "콜로세오", "이스페란사", "미드타운", "파라이수"];
const heroes = ["ana", "genji", "kiriko", "winston", "tracer", "dva", "sigma", "cassidy"];
const mapWeights = [18, 24, 13, 9, 8, 6, 4, 7, 3, 5, 2, 3, 2, 6, 5, 3, 8, 4, 2];
const heroWeights = [27, 21, 16, 11, 9, 7, 5, 3];
const attendanceWeights = [15, 12, 9, 7, 6, 5, 4, 3, 2, 1.4, 0.45, 0.12];
function sample(items, count, key, weight) {
  return items.map((item, i) => ({ item, order: -Math.log(Math.max(random(`${key}:${i}`), 1e-9)) / weight(item, i) }))
    .sort((a, b) => a.order - b.order).slice(0, count).map(({ item }) => item);
}
function choose(items, key, weight) {
  const weights = items.map(weight);
  let cursor = random(key) * weights.reduce((a, b) => a + b, 0);
  return items.find((_, i) => (cursor -= weights[i]) < 0) ?? items.at(-1);
}

// Synthetic QA history, not a historical record of Overwatch releases or real players.
// The generator is independent of the database and never changes account balances.
export function buildVarietyHistory(people, gameId) {
  const series = [];
  const rounds = [];
  const host = people[0].id;
  for (let year = 2021; year <= 2026; year++) {
    for (let month = 1; month <= (year === 2026 ? 9 : 12); month++) {
      const count = Math.max(0, [1, 2, 2, 3, 2, 4][year - 2021] + [0, 1, 0, -1, 1, 0, 2, 1, 0, 1, 0, 2][month - 1]);
      for (let dayIndex = 0; dayIndex < count; dayIndex++) {
        const key = `${year}-${month}-${dayIndex}`;
        const opened = Date.UTC(year, month - 1, 2 + dayIndex * 4, 10);
        const roundCount = 3 + Math.floor(random(`${key}:round-count`) * 5);
        const gathering = {
          id: uuid(`series:${key}`), clan_id: VARIETY_CLAN_ID, game_id: gameId, host_user_id: host,
          opened_at: iso(opened), closed_at: iso(opened + roundCount * 35 * 60_000),
          last_activity_at: iso(opened + roundCount * 35 * 60_000),
        };
        series.push(gathering);
        for (let r = 0; r < roundCount; r++) {
          const roundKey = `${key}:${r}`;
          // Most of a day's lineup stays together. Occasional substitutes create
          // different attendance-day and match-count rankings.
          const lineupKey = r < roundCount - 1 ? key : roundKey;
          const eligible = people.filter((_, i) => !(year === 2024 && month === 3 && i === 11 && !(dayIndex === 0 && r === 0)));
          let players = sample(eligible, 10, `${lineupKey}:attendance`, (person) => {
            const i = people.indexOf(person);
            const seasonal = 0.7 + random(`${year}:${month}:${i}:activity`) * 1.1;
            return attendanceWeights[(i + (year - 2021) * 2) % 12] * seasonal;
          });
          // A known low-participation case for the staff-only eligibility list.
          if (year === 2024 && month === 3 && dayIndex === 0 && r === 0 && !players.includes(people[11])) players[9] = people[11];
          players = sample(players, 10, `${roundKey}:teams`, () => 1);
          const ids = players.map((p) => p.id);
          const strength = (p) => {
            const i = people.indexOf(p);
            return [2.8, 1.7, 1.1, 0.4, -0.2, -0.8, -1.3, -2, 0.8, -0.5, 1.9, -1.8][i] + Math.sin(year + i) * 0.8;
          };
          const difference = players.slice(0, 5).reduce((n, p) => n + strength(p), 0) - players.slice(5).reduce((n, p) => n + strength(p), 0);
          const roll = year === 2024 && month === 3 && dayIndex === 0 && r === 0 ? 0.5 : random(`${roundKey}:outcome`);
          const winChance = Math.max(0.08, Math.min(0.92, 0.5 + difference * 0.065));
          const outcome = roll < 0.018 ? "void" : roll < 0.075 ? "draw" : random(`${roundKey}:winner`) < winChance ? "team1" : "team2";
          const availableMaps = year < 2022 ? maps.slice(0, 14) : maps;
          const preference = (map) => mapWeights[maps.indexOf(map)] * (maps.indexOf(map) === (year - 2021) * 2 ? 2.3 : 1);
          const candidates = sample(availableMaps, 3, `${roundKey}:maps`, preference);
          const roundId = uuid(`round:${roundKey}`);
          const voters = people.filter((_, i) => random(`${roundKey}:${i}:vote`) < 0.64 + (i % 4) * 0.08);
          const votes = voters.map((p) => ({ session_id: roundId, user_id: p.id, choice_idx: candidates.indexOf(choose(candidates, `${roundKey}:${p.id}:choice`, preference)) }));
          // Production selects a map weighted by votes; a selected map need not
          // always be the highest-voted candidate.
          const selected = choose(candidates, `${roundKey}:selection`, (_, i) => 1 + votes.filter((v) => v.choice_idx === i).length);
          const banned = random(`${roundKey}:no-ban`) < 0.09 ? [] : sample(heroes, 2, `${roundKey}:bans`, (_, i) => heroWeights[(i + year - 2021) % heroes.length]);
          const start = opened + r * 35 * 60_000;
          const picks = people.filter((p, i) => !ids.includes(p.id) && random(`${roundKey}:${i}:predict`) < 0.35 + (i % 5) * 0.13).map((p) => {
            const accuracy = 0.28 + people.indexOf(p) * 0.052;
            const winner = outcome === "team1" ? 1 : 2;
            return { session_id: roundId, user_id: p.id, pick_team: random(`${roundKey}:${p.id}:correct`) < accuracy ? winner : 3 - winner, created_at: iso(start + 60_000) };
          });
          rounds.push({
            row: {
              id: roundId, series_id: gathering.id, clan_id: VARIETY_CLAN_ID, game_id: gameId, host_user_id: host,
              round_number: r + 1, opened_at: iso(start), closed_at: iso(start + 30 * 60_000),
              phase: "match_live", match_outcome: outcome, predictions_settled_at: iso(start + 30 * 60_000),
              prediction_deadline_at: iso(start + 2 * 60_000), map_ban_deadline_at: null, hero_ban_deadline_at: null,
              roster: { team1: team(ids.slice(0, 5)), team2: team(ids.slice(5)) },
              ma_snapshot: Object.fromEntries(players.map((p) => {
                const m = Math.round((strength(p) + random(`${roundKey}:${p.id}:score`) * 2 - 1) * 10) / 10 || 0;
                return [p.id, { m, a: Math.round(m * 0.8 * 10) / 10 || 0 }];
              })),
              map_candidates: candidates, resolved_map_label: selected, banned_heroes: banned,
            }, votes, picks,
          });
        }
      }
    }
  }
  return { series, rounds };
}

export function summarizeVariety({ series, rounds }) {
  const counts = (values) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((v) => v === value).length]));
  return {
    gatherings: series.length, rounds: rounds.length,
    roundsByYear: counts(rounds.map(({ row }) => row.opened_at.slice(0, 4))),
    outcomes: counts(rounds.map(({ row }) => row.match_outcome)),
    maps: counts(rounds.map(({ row }) => row.resolved_map_label)),
    heroBans: counts(rounds.flatMap(({ row }) => row.banned_heroes)),
    votes: rounds.reduce((n, r) => n + r.votes.length, 0), predictions: rounds.reduce((n, r) => n + r.picks.length, 0),
  };
}
