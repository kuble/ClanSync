const TIERS_BY_GAME: Record<string, readonly (readonly [string, string])[]> = {
  overwatch: [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["champion", "챔피언"]],
  valorant: [["iron", "아이언"], ["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["ascendant", "초월자"], ["immortal", "불멸"], ["radiant", "레디언트"]],
  lol: [["iron", "아이언"], ["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["emerald", "에메랄드"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["challenger", "챌린저"]],
  pubg: [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["crystal", "크리스탈"], ["diamond", "다이아몬드"], ["master", "마스터"], ["survivor", "서바이버"]],
};

export const recruitmentTiers = (gameSlug: string) => Object.hasOwn(TIERS_BY_GAME,gameSlug) ? TIERS_BY_GAME[gameSlug] : [];
export const normalizeRecruitmentTier = (gameSlug: string, tier: string) => gameSlug === "overwatch" && tier === "challenger" ? "champion" : tier;

export type ClanRecruitment = { min_birth_year: number | null; gender_policy: "all" | "male" | "female"; tier_range: string[] };
export const recruitmentTierLabel = (gameSlug: string, tier: string) => recruitmentTiers(gameSlug).find(([value]) => value === normalizeRecruitmentTier(gameSlug, tier))?.[1] ?? tier;

/** Birth year is an inclusive upper bound, matching the existing creation form. */
export function recruitmentProfileError(conditions: Pick<ClanRecruitment, "min_birth_year" | "gender_policy">, profile: { birth_year: number; gender: string } | null) {
  if (!profile) return "가입 정보를 확인할 수 없습니다. 다시 로그인해 주십시오.";
  if (conditions.min_birth_year != null && profile.birth_year > conditions.min_birth_year) return `${conditions.min_birth_year}년생 및 이전 출생자만 신청할 수 있습니다.`;
  if (conditions.gender_policy !== "all" && profile.gender !== conditions.gender_policy) return `이 클랜은 ${conditions.gender_policy === "male" ? "남성" : "여성"}만 신청할 수 있습니다. 성별 비공개 계정은 신청할 수 없습니다.`;
  return null;
}

export function recruitmentLabels(gameSlug: string, conditions: ClanRecruitment) {
  return [conditions.min_birth_year == null ? "출생연도 무관" : `${conditions.min_birth_year}년생까지`,
    conditions.gender_policy === "all" ? "성별 무관" : conditions.gender_policy === "male" ? "남성" : "여성",
    ...(conditions.tier_range.length ? conditions.tier_range.map(tier => recruitmentTierLabel(gameSlug,tier)) : ["티어 무관"])];
}
