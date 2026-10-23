import type { HofEmblem } from "../clan/stats/hof-emblems";
import type { AwardFamily, MilestoneFamily, PersonalEmblem } from "./types";

const artworkRoot = "/personal-emblems/v1";
const awardFamilies: Record<HofEmblem["category"], { family: AwardFamily; name: string }> = {
  "승률": { family: "victory", name: "승리의 별" },
  "최다 참여": { family: "participation", name: "약속의 태양" },
  "최다 출전": { family: "appearances", name: "전장의 기사" },
  "최장 연승": { family: "streak", name: "불사조" },
  "예측 적중": { family: "prediction", name: "선견의 나침반" },
};
const milestoneFamilies: { family: MilestoneFamily; name: string; targets: number[]; unit: string }[] = [
  { family: "sessions", name: "동행의 길", targets: [10, 50, 100, 300], unit: "회 참여" },
  { family: "matches", name: "전장의 수호자", targets: [10, 50, 100, 500], unit: "경기 출전" },
  { family: "wins", name: "승리의 결정", targets: [10, 50, 100, 300], unit: "승" },
  { family: "streak", name: "꺼지지 않는 불씨", targets: [3, 5, 7, 10], unit: "연승" },
  { family: "prediction", name: "궤도의 관측자", targets: [10, 50, 100, 300], unit: "회 적중" },
];

export function awardEmblems(awards: readonly HofEmblem[]): PersonalEmblem[] {
  return awards.filter(({ rank }) => Number.isInteger(rank) && rank >= 1 && rank <= 3).map((award) => {
    const { family, name } = awardFamilies[award.category];
    return {
      key: award.key, kind: "award", family, name,
      description: `${award.date} ${award.period === "month" ? "월간" : "연간"} · ${award.category} ${award.rank}위`,
      artwork: `${artworkRoot}/awards/${award.period}/${family}-${["gold", "silver", "bronze"][award.rank - 1]}.png`,
      earned: true, date: award.date, period: award.period, rank: award.rank,
    };
  });
}

export function milestoneEmblems(progress: Record<MilestoneFamily, number>): PersonalEmblem[] {
  return milestoneFamilies.flatMap(({ family, name, targets, unit }) => {
    const current = Number.isFinite(progress[family]) ? Math.max(0, Math.floor(progress[family])) : 0;
    return targets.map((target, index) => ({
      key: `milestone-${family}-${index + 1}`, kind: "milestone", family, name,
      description: `${target.toLocaleString("ko-KR")}${unit} 달성`,
      artwork: `${artworkRoot}/milestones/${family}-${index + 1}.png`,
      earned: current >= target, date: null, stage: index + 1, target, progress: current, unit,
    }));
  });
}

/** Explicit empty picks stay empty; records invalidated by corrections disappear from saved picks. */
export function resolveFeaturedKeys(entries: readonly PersonalEmblem[], keys: readonly string[] | null): string[] {
  const earned = entries.filter((entry) => entry.earned);
  const highest = new Map<string, PersonalEmblem>();
  for (const entry of earned) if (entry.kind === "milestone" && (!highest.has(entry.family) || (entry.stage ?? 0) > (highest.get(entry.family)?.stage ?? 0))) highest.set(entry.family, entry);
  if (keys !== null) {
    const available = new Map(earned.map((entry) => [entry.key, entry]));
    const canonical = keys.flatMap((key) => {
      const entry = available.get(key);
      return !entry ? [] : [entry.kind === "milestone" ? highest.get(entry.family)!.key : entry.key];
    });
    return [...new Set(canonical)].slice(0, 3);
  }
  return earned.filter((entry) => entry.kind === "award" || highest.get(entry.family)?.key === entry.key)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")
    || (a.rank ?? 4) - (b.rank ?? 4) || (b.stage ?? 0) - (a.stage ?? 0))
    .slice(0, 3).map((entry) => entry.key);
}
