import { expect, test } from "@playwright/test";
import { loadDashboardRows } from "../src/lib/clan/load-dashboard-rows";

test("rankings load every row beyond the API cap", async () => {
  const all = Array.from({ length: 1304 }, (_, id) => ({ id }));
  const ranges: number[][] = [];
  const result = await loadDashboardRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: all.slice(from, to + 1), count: all.length, error: null };
  });
  expect(result.data).toEqual(all);
  expect(result.error).toBeNull();
  expect(ranges).toEqual([[0, 499], [500, 999], [1000, 1499]]);
});

test("a later request failure or incomplete page does not publish partial rankings", async () => {
  const first = Array.from({ length: 500 }, (_, id) => ({ id }));
  const failure = await loadDashboardRows(async (from) => from === 0
    ? { data: first, count: 700, error: null }
    : { data: null, count: null, error: new Error("network") });
  expect(failure.data).toBeNull();
  expect(failure.error).toBeTruthy();
  const capped = await loadDashboardRows(async () => ({ data: first.slice(0, 100), count: 700, error: null }));
  expect(capped.data).toBeNull();
  expect(capped.error).toBeTruthy();
});

test("empty history and exact page boundary remain valid; changing totals fail closed", async () => {
  expect((await loadDashboardRows(async () => ({ data: [], count: 0, error: null }))).data).toEqual([]);
  const all = Array.from({ length: 1000 }, (_, id) => ({ id }));
  expect((await loadDashboardRows(async (from, to) => ({ data: all.slice(from, to + 1), count: 1000, error: null }))).data).toEqual(all);
  const changed = await loadDashboardRows(async (from, to) => ({ data: all.slice(from, to + 1), count: from === 0 ? 1000 : 1001, error: null }));
  expect(changed.data).toBeNull();
  expect(changed.error).toBeTruthy();
});
