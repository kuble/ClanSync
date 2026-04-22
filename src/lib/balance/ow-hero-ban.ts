/**
 * 오버워치 내전 영웅 밴 (09-BalanceMaker: 1·2·3순위 7·5·3, 역할당 최대 2 · 전체 최대 4).
 */

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

export function tallyHeroBanVotes(
  rows: readonly { pick_1: string; pick_2: string; pick_3: string }[],
): Record<string, number> {
  const scores: Record<string, number> = {};
  const add = (heroId: string, pts: number) => {
    scores[heroId] = (scores[heroId] ?? 0) + pts;
  };
  for (const r of rows) {
    add(r.pick_1, 7);
    add(r.pick_2, 5);
    add(r.pick_3, 3);
  }
  return scores;
}

/** 점수 내림차순, 동점 시 id 오름차순 → 역할당 2·전체 4 제한으로 밴 확정 */
export function resolveBannedHeroesFromScores(
  scores: Record<string, number>,
): string[] {
  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const picked: string[] = [];
  const roleCount: Record<OwHeroRole, number> = {
    tank: 0,
    dps: 0,
    support: 0,
  };

  for (const [heroId] of sorted) {
    if (picked.length >= 4) break;
    const role = owHeroRole(heroId);
    if (!role) continue;
    if (roleCount[role] >= 2) continue;
    picked.push(heroId);
    roleCount[role] += 1;
  }

  return picked;
}
