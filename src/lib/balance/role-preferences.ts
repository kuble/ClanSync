import type { Role } from "./formation";

export const ROLE_RANKINGS: Role[][] = [
  [],
  ["tank", "dmg", "sup"],
  ["tank", "sup", "dmg"],
  ["dmg", "tank", "sup"],
  ["dmg", "sup", "tank"],
  ["sup", "tank", "dmg"],
  ["sup", "dmg", "tank"],
];
export function isRoleRanking(value: unknown): value is Role[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 || value.length === 3) &&
    value.every((role) => ["tank", "dmg", "sup"].includes(role)) &&
    new Set(value).size === value.length
  );
}
export function parseRoleRanking(value: unknown): Role[] {
  return isRoleRanking(value) ? value : [];
}
