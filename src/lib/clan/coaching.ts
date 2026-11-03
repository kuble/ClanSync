import { recruitmentTiers } from "./recruitment";

export const COACH_ROLES = [
  { value: "all", label: "전체" },
  { value: "tank", label: "돌격" },
  { value: "dmg", label: "공격" },
  { value: "sup", label: "지원" },
] as const;
export const coachTiers = (gameSlug: string) => [["all", "전체"], ...recruitmentTiers(gameSlug)] as const;
export const coachRoleLabel = (role: string) => COACH_ROLES.find(option => option.value === role)?.label ?? "전체";
export const coachTierLabel = (tier: string) => ["overwatch", "valorant", "lol", "pubg"].flatMap(coachTiers).find(([value]) => value === tier)?.[1] ?? "전체";
export type ClanCoach = { userId:string; name:string; role:string; tier:string; expertise:string; bio:string; accepting:boolean };
