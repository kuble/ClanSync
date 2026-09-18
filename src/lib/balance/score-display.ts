import type { MaSnapshot } from "./ma-snapshot";
import type { TeamRoster } from "./roster-schema";

export const SCORE_LABEL = { m: "평가 점수", a: "분석 점수" } as const;
export type ScoreMode = keyof typeof SCORE_LABEL;

export function formatBalanceScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded}점`;
}

/** Missing scores are not zero; only show a total when all assigned players have a score. */
export function teamScoreTotal(team: TeamRoster, scores: MaSnapshot, mode: ScoreMode) {
  const ids = [team.tank, ...team.dmg, ...team.sup].filter((id): id is string => Boolean(id));
  if (!ids.length) return null;
  let sum = 0;
  for (const id of new Set(ids)) {
    const score = scores[id]?.[mode];
    if (score == null || !Number.isFinite(score)) return null;
    sum += score;
  }
  return Math.round(sum * 100) / 100;
}

/** Convert two signed score totals into a bounded visual share for a VS bar. */
export function scoreComparisonShare(team1: number | null, team2: number | null) {
  if (team1 == null || team2 == null || !Number.isFinite(team1) || !Number.isFinite(team2)) return null;
  if (team1 === team2) return 50;
  const scale = Math.abs(team1) + Math.abs(team2);
  if (!scale) return 50;
  return Math.max(0, Math.min(100, 50 + ((team1 - team2) / scale) * 50));
}
