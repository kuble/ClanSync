import { expect, test } from "@playwright/test";
import { awardEmblems, milestoneEmblems, resolveFeaturedKeys } from "../src/lib/personal-emblems/catalog";
const history = (...keys: string[]) => new Map(keys.map((key) => [key, "2025-07-01T15:30:00Z"]));

test("마감 수상은 기간·금속에 맞는 원본으로 변환하고 기존 수상키를 보존한다", () => {
  const entries = awardEmblems([
    { key: "month-2026-09-승률", category: "승률", date: "2026-09", period: "month", rank: 2 },
    { key: "year-2025-최다 참여", category: "최다 참여", date: "2025", period: "year", rank: 3 },
  ]);
  expect(entries[0]).toMatchObject({ key: "month-2026-09-승률", description: "월간 승률 2위", earned: true, artwork: "/personal-emblems/v1/awards/month/victory-silver.png" });
  expect(entries[1]).toMatchObject({ description: "연간 최다 참여 3위", artwork: "/personal-emblems/v1/awards/year/participation-bronze.png" });
  expect(entries.every((entry) => !("name" in entry))).toBe(true);
});

test("5계열 20단계는 보관된 달성일로 해금되며 현재 진척과 독립적으로 유지된다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 499, wins: 0, streak: 7, prediction: 300 }, history(
    "milestone-sessions-1", "milestone-sessions-2", "milestone-matches-1", "milestone-matches-2", "milestone-matches-3",
    "milestone-streak-1", "milestone-streak-2", "milestone-streak-3", "milestone-wins-1",
    "milestone-prediction-1", "milestone-prediction-2", "milestone-prediction-3", "milestone-prediction-4"));
  expect(entries).toHaveLength(20);
  expect(new Set(entries.map((entry) => entry.key)).size).toBe(20);
  expect(entries.find((entry) => entry.key === "milestone-wins-1")).toMatchObject({ description: "10승 달성", earned: true, progress: 0, date: "2025-07-01T15:30:00Z" });
  expect(entries.find((entry) => entry.key === "milestone-wins-2")).toMatchObject({ earned: false, date: null });
  expect(entries.filter((entry) => entry.family === "sessions").map((entry) => entry.earned)).toEqual([true, true, false, false]);
  expect(entries.filter((entry) => entry.family === "matches").map((entry) => entry.earned)).toEqual([true, true, true, false]);
  expect(entries.filter((entry) => entry.family === "streak").map((entry) => entry.earned)).toEqual([true, true, true, false]);
  expect(entries.filter((entry) => entry.family === "prediction").every((entry) => entry.earned)).toBe(true);
});

test("대표는 저장 순서·명시 빈 선택을 유지하고 미획득·중복·숨긴 키를 제외한다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 0, wins: 0, streak: 0, prediction: 0 }, history("milestone-sessions-1", "milestone-sessions-2"));
  expect(resolveFeaturedKeys(entries, [])).toEqual([]);
  expect(resolveFeaturedKeys(entries, ["milestone-sessions-2", "milestone-sessions-4", "unknown", "milestone-sessions-2", "milestone-sessions-1"]))
    .toEqual(["milestone-sessions-2"]);
  expect(resolveFeaturedKeys(entries, null)).toEqual(["milestone-sessions-2"]);
  const awards = awardEmblems([
    { key: "old", category: "승률", date: "2025", period: "year", rank: 1 },
    { key: "latest-silver", category: "승률", date: "2026-09", period: "month", rank: 2 },
    { key: "latest-gold", category: "최다 출전", date: "2026-09", period: "month", rank: 1 },
  ]);
  expect(resolveFeaturedKeys([...entries, ...awards], null)).toEqual(["latest-gold", "latest-silver", "old"]);
});

test("연간 수상은 12월 수상과 같은 마감 시점으로 자동 대표에 정렬한다", () => {
  const awards = awardEmblems([
    { key: "annual", category: "승률", date: "2025", period: "year", rank: 1 },
    ...["12", "11", "10"].map((month) => ({ key: month, category: "승률" as const, date: `2025-${month}`, period: "month" as const, rank: 1 })),
  ]);
  expect(resolveFeaturedKeys(awards, null)).toEqual(["annual", "12", "11"]);
});

test("달성형 대표는 계열별 최고 획득 단계로 올라가며 같은 계열은 한 슬롯만 차지한다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 100, wins: 300, streak: 10, prediction: 0 }, history(
    "milestone-sessions-1", "milestone-sessions-2", "milestone-matches-1", "milestone-matches-3", "milestone-wins-4", "milestone-streak-4"));
  expect(resolveFeaturedKeys(entries, null)).toEqual(["milestone-wins-4", "milestone-streak-4", "milestone-matches-3"]);
  expect(resolveFeaturedKeys(entries, ["milestone-sessions-1", "milestone-sessions-2", "milestone-matches-1"]))
    .toEqual(["milestone-sessions-2", "milestone-matches-3"]);
  expect(resolveFeaturedKeys(entries, ["milestone-sessions-4", "milestone-prediction-1"])).toEqual([]);
});
