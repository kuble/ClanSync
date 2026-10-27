/** Input is already in percent units (53 means 53.0%). */
export function formatPercent(value: number | null | undefined, empty = "—"): string {
  return value == null || !Number.isFinite(value) ? empty : `${value.toFixed(1)}%`;
}
