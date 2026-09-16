import { expect, test } from "@playwright/test";
import { drawRevealCount, ROLE_DRAW_DURATION_MS } from "../src/lib/balance/draw-presentation";
import { MAP_DRAW_TICKS, mapDrawHighlight, mapDrawTickDelay } from "../src/lib/balance/map-draw-presentation";

test("draw presentation: faster roles preserve reconnect progress", () => {
  const draw = { id: "draw", startedAt: 1000, durationMs: ROLE_DRAW_DURATION_MS, roleMode: "lottery" as const };
  expect(ROLE_DRAW_DURATION_MS).toBe(9000);
  expect(drawRevealCount(draw, 1900, 10)).toBe(0);
  expect(drawRevealCount(draw, 2000, 10)).toBe(1);
  expect(drawRevealCount(draw, 6000, 10)).toBe(6);
  expect(drawRevealCount(draw, 10000, 10)).toBe(10);
});

test("draw presentation: weighted highlights exclude zero votes, empty votes include all maps", () => {
  const counts = [0, 0, 0];
  const empty = new Set<number>();
  for (let tick = 0; tick < 1000; tick++) {
    counts[mapDrawHighlight([1, 3, 0], tick)]++;
    empty.add(mapDrawHighlight([0, 0, 0], tick));
    expect(mapDrawHighlight([0, 0, 5], tick)).toBe(2);
  }
  expect(counts[0]).toBeGreaterThanOrEqual(245);
  expect(counts[0]).toBeLessThanOrEqual(255);
  expect(counts[2]).toBe(0);
  expect([...empty].sort()).toEqual([0, 1, 2]);
  const delays = Array.from({ length: MAP_DRAW_TICKS }, (_, tick) => mapDrawTickDelay(tick));
  expect(delays).toEqual([...delays].sort((a, b) => a - b));
  expect(delays.reduce((sum, delay) => sum + delay, 0)).toBeLessThan(2500);
});
