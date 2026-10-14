import assert from "node:assert/strict";
import { test } from "node:test";
import { badgeAnniversary } from "../src/lib/clan/badges.ts";

test("주년은 창단 시각을 보존하고 1·3·5·10년 기준일을 계산한다", () => {
  const createdAt = "2016-09-14T16:00:00.000Z";
  for (const [years, expected] of [
    [1, "2017-09-14T16:00:00.000Z"],
    [3, "2019-09-14T16:00:00.000Z"],
    [5, "2021-09-14T16:00:00.000Z"],
    [10, "2026-09-14T16:00:00.000Z"],
  ]) assert.equal(badgeAnniversary(createdAt, years), expected);
  assert.equal(badgeAnniversary(createdAt), badgeAnniversary(createdAt, 1));
});

test("윤년 창단일은 기존 UTC 연도 변경 규칙을 유지한다", () => {
  assert.equal(badgeAnniversary("2024-02-29T16:00:00Z", 1), "2025-03-01T16:00:00.000Z");
  assert.equal(badgeAnniversary("2024-02-29T16:00:00Z", 5), "2029-03-01T16:00:00.000Z");
});
