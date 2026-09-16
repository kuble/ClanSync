import type { BalanceRoster } from "./roster-schema";

/** Each team nominates its own bans using equal-weight votes. */

export type OwHeroRole = "tank" | "dps" | "support";

export type OwHero = {
  id: string;
  nameKo: string;
  role: OwHeroRole;
};

/** 게임 slug `overwatch` 일 때만 풀 사용 */
export function isOverwatchBalanceGame(gameSlug: string): boolean {
  return gameSlug === "overwatch";
}

export const OW_HEROES: readonly OwHero[] = [
  { id: "dva", nameKo: "D.Va", role: "tank" },
  { id: "doomfist", nameKo: "둠피스트", role: "tank" },
  { id: "junker_queen", nameKo: "정커퀸", role: "tank" },
  { id: "mauga", nameKo: "마우가", role: "tank" },
  { id: "orisa", nameKo: "오리사", role: "tank" },
  { id: "ramattra", nameKo: "라마트라", role: "tank" },
  { id: "reinhardt", nameKo: "라인하르트", role: "tank" },
  { id: "roadhog", nameKo: "로드호그", role: "tank" },
  { id: "sigma", nameKo: "시그마", role: "tank" },
  { id: "winston", nameKo: "윈스턴", role: "tank" },
  { id: "wrecking_ball", nameKo: "레킹볼", role: "tank" },
  { id: "zarya", nameKo: "자리야", role: "tank" },
  { id: "ashe", nameKo: "애쉬", role: "dps" },
  { id: "bastion", nameKo: "바스티온", role: "dps" },
  { id: "cassidy", nameKo: "캐서디", role: "dps" },
  { id: "echo", nameKo: "에코", role: "dps" },
  { id: "genji", nameKo: "겐지", role: "dps" },
  { id: "hanzo", nameKo: "한조", role: "dps" },
  { id: "junkrat", nameKo: "정크랫", role: "dps" },
  { id: "mei", nameKo: "메이", role: "dps" },
  { id: "pharah", nameKo: "파라", role: "dps" },
  { id: "reaper", nameKo: "리퍼", role: "dps" },
  { id: "sojourn", nameKo: "소저른", role: "dps" },
  { id: "soldier_76", nameKo: "솔저: 76", role: "dps" },
  { id: "sombra", nameKo: "솜브라", role: "dps" },
  { id: "symmetra", nameKo: "시메트라", role: "dps" },
  { id: "torbjorn", nameKo: "토르비욘", role: "dps" },
  { id: "tracer", nameKo: "트레이서", role: "dps" },
  { id: "venture", nameKo: "벤처", role: "dps" },
  { id: "widowmaker", nameKo: "위도우메이커", role: "dps" },
  { id: "freja", nameKo: "프레야", role: "dps" },
  { id: "ana", nameKo: "아나", role: "support" },
  { id: "baptiste", nameKo: "바티스트", role: "support" },
  { id: "brigitte", nameKo: "브리기테", role: "support" },
  { id: "illari", nameKo: "일라리", role: "support" },
  { id: "kiriko", nameKo: "키리코", role: "support" },
  { id: "lifeweaver", nameKo: "라이프위버", role: "support" },
  { id: "lucio", nameKo: "루시우", role: "support" },
  { id: "mercy", nameKo: "메르시", role: "support" },
  { id: "moira", nameKo: "모이라", role: "support" },
  { id: "zenyatta", nameKo: "젠야타", role: "support" },
  { id: "juno", nameKo: "주노", role: "support" },
] as const;

const OW_HERO_IDS = new Set(OW_HEROES.map((h) => h.id));

const byId: Record<string, OwHero> = Object.fromEntries(
  OW_HEROES.map((h) => [h.id, h]),
);

export function isValidOwHeroId(id: string): boolean {
  return OW_HERO_IDS.has(id);
}

export function owHeroLabel(id: string): string {
  return byId[id]?.nameKo ?? id;
}

export function owHeroRole(id: string): OwHeroRole | null {
  return byId[id]?.role ?? null;
}

export type HeroBanVote = {
  user_id: string;
  pick_1: string;
  pick_2: string | null;
  pick_3: string | null;
};
export type TeamHeroBan = { heroId: string; role: OwHeroRole; votes: number };
export function heroVoteTeam(roster: BalanceRoster, userId: string): "team1" | "team2" | null {
  for (const team of ["team1", "team2"] as const) {
    const slots = roster[team];
    if ([slots.tank, ...slots.dmg, ...slots.sup].includes(userId)) return team;
  }
  return null;
}
export function teamHeroBanStandings(votes: readonly HeroBanVote[], roster: BalanceRoster) {
  const scores: Record<"team1" | "team2", Record<string, number>> = { team1: {}, team2: {} };
  for (const vote of votes) {
    const team = heroVoteTeam(roster, vote.user_id);
    if (!team) continue;
    for (const id of new Set([vote.pick_1, vote.pick_2, vote.pick_3])) {
      if (id && isValidOwHeroId(id)) scores[team][id] = (scores[team][id] ?? 0) + 1;
    }
  }
  const ranked = (team: "team1" | "team2"): TeamHeroBan[] => Object.entries(scores[team])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([heroId, votes]) => ({ heroId, votes, role: owHeroRole(heroId)! }));
  return { team1: ranked("team1"), team2: ranked("team2") };
}
export function resolveTeamHeroBans(votes: readonly HeroBanVote[], roster: BalanceRoster, count: 1 | 2) {
  const standings = teamHeroBanStandings(votes, roster);
  const teams = { team1: standings.team1.slice(0, count), team2: standings.team2.slice(0, count) };
  return {
    bannedHeroes: [...new Set([...teams.team1, ...teams.team2].map((entry) => entry.heroId))],
    context: { version: 1, bansPerTeam: count, teams },
  };
}
