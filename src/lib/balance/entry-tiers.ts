import { OVERWATCH_POSITIONS, recruitmentTiers } from "../clan/recruitment";
import type { Role } from "./formation";

export type EntryTiers = Partial<Record<Role, number>>;
export const entryTierGroups = recruitmentTiers("overwatch").map(([, name], index) => ({
  name,
  divisions: [1, 2, 3, 4, 5].map(division => ({ label: name + " " + division, step: index * 5 + 5 - division })),
})).reverse();

export function readEntryTiers(raw: unknown): EntryTiers {
  const tiers: EntryTiers = {};
  if (!raw || typeof raw !== "object") return tiers;
  for (const { value: role } of OVERWATCH_POSITIONS) {
    const step = (raw as Record<string, unknown>)[role];
    if (typeof step === "number" && Number.isInteger(step) && step >= 0 && step <= 44) tiers[role] = step;
  }
  return tiers;
}
