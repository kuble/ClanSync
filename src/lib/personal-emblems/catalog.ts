import type { HofEmblem } from "../clan/stats/hof-emblems";
import type { AwardFamily, MilestoneFamily, PersonalEmblem, PersonalEmblemCollection } from "./types";

export type CaseEmblem = PersonalEmblem & { localKey: string; source: PersonalEmblemCollection };
export function caseEmblems(sources: readonly PersonalEmblemCollection[]): CaseEmblem[] {
  return sources.flatMap(source => source.emblems.map(emblem => ({ ...emblem, localKey: emblem.key, key: source.clanId + ":" + emblem.key, source })));
}
export function resolveAccountFeaturedKeys(sources: readonly PersonalEmblemCollection[], keys: readonly string[] | null): string[] {
  return resolveFeaturedKeys(caseEmblems(sources), keys, emblem => emblem.source.clanId + ":" + emblem.family);
}

const artworkRoot = "/personal-emblems/v1";
export const awardFamilies: Record<HofEmblem["category"], AwardFamily> = {
  "승률": "victory", "최다 참여": "participation", "최다 출전": "appearances", "최장 연승": "streak", "예측 적중": "prediction",
};
const milestoneFamilies: { family: MilestoneFamily; targets: number[]; unit: string }[] = [
  { family: "sessions", targets: [10, 50, 100, 300], unit: "회 참여" },
  { family: "matches", targets: [10, 50, 100, 500], unit: "경기 출전" },
  { family: "wins", targets: [10, 50, 100, 300], unit: "승" },
  { family: "streak", targets: [3, 5, 7, 10], unit: "연승" },
  { family: "prediction", targets: [10, 50, 100, 300], unit: "회 적중" },
];

export function awardEmblems(awards: readonly HofEmblem[]): PersonalEmblem[] {
  return awards.filter(({ rank }) => Number.isInteger(rank) && rank >= 1 && rank <= 3).map((award) => {
    const family = awardFamilies[award.category];
    return {
      key: award.key, kind: "award", family,
      description: `${award.period === "month" ? "월간" : "연간"} ${award.category} ${award.rank}위`,
      artwork: `${artworkRoot}/awards/${award.period}/${family}-${["gold", "silver", "bronze"][award.rank - 1]}.png`,
      earned: true, date: award.date, period: award.period, rank: award.rank,
    };
  });
}

export function milestoneEmblems(progress: Record<MilestoneFamily, number>, earnedDates: ReadonlyMap<string, string> = new Map()): PersonalEmblem[] {
  return milestoneFamilies.flatMap(({ family, targets, unit }) => {
    const current = Number.isFinite(progress[family]) ? Math.max(0, Math.floor(progress[family])) : 0;
    return targets.map((target, index) => ({
      key: `milestone-${family}-${index + 1}`, kind: "milestone", family,
      description: `${family === "prediction" ? "예측 " : ""}${target.toLocaleString("ko-KR")}${unit} 달성`,
      artwork: `${artworkRoot}/milestones/${family}-${index + 1}.png`,
      earned: earnedDates.has(`milestone-${family}-${index + 1}`), date: earnedDates.get(`milestone-${family}-${index + 1}`) ?? null,
      stage: index + 1, target, progress: current, unit,
    }));
  });
}

const closingPeriod = (entry: PersonalEmblem) => entry.kind === "award" && entry.period === "year" ? `${entry.date}-12` : entry.date ?? "";

export function getAwardHistory<T extends PersonalEmblem>(entries: readonly T[]): T[] {
  return entries.filter(entry => entry.kind === "award" && entry.earned)
    .sort((a, b) => closingPeriod(b).localeCompare(closingPeriod(a))
      || Number(b.period === "year") - Number(a.period === "year") || (a.rank ?? 4) - (b.rank ?? 4) || a.key.localeCompare(b.key));
}

export function getAwardRepresentatives<T extends PersonalEmblem>(entries: readonly T[]): T[] {
  const history = getAwardHistory(entries).sort((a, b) => (a.rank ?? 4) - (b.rank ?? 4));
  return (["month", "year"] as const).flatMap(period => Object.values(awardFamilies).flatMap(family => {
    const latest = history.find(entry => entry.family === family && entry.period === period);
    return latest ? [latest] : [];
  }));
}

/** Explicit empty picks stay empty; hidden records are excluded and earned milestones advance to their highest stage. */
export function resolveFeaturedKeys<T extends PersonalEmblem>(entries: readonly T[], keys: readonly string[] | null, familyOf: (entry: T) => string = entry => entry.family): string[] {
  const earned = entries.filter((entry) => entry.earned);
  const highest = new Map<string, T>();
  for (const entry of earned) if (entry.kind === "milestone" && (!highest.has(familyOf(entry)) || (entry.stage ?? 0) > (highest.get(familyOf(entry))?.stage ?? 0))) highest.set(familyOf(entry), entry);
  if (keys !== null) {
    const available = new Map(earned.map((entry) => [entry.key, entry]));
    const canonical = keys.flatMap((key) => {
      const entry = available.get(key);
      return !entry ? [] : [entry.kind === "milestone" ? highest.get(familyOf(entry))!.key : entry.key];
    });
    return [...new Set(canonical)].slice(0, 3);
  }
  // December and that year's annual award close together; bare year strings sort too far back.
  return earned.filter((entry) => entry.kind === "award" || highest.get(familyOf(entry))?.key === entry.key)
    .sort((a, b) => Number(a.kind === "milestone") - Number(b.kind === "milestone") || closingPeriod(b).localeCompare(closingPeriod(a))
    || (a.rank ?? 4) - (b.rank ?? 4) || Number(b.period === "year") - Number(a.period === "year") || (b.stage ?? 0) - (a.stage ?? 0))
    .slice(0, 3).map((entry) => entry.key);
}
