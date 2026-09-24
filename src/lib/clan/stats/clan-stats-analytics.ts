import type { ClanMatchRecord } from "./normalize-clan-match-records";
import { isoToKstYmd } from "./kst";
import { mapDetailsForLabel } from "@/lib/balance/map-pools";
import { OW_HEROES } from "@/lib/balance/ow-hero-ban";

export type StatRole = "tank" | "dmg" | "sup" | null;
export type MatchResult = "win" | "draw" | "loss";
export type PersonalMatch = {
  id: string;
  seriesId: string | null;
  date: string;
  occurredAt: string;
  map: string | null;
  role: StatRole;
  evaluation: number | null;
  analysis: number | null;
  result: MatchResult;
  peers: { id: string; nickname: string; role: StatRole; relation: "ally" | "enemy" }[];
};

export type IntraStats = {
  sessions: number;
  completed: number;
  participants: number;
  averageMatchesPerSession: number | null;
  averageParticipantsPerSession: number | null;
  draws: number;
  drawRate: number | null;
  months: { key: string; sessions: number; matches: number; participants: number }[];
  maps: { name: string; matches: number }[];
  formations: { mode: string; matches: number }[];
  bans: { hero: string; name: string; role: string | null; matches: number }[];
  banRoles: { role: string; matches: number }[];
  noBanMatches: number;
  banEnabledMatches: number;
  mapVotes: { name: string; candidates: number; votes: number; selected: number }[];
  mapTypes: { name: string; matches: number }[];
  scoreGaps: { matchId: string; date: string; evaluation: number; analysis: number }[];
  scoreGapSummary: Record<"evaluation" | "analysis", { count: number; average: number | null; ranges: number[] }>;
  auction: {
    lots: number;
    priceByRole: { role: string; lots: number; average: number }[];
    priceRanges: number[];
    teamSpend: { team1: number; team2: number };
    teamRemaining: { team1: number; team2: number };
    budgetSnapshots: number;
    items: { name: string; purchases: number; totalCost: number }[];
  };
  recent: { id: string; date: string; map: string | null; outcome: ClanMatchRecord["outcome"] }[];
};

export function completedIntra(records: readonly ClanMatchRecord[]): ClanMatchRecord[] {
  return records.filter(
    (record) =>
      record.match_type === "intra" &&
      (record.outcome === "team1" ||
        record.outcome === "team2" ||
        record.outcome === "draw"),
  );
}

function uniquePlayers(record: ClanMatchRecord) {
  return [...new Map(record.match_players.map((player) => [player.user_id, player])).values()];
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function buildIntraStats(
  records: readonly ClanMatchRecord[],
  openedSessions: readonly { id: string; openedAt: string }[],
): IntraStats {
  const completed = completedIntra(records);
  const participants = new Set<string>();
  const openedIds = new Set(openedSessions.map((session) => session.id));
  const sessionParticipants = new Map<string, Set<string>>();
  let connectedMatches = 0;
  const months = new Map<string, { sessions: Set<string>; matches: number; participants: Set<string> }>();
  const maps = new Map<string, number>();
  const formations = new Map<string, number>();
  const bans = new Map<string, number>();
  const banRoles = new Map<string, number>();
  const mapVotes = new Map<string, { candidates: number; votes: number; selected: number }>();
  const mapTypes = new Map<string, number>();
  let banEnabledMatches = 0;
  let noBanMatches = 0;
  const scoreGaps: IntraStats["scoreGaps"] = [];
  const auctionPrices = new Map<string, number[]>();
  const priceRanges = [0, 0, 0, 0];
  const teamSpend = { team1: 0, team2: 0 };
  const teamRemaining = { team1: 0, team2: 0 };
  const auctionItems = new Map<string, { purchases: number; totalCost: number }>();
  let auctionLots = 0;
  let budgetSnapshots = 0;
  const ensureMonth = (key: string) => {
    if (!months.has(key)) months.set(key, { sessions: new Set(), matches: 0, participants: new Set() });
    return months.get(key)!;
  };
  for (const session of openedSessions) {
    ensureMonth(isoToKstYmd(session.openedAt).slice(0, 7)).sessions.add(session.id);
  }
  for (const record of completed) {
    if (record.series_id && openedIds.has(record.series_id)) {
      connectedMatches++;
      if (!sessionParticipants.has(record.series_id)) sessionParticipants.set(record.series_id, new Set());
      for (const player of uniquePlayers(record)) sessionParticipants.get(record.series_id)!.add(player.user_id);
    }
    const date = isoToKstYmd(record.played_at);
    const month = ensureMonth(date.slice(0, 7));
    month.matches++;
    for (const player of uniquePlayers(record)) {
      participants.add(player.user_id);
      month.participants.add(player.user_id);
    }
    if (record.map_label) {
      maps.set(record.map_label, (maps.get(record.map_label) ?? 0) + 1);
      const type = mapDetailsForLabel(record.map_label)?.type;
      if (type) mapTypes.set(type, (mapTypes.get(type) ?? 0) + 1);
      if (!mapVotes.has(record.map_label)) mapVotes.set(record.map_label, { candidates: 0, votes: 0, selected: 0 });
      mapVotes.get(record.map_label)!.selected++;
    }
    for (const [index, candidate] of (record.map_candidates ?? []).entries()) {
      if (!mapVotes.has(candidate)) mapVotes.set(candidate, { candidates: 0, votes: 0, selected: 0 });
      const row = mapVotes.get(candidate)!;
      row.candidates++;
      row.votes += record.map_votes?.filter((choice) => choice === index).length ?? 0;
    }
    if (record.formation_mode) formations.set(record.formation_mode, (formations.get(record.formation_mode) ?? 0) + 1);
    if (record.formation_mode === "auction") {
      const state = object(record.formation_state);
      const log = Array.isArray(state?.log) ? state.log : [];
      for (const entry of log) {
        const row = object(entry);
        if (!row) continue;
        const amount = row.amount;
        const team = row.team;
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) continue;
        if (row.text === "낙찰" || row.text === "무입찰 · 최소가 추첨 배정") {
          if (team !== "team1" && team !== "team2") continue;
          auctionLots++;
          teamSpend[team] += amount;
          const role = record.match_players.find((player) => player.user_id === row.player)?.role ?? "unknown";
          if (!auctionPrices.has(role)) auctionPrices.set(role, []);
          auctionPrices.get(role)!.push(amount);
          priceRanges[amount < 100 ? 0 : amount < 200 ? 1 : amount < 400 ? 2 : 3]++;
        } else if (typeof row.text === "string" && row.text.startsWith("아이템 구매 · ")) {
          const name = row.text.slice("아이템 구매 · ".length);
          const item = auctionItems.get(name) ?? { purchases: 0, totalCost: 0 };
          item.purchases++;
          item.totalCost += amount;
          auctionItems.set(name, item);
        }
      }
      const budgets = object(state?.budgets);
      if (state?.stage === "complete" && typeof budgets?.team1 === "number" && typeof budgets.team2 === "number") {
        budgetSnapshots++;
        teamRemaining.team1 += budgets.team1;
        teamRemaining.team2 += budgets.team2;
      }
    }
    if (record.hero_ban_enabled && record.banned_heroes !== null) {
      banEnabledMatches++;
      if (record.banned_heroes.length === 0) noBanMatches++;
    }
    for (const hero of new Set(record.banned_heroes ?? [])) {
      bans.set(hero, (bans.get(hero) ?? 0) + 1);
      const role = OW_HEROES.find((candidate) => candidate.id === hero)?.role;
      if (role) banRoles.set(role, (banRoles.get(role) ?? 0) + 1);
    }
    const players = uniquePlayers(record);
    if (players.length === 10 && players.filter((player) => player.team === 1).length === 5 && players.filter((player) => player.team === 2).length === 5 && players.every((player) => player.m != null && player.a != null)) {
      const total = (team: number, key: "m" | "a") =>
        players.filter((player) => player.team === team).reduce((sum, player) => sum + player[key]!, 0);
      scoreGaps.push({
        matchId: record.id,
        date,
        evaluation: Math.abs(total(1, "m") - total(2, "m")),
        analysis: Math.abs(total(1, "a") - total(2, "a")),
      });
    }
  }
  const ranked = (values: Map<string, number>) =>
    [...values].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"));
  const summarizeGaps = (key: "evaluation" | "analysis") => ({
    count: scoreGaps.length,
    average: scoreGaps.length
      ? Math.round(scoreGaps.reduce((sum, gap) => sum + gap[key], 0) / scoreGaps.length * 10) / 10
      : null,
    ranges: [[0, 1], [1, 2], [2, 4], [4, Infinity]].map(([min, max]) =>
      scoreGaps.filter((gap) => gap[key] >= min && gap[key] < max).length),
  });
  const sessionCount = openedIds.size;
  const draws = completed.filter((record) => record.outcome === "draw").length;
  return {
    sessions: sessionCount,
    completed: completed.length,
    participants: participants.size,
    averageMatchesPerSession: sessionCount ? Math.round(connectedMatches / sessionCount * 10) / 10 : null,
    averageParticipantsPerSession: sessionCount ? Math.round([...sessionParticipants.values()].reduce((sum, people) => sum + people.size, 0) / sessionCount * 10) / 10 : null,
    draws,
    drawRate: completed.length ? Math.round(draws / completed.length * 1000) / 10 : null,
    months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([key, row]) => ({
      key,
      sessions: row.sessions.size,
      matches: row.matches,
      participants: row.participants.size,
    })),
    maps: ranked(maps).map(([name, matches]) => ({ name, matches })),
    formations: ranked(formations).map(([mode, matches]) => ({ mode, matches })),
    bans: ranked(bans).map(([hero, matches]) => ({ hero, name: OW_HEROES.find((candidate) => candidate.id === hero)?.nameKo ?? hero, role: OW_HEROES.find((candidate) => candidate.id === hero)?.role ?? null, matches })),
    banRoles: ranked(banRoles).map(([role, matches]) => ({ role, matches })),
    noBanMatches,
    banEnabledMatches,
    mapVotes: [...mapVotes].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.selected - a.selected || a.name.localeCompare(b.name, "ko")),
    mapTypes: ranked(mapTypes).map(([name, matches]) => ({ name, matches })),
    scoreGaps,
    scoreGapSummary: { evaluation: summarizeGaps("evaluation"), analysis: summarizeGaps("analysis") },
    auction: {
      lots: auctionLots,
      priceByRole: [...auctionPrices].map(([role, amounts]) => ({ role, lots: amounts.length, average: Math.round(amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length * 10) / 10 })).sort((a, b) => b.lots - a.lots),
      priceRanges,
      teamSpend,
      teamRemaining,
      budgetSnapshots,
      items: [...auctionItems].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.purchases - a.purchases),
    },
    recent: completed.map((record) => ({
      id: record.id,
      date: isoToKstYmd(record.played_at),
      map: record.map_label,
      outcome: record.outcome,
    })),
  };
}

export function buildPersonalMatches(
  records: readonly ClanMatchRecord[],
  userId: string,
  nicknames: ReadonlyMap<string, string>,
  includePeers: boolean,
): PersonalMatch[] {
  return completedIntra(records).flatMap((record) => {
    const players = uniquePlayers(record);
    const player = players.find((candidate) => candidate.user_id === userId);
    if (!player) return [];
    const result: MatchResult = record.outcome === "draw"
      ? "draw"
      : (record.outcome === "team1" ? 1 : 2) === player.team
        ? "win"
        : "loss";
    return [{
      id: record.id,
      seriesId: record.series_id,
      date: isoToKstYmd(record.played_at),
      occurredAt: record.occurred_at,
      map: record.map_label,
      role: player.role,
      evaluation: player.m,
      analysis: player.a,
      result,
      peers: includePeers
        ? players.filter((candidate) => candidate.user_id !== userId).map((candidate) => ({
            id: candidate.user_id,
            nickname: nicknames.get(candidate.user_id) ?? "탈퇴한 멤버",
            role: candidate.role,
            relation: candidate.team === player.team ? "ally" as const : "enemy" as const,
          }))
        : [],
    }];
  });
}

export function recordTotals(matches: readonly PersonalMatch[]) {
  const wins = matches.filter((match) => match.result === "win").length;
  const draws = matches.filter((match) => match.result === "draw").length;
  const losses = matches.filter((match) => match.result === "loss").length;
  return {
    matches: matches.length,
    wins,
    draws,
    losses,
    rate: matches.length ? Math.round((wins / matches.length) * 1000) / 10 : null,
    sessions: new Set(matches.map((match) => match.seriesId).filter(Boolean)).size,
  };
}

export function currentStreak(matches: readonly PersonalMatch[]) {
  const latest = matches[0]?.result;
  if (!latest || latest === "draw") return { result: null, count: 0 } as const;
  let count = 0;
  for (const match of matches) {
    if (match.result !== latest) break;
    count++;
  }
  return { result: latest, count };
}

export function longestStreak(matches: readonly PersonalMatch[], result: "win" | "loss") {
  let count = 0;
  let best = { count: 0, start: null as string | null, end: null as string | null };
  let end: string | null = null;
  for (const match of matches) {
    if (match.result === result) {
      count++;
      if (!end) end = match.date;
      if (count > best.count) best = { count, start: match.date, end };
    } else {
      count = 0;
      end = null;
    }
  }
  return best;
}

export function relationRows(
  matches: readonly PersonalMatch[],
  selfRole: StatRole | "all",
  peerRole: StatRole | "all",
  relation: "ally" | "enemy",
) {
  const grouped = new Map<string, { id: string; nickname: string; matches: number; wins: number; draws: number; losses: number; matchIds: string[] }>();
  for (const match of matches) {
    if (selfRole !== "all" && match.role !== selfRole) continue;
    for (const peer of match.peers) {
      if (peer.relation !== relation || (peerRole !== "all" && peer.role !== peerRole)) continue;
      if (!grouped.has(peer.id)) grouped.set(peer.id, { id: peer.id, nickname: peer.nickname, matches: 0, wins: 0, draws: 0, losses: 0, matchIds: [] });
      const row = grouped.get(peer.id)!;
      row.matches++;
      row.matchIds.push(match.id);
      if (match.result === "win") row.wins++;
      if (match.result === "draw") row.draws++;
      if (match.result === "loss") row.losses++;
    }
  }
  return [...grouped.values()].sort((a, b) => b.matches - a.matches || a.nickname.localeCompare(b.nickname, "ko"));
}
