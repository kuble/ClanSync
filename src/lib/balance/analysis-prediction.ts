import { parseRoster, type BalanceRoster } from "./roster-schema";

type Evidence = { games: number; residual: number };
export type PredictionModel = {
  ratings: Record<string, number>;
  evidence: Record<string, Evidence>;
  aliases: Record<string, string>;
};

type Round = {
  roster: unknown;
  resolved_map_label: string | null;
  match_outcome: string;
  opened_at: string;
  closed_at: string | null;
  predictions_settled_at: string | null;
};

function lineup(roster: BalanceRoster, aliases: Record<string, string>) {
  const people = new Set<string>();
  const teams = [roster.team1, roster.team2].map(team => {
    const players: string[] = [];
    for (const role of ["tank", "dmg", "sup"] as const) {
      for (const id of role === "tank" ? [team.tank] : team[role]) {
        if (!id) continue;
        const person = aliases[id] ?? id;
        people.add(person);
        players.push(person + ":" + role);
      }
    }
    return players;
  });
  return people.size === 10 ? teams : null;
}

const limit = (n: number, cap: number) => Math.max(-cap, Math.min(cap, n));
const probability = (n: number) => Math.max(0.01, Math.min(0.99, n));
const mapKey = (player: string, map: string) => "map:" + player + ":" + map;
const pairKey = (a: string, b: string) => a < b ? a + "|" + b : b + "|" + a;

// Ten neutral observations shrink sparse histories towards no correction.
function adjustment(model: PredictionModel, key: string, expected = 0) {
  const stat = model.evidence[key];
  return stat ? (stat.residual - stat.games * expected) / (10 + stat.games) : 0;
}

function teamFeatures(model: PredictionModel, team: string[], map: string | null) {
  let rating = 0;
  let synergy = 0;
  let mapEffect = 0;
  const form = team.map(player => adjustment(model, player));
  for (const [i, player] of team.entries()) {
    rating += model.ratings[player] ?? 0;
    if (map) mapEffect += adjustment(model, mapKey(player, map), form[i]);
    for (let j = 0; j < i; j++) {
      synergy += adjustment(model, pairKey(player, team[j]), (form[i] + form[j]) / 2);
    }
  }
  return { rating: rating / 5, synergy: synergy / 10, mapEffect: mapEffect / 5 };
}

function expectation(model: PredictionModel, teams: string[][], map: string | null) {
  const [a, b] = teams.map(team => teamFeatures(model, team, map));
  const base = 1 / (1 + (0.35 / 0.65) ** (a.rating - b.rating));
  const synergy = limit(a.synergy - b.synergy, 0.03);
  const mapEffect = limit(a.mapEffect - b.mapEffect, 0.05);
  let opposition = 0;
  for (const player of teams[0]) for (const opponent of teams[1]) {
    opposition += (player < opponent ? 1 : -1) * adjustment(model, "vs:" + pairKey(player, opponent));
  }
  return {
    base,
    // Opponent records measure surprises after accounting for both lineups and the map.
    matchupBaseline: probability(base + synergy + mapEffect),
    chance: probability(base + 0.5 * synergy + 0.5 * mapEffect + 1.5 * limit(opposition / 25, 0.03)),
  };
}

export function analysisWinPercent(model: PredictionModel, roster: BalanceRoster, map: string | null) {
  const teams = lineup(roster, model.aliases);
  return teams ? 100 * expectation(model, teams, map).chance : null;
}

export function buildPredictionModel(rounds: readonly Round[], before: string, aliases: Record<string, string>): PredictionModel {
  const model: PredictionModel = { ratings: {}, evidence: {}, aliases };
  const cutoff = Date.parse(before);
  const events: { at: number; finish: boolean; run: () => void }[] = [];
  function observe(key: string, residual: number) {
    const stat = model.evidence[key] ??= { games: 0, residual: 0 };
    stat.games++;
    stat.residual += residual;
  }
  for (const round of rounds) {
    if (!["team1", "team2", "draw"].includes(round.match_outcome)) continue;
    const start = Date.parse(round.opened_at);
    const end = Date.parse(round.predictions_settled_at ?? round.closed_at ?? "");
    if (!(start < cutoff && start < end && end <= cutoff)) continue;
    const teams = lineup(parseRoster(round.roster), aliases);
    if (!teams) continue;
    const map = round.resolved_map_label;
    const actual = round.match_outcome === "draw" ? 0.5 : round.match_outcome === "team1" ? 1 : 0;
    // Two rooms may overlap. Freeze expected values at opening and learn at settlement.
    let baseline = 0.5;
    let matchupBaseline = 0.5;
    const steps: Record<string, number> = {};
    events.push({ at: start, finish: false, run() {
      ({ base: baseline, matchupBaseline } = expectation(model, teams, map));
      for (const team of teams) for (const player of team) {
        const games = model.evidence[player]?.games ?? 0;
        steps[player] = games < 10 ? 0.20 : games < 30 ? 0.12 : 0.08;
      }
    } }, { at: end, finish: true, run() {
      for (const [side, team] of teams.entries()) {
        const residual = (actual - baseline) * (side === 0 ? 1 : -1);
        for (const [i, player] of team.entries()) {
          model.ratings[player] = (model.ratings[player] ?? 0) + steps[player] * residual;
          observe(player, residual);
          if (map) observe(mapKey(player, map), residual);
          for (let j = 0; j < i; j++) observe(pairKey(player, team[j]), residual);
        }
      }
      for (const player of teams[0]) for (const opponent of teams[1]) {
        observe("vs:" + pairKey(player, opponent), (player < opponent ? 1 : -1) * (actual - matchupBaseline));
      }
    } });
  }
  events.sort((a, b) => a.at - b.at || Number(b.finish) - Number(a.finish));
  for (const event of events) event.run();
  return model;
}
