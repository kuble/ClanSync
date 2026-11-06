import { scoresForRoles, type MaSnapshot } from "./ma-snapshot";
import type { BalanceRoster } from "./roster-schema";
import type { Role } from "./formation";

export type AnalysisContext = { userId: string; role: Role | null; map: string | null; score: number; games: number; tierBased?: boolean }[];

export function parseAnalysisContext(value: unknown): AnalysisContext {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is AnalysisContext[number] => Boolean(entry && typeof entry === "object"
    && typeof entry.userId === "string" && [null, "tank", "dmg", "sup"].includes(entry.role)
    && (entry.map === null || typeof entry.map === "string") && Number.isFinite(entry.score)
    && Number.isSafeInteger(entry.games) && (entry.tierBased === true
      ? entry.games >= 0 : entry.games > 0 && entry.score >= -10 && entry.score <= 10)));
}

/** Values are computed by the database. Pick the most specific available context. */
export function analysisValue(context: AnalysisContext, userId: string, role: Role | null, map: string | null): number | null {
  let best: AnalysisContext[number] | undefined;
  let priority = -1;
  for (const entry of context) {
    if (entry.userId !== userId || (entry.role !== null && entry.role !== role) || (entry.map !== null && entry.map !== map)) continue;
    const rank = entry.tierBased ? 4 : (entry.map !== null ? 2 : 0) + (entry.role !== null ? 1 : 0);
    if (rank > priority) { best = entry; priority = rank; }
  }
  return best?.score ?? null;
}

export function contextualScores(scores: MaSnapshot, context: AnalysisContext, roster: BalanceRoster, map: string | null, assignedRoles: readonly { id: string; role: Role }[] = []): MaSnapshot {
  scores = scoresForRoles(scores, roster, assignedRoles);
  const roles = new Map<string, Role>();
  for (const team of [roster.team1, roster.team2]) {
    if (team.tank) roles.set(team.tank, "tank");
    for (const id of team.dmg) if (id) roles.set(id, "dmg");
    for (const id of team.sup) if (id) roles.set(id, "sup");
  }
  for (const player of assignedRoles) roles.set(player.id, player.role);
  const ids = new Set([...Object.keys(scores), ...context.map((entry) => entry.userId), ...roles.keys()]);
  const best = new Map<string, { score: number; priority: number }>();
  for (const entry of context) {
    if ((entry.role !== null && entry.role !== (roles.get(entry.userId) ?? null)) || (entry.map !== null && entry.map !== map)) continue;
    const priority = entry.tierBased ? 4 : (entry.map !== null ? 2 : 0) + (entry.role !== null ? 1 : 0);
    if (priority > (best.get(entry.userId)?.priority ?? -1)) best.set(entry.userId, { score: entry.score, priority });
  }
  return Object.fromEntries([...ids].map((id) => [id, { ...scores[id], m: scores[id]?.m ?? 0, a: best.get(id)?.score ?? null }]));
}
