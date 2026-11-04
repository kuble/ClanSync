import { recruitmentTiers } from "../clan/recruitment";
import type { Role } from "./formation";

export type InitialAnalysisScores = Partial<Record<Role, number>>;

const tiers = recruitmentTiers("overwatch");
const platinum = tiers.findIndex(([id]) => id === "plat");

export const entryTierGroups = tiers.map(([, name], index) => ({
  name,
  divisions: [1, 2, 3, 4, 5].map(division => ({
    label: name + " " + division,
    initialScore: ((index - platinum) * 5 + 3 - division) / 5,
  })),
})).reverse();
