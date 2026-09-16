"use client";

import { Button } from "@/components/ui/button";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";

export type ScoreMode = "m" | "a";
function sampleHash(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}
// QA presentation only. Never write these values into a round's score snapshot.
export function previewScores(ids: string[], saved: MaSnapshot): MaSnapshot {
  return Object.fromEntries(ids.map((id) => [id, saved[id] ?? {
    m: ((sampleHash(id) % 61) - 30) / 10,
    a: ((sampleHash(`${id}:a`) % 61) - 30) / 10,
  }]));
}
// A future predictor must return the exact roster/score/map context it evaluated.
export type BalanceEstimate = { context: string; team1: number; sampleSize: number; confidence: "낮음" | "보통" | "높음" };
export function predictionContext(roster: BalanceRoster, scores: MaSnapshot, mode: ScoreMode, map: string | null, bannedHeroes: readonly string[] = []) {
  const teams = [roster.team1, roster.team2].map((team) => [team.tank, ...team.dmg, ...team.sup].map((id) => [id, id ? scores[id]?.[mode] ?? null : null]));
  return JSON.stringify([teams, mode, map, [...new Set(bannedHeroes)].sort()]);
}
export function ScoreModeToggle({ value, onChange, premium }: { value: ScoreMode; onChange: (value: ScoreMode) => void; premium: boolean }) {
  return <div role="group" aria-label="점수 표시" className="inline-flex gap-1 rounded-lg bg-muted/50 p-1">
    <Button size="sm" variant={value === "m" ? "secondary" : "ghost"} aria-pressed={value === "m"} onClick={() => onChange("m")}>M 점수</Button>
    {premium ? <Button size="sm" variant={value === "a" ? "secondary" : "ghost"} aria-pressed={value === "a"} onClick={() => onChange("a")}>A 점수</Button> : null}
  </div>;
}

function EstimateRow({ title, context, estimate, ready, waiting, sample = false }: {
  title: string; context: string; estimate?: BalanceEstimate; ready: boolean; waiting: string; sample?: boolean;
}) {
  const valid = ready && estimate?.context === context && Number.isFinite(estimate.team1) && estimate.team1 >= 0 && estimate.team1 <= 100 && estimate.sampleSize > 0;
  return <div className="space-y-2" aria-label="예측 승률" data-testid="balance-win-probability">
    <div className="flex items-center justify-between gap-2 text-xs"><span>{title}</span><span className="text-muted-foreground">{valid ? sample ? "샘플" : `신뢰도 ${estimate.confidence} · ${estimate.sampleSize}경기` : waiting}</span></div>
    <div className="flex items-center justify-between text-sm font-semibold tabular-nums"><span className="text-sky-600 dark:text-sky-300">{valid ? `${Math.round(estimate.team1)}%` : "—"}</span><span className="text-rose-600 dark:text-rose-300">{valid ? `${100 - Math.round(estimate.team1)}%` : "—"}</span></div>
    <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">{valid ? <><span className="bg-sky-500" style={{ width: `${estimate.team1}%` }} /><span className="flex-1 bg-rose-500" /></> : null}</div>
  </div>;
}

export function BalanceTeamInsights({ roster, scores, mode, map, premium, overall, byMap, showMap = false, compact = false, sample = false, bannedHeroes }: {
  roster: BalanceRoster; scores: MaSnapshot; mode: ScoreMode; map: string | null; premium: boolean;
  bannedHeroes?: readonly string[];
  overall?: BalanceEstimate; byMap?: BalanceEstimate;
  showMap?: boolean; compact?: boolean; sample?: boolean;
}) {
  const teams = [roster.team1, roster.team2].map((team) => [team.tank, ...team.dmg, ...team.sup]);
  const complete = teams.flat().every(Boolean) && new Set(teams.flat()).size === 10;
  const selectedMap = showMap ? map : null;
  const context = predictionContext(roster, scores, mode, selectedMap, bannedHeroes);
  // A selected map replaces the overall estimate; never show stale overall odds
  // as though they included the newly selected map.
  const estimate = selectedMap ? byMap : overall;
  const sampleEstimate = (context: string): BalanceEstimate => ({ context, team1: 42 + sampleHash(context) % 17, sampleSize: 1, confidence: "낮음" });
  if (!premium) return null;
  return <aside aria-label="팀 밸런스 비교" className={compact ? "mb-3 space-y-2 rounded-xl bg-muted/25 px-3 py-3 sm:px-4" : "space-y-4 rounded-xl border bg-muted/15 p-4"} aria-live="polite">
      <EstimateRow title={bannedHeroes ? "예측 승률 · 맵·영웅 밴 반영" : selectedMap ? `예측 승률 · ${selectedMap} 반영` : "예측 승률"} context={context} estimate={sample ? sampleEstimate(context) : estimate} sample={sample} ready={complete} waiting={complete ? bannedHeroes ? "밴·포지션 영향 모델 준비 중" : "예측 준비 중" : "10명 편성 후 확인"} />
  </aside>;
}
