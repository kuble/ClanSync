/** Keep legacy numbered lines and the dashboard ticker on the same item boundaries. */
export function parseClanRules(value: string | null): string[] {
  return (value ?? "").split(/\r?\n/).map(line => line.trim().replace(/^(?:\d+[.)]|[-*•])\s+/, "")).filter(Boolean);
}
