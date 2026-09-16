import type { FormationDraw } from "./formation";

export const ROLE_DRAW_DURATION_MS = 18_000;

/** Server timestamps keep reconnecting clients at the current reveal step. */
export function drawRevealCount(
  draw: FormationDraw,
  now: number,
  count: number,
) {
  if (now >= draw.startedAt + draw.durationMs) return count;
  const intro = Math.min(3000, draw.durationMs / 3);
  return Math.max(
    0,
    Math.min(
      count,
      Math.floor(
        (now - draw.startedAt - intro) / ((draw.durationMs - intro) / count),
      ) + 1,
    ),
  );
}
