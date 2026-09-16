export const MAP_DRAW_TICKS = 16;

/** Fast scanning slows down before revealing the server-selected winner. */
export function mapDrawTickDelay(tick: number) {
  return 55 + Math.round(260 * (tick / MAP_DRAW_TICKS) ** 3);
}

/** Presentation only: evenly spread samples preserve vote weights without rerolling a winner. */
export function mapDrawHighlight(tallies: readonly number[], tick: number) {
  const total = tallies.reduce((sum, count) => sum + count, 0);
  const weights = total ? tallies : tallies.map(() => 1);
  let sample = ((tick * 0.61803398875) % 1) * (total || weights.length);
  for (let i = 0; i < weights.length; i++) {
    sample -= weights[i];
    if (sample < 0) return i;
  }
  return weights.length - 1;
}
