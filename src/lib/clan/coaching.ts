import { recruitmentTiers } from "./recruitment";

export const COACH_ROLES = [
  { value: "all", label: "전체" },
  { value: "tank", label: "돌격" },
  { value: "dmg", label: "공격" },
  { value: "sup", label: "지원" },
] as const;
export const coachTiers = recruitmentTiers;
export const coachRoleLabel = (role: string) => COACH_ROLES.find(option => option.value === role)?.label ?? "전체";
const tierLabel = (tier: string) => ["overwatch", "valorant", "lol"].flatMap(coachTiers).find(([value]) => value === tier)?.[1] ?? tier;
export const coachTierLabel = (tiers: readonly string[]) => !tiers.length ? "전체" : tiers.length === 1 ? tierLabel(tiers[0]) : `${tierLabel(tiers[0])} ~ ${tierLabel(tiers[tiers.length - 1])}`;
export function isCoachTierRange(gameSlug: string, value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  if (!value.length) return true;
  const options = coachTiers(gameSlug).map(([tier]) => tier);
  const start = options.indexOf(value[0]);
  return start >= 0 && value.length <= options.length - start && value.every((tier, index) => tier === options[start + index]);
}
export type ClanCoach = { userId:string; name:string; role:string; tier:string[]; expertise:string; bio:string; accepting:boolean };
