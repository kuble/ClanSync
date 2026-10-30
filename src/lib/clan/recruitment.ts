const TIERS_BY_GAME: Record<string, readonly (readonly [string, string])[]> = {
  overwatch: [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["champion", "챔피언"]],
  valorant: [["iron", "아이언"], ["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["ascendant", "초월자"], ["immortal", "불멸"], ["radiant", "레디언트"]],
  lol: [["iron", "아이언"], ["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["emerald", "에메랄드"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["challenger", "챌린저"]],
  pubg: [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["crystal", "크리스탈"], ["diamond", "다이아몬드"], ["master", "마스터"], ["survivor", "서바이버"]],
};

export const recruitmentTiers = (gameSlug: string) => Object.hasOwn(TIERS_BY_GAME,gameSlug) ? TIERS_BY_GAME[gameSlug] : [];
export const normalizeRecruitmentTier = (gameSlug: string, tier: string) => gameSlug === "overwatch" && tier === "challenger" ? "champion" : tier;

// min_birth_year is the historical inclusive UPPER bound; keep saved values unchanged.
export type ClanRecruitment = { birth_year_from: number | null; min_birth_year: number | null; gender_policy: "all" | "male" | "female"; tier_range: string[] };
export type RecruitmentYears = Pick<ClanRecruitment,"birth_year_from"|"min_birth_year">;
export const FIRST_RECRUITMENT_YEAR = 1950;
export const lastRecruitmentYear = () => Number(new Intl.DateTimeFormat("en",{year:"numeric",timeZone:"Asia/Seoul"}).format(new Date()))-10;
export function readRecruitmentYears(form: FormData) {
  const from = String(form.get("birth_year_from") ?? "").trim(), to = String(form.get("min_birth_year") ?? "").trim();
  const lower = from ? Number(from) : null, upper = to ? Number(to) : null, last = lastRecruitmentYear();
  if ([from,to].some(value => value && (!/^\d{4}$/.test(value) || Number(value)<FIRST_RECRUITMENT_YEAR || Number(value)>last))) return {ok:false as const,error:`출생연도는 ${FIRST_RECRUITMENT_YEAR}~${last}년 사이에서 선택해 주십시오.`};
  if (lower!=null && upper!=null && lower>upper) return {ok:false as const,error:"출생연도 하한은 상한보다 클 수 없습니다."};
  return {ok:true as const,birth_year_from:lower,min_birth_year:upper};
}
export function recruitmentYearLabel(conditions: RecruitmentYears) {
  const from=conditions.birth_year_from, to=conditions.min_birth_year;
  return from==null ? to==null ? "출생연도 무관" : `${to}년생까지` : to==null ? `${from}년생부터` : from===to ? `${from}년생` : `${from}~${to}년생`;
}
export const recruitmentTierLabel = (gameSlug: string, tier: string) => recruitmentTiers(gameSlug).find(([value]) => value === normalizeRecruitmentTier(gameSlug, tier))?.[1] ?? tier;

export function recruitmentProfileError(conditions: Pick<ClanRecruitment, "birth_year_from" | "min_birth_year" | "gender_policy">, profile: { birth_year: number; gender: string } | null) {
  if (!profile) return "가입 정보를 확인할 수 없습니다. 다시 로그인해 주십시오.";
  if (conditions.birth_year_from != null && profile.birth_year < conditions.birth_year_from) return `${conditions.birth_year_from}년생 및 이후 출생자만 신청할 수 있습니다.`;
  if (conditions.min_birth_year != null && profile.birth_year > conditions.min_birth_year) return `${conditions.min_birth_year}년생 및 이전 출생자만 신청할 수 있습니다.`;
  if (conditions.gender_policy !== "all" && profile.gender !== conditions.gender_policy) return `이 클랜은 ${conditions.gender_policy === "male" ? "남성" : "여성"}만 신청할 수 있습니다. 성별 비공개 계정은 신청할 수 없습니다.`;
  return null;
}

export function recruitmentLabels(gameSlug: string, conditions: ClanRecruitment) {
  return [recruitmentYearLabel(conditions),
    conditions.gender_policy === "all" ? "성별 무관" : conditions.gender_policy === "male" ? "남성" : "여성",
    ...(conditions.tier_range.length ? conditions.tier_range.map(tier => recruitmentTierLabel(gameSlug,tier)) : ["티어 무관"])];
}
