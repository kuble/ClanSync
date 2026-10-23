import { expect, test } from "@playwright/test";
import { awardEmblems, milestoneEmblems, resolveFeaturedKeys } from "../src/lib/personal-emblems/catalog";

test("마감 수상은 기간·금속에 맞는 원본으로 변환하고 기존 수상키를 보존한다", () => {
  const entries = awardEmblems([
    { key: "month-2026-09-승률", category: "승률", date: "2026-09", period: "month", rank: 2 },
    { key: "year-2025-최다 참여", category: "최다 참여", date: "2025", period: "year", rank: 3 },
  ]);
  expect(entries[0]).toMatchObject({ key: "month-2026-09-승률", name: "승리의 별", earned: true, artwork: "/personal-emblems/v1/awards/month/victory-silver.png" });
  expect(entries[1]).toMatchObject({ name: "약속의 태양", artwork: "/personal-emblems/v1/awards/year/participation-bronze.png" });
});

test("5계열 20단계가 임계값으로 해금되고 달성 날짜를 만들어 내지 않는다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 499, wins: 0, streak: 7, prediction: 300 });
  expect(entries).toHaveLength(20);
  expect(new Set(entries.map((entry) => entry.key)).size).toBe(20);
  expect(entries.every((entry) => entry.date === null)).toBe(true);
  expect(entries.filter((entry) => entry.family === "sessions").map((entry) => entry.earned)).toEqual([true, true, false, false]);
  expect(entries.filter((entry) => entry.family === "matches").map((entry) => entry.earned)).toEqual([true, true, true, false]);
  expect(entries.filter((entry) => entry.family === "streak").map((entry) => entry.earned)).toEqual([true, true, true, false]);
  expect(entries.filter((entry) => entry.family === "prediction").every((entry) => entry.earned)).toBe(true);
});

test("대표는 저장 순서·명시 빈 선택을 유지하고 미획득·중복·정정된 키를 제외한다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 0, wins: 0, streak: 0, prediction: 0 });
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

test("달성형 대표는 계열별 최고 획득 단계로 올라가며 같은 계열은 한 슬롯만 차지한다", () => {
  const entries = milestoneEmblems({ sessions: 50, matches: 100, wins: 300, streak: 10, prediction: 0 });
  expect(resolveFeaturedKeys(entries, null)).toEqual(["milestone-wins-4", "milestone-streak-4", "milestone-matches-3"]);
  expect(resolveFeaturedKeys(entries, ["milestone-sessions-1", "milestone-sessions-2", "milestone-matches-1"]))
    .toEqual(["milestone-sessions-2", "milestone-matches-3"]);
  expect(resolveFeaturedKeys(entries, ["milestone-sessions-4", "milestone-prediction-1"])).toEqual([]);
});
