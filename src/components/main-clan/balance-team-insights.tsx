"use client";

import { Button } from "@/components/ui/button";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";

export type ScoreMode = "m" | "a";
// A future predictor must return the exact roster/score/map context it evaluated.
export type BalanceEstimate = { context: string; team1: number; sampleSize: number; confidence: "낮음" | "보통" | "높음" };
export function predictionContext(roster: BalanceRoster, scores: MaSnapshot, mode: ScoreMode, map: string | null) {
  const teams = [roster.team1, roster.team2].map((team) => [team.tank, ...team.dmg, ...team.sup].map((id) => [id, id ? scores[id]?.[mode] ?? null : null]));
  return JSON.stringify([teams, mode, map]);
}
export function ScoreModeToggle({ value, onChange, premium }: { value: ScoreMode; onChange: (value: ScoreMode) => void; premium: boolean }) {
  return <div role="group" aria-label="점수 표시" className="inline-flex gap-1 rounded-lg bg-muted/50 p-1">
    <Button size="sm" variant={value === "m" ? "secondary" : "ghost"} aria-pressed={value === "m"} onClick={() => onChange("m")}>M 점수</Button>
    {premium ? <Button size="sm" variant={value === "a" ? "secondary" : "ghost"} aria-pressed={value === "a"} onClick={() => onChange("a")}>A 점수</Button> : null}
  </div>;
}

function EstimateRow({ title, context, estimate, ready, waiting }: {
  title: string; context: string; estimate?: BalanceEstimate; ready: boolean; waiting: string;
}) {
  const valid = ready && estimate?.context === context && Number.isFinite(estimate.team1) && estimate.team1 >= 0 && estimate.team1 <= 100 && estimate.sampleSize > 0;
  return <div className="space-y-2" aria-label={title}>
    <div className="flex items-center justify-between gap-2 text-xs"><span>{title}</span><span className="text-muted-foreground">{valid ? `신뢰도 ${estimate.confidence} · ${estimate.sampleSize}경기` : waiting}</span></div>
    <div className="flex items-center justify-between text-sm font-semibold tabular-nums"><span className="text-sky-600 dark:text-sky-300">{valid ? `${Math.round(estimate.team1)}%` : "—"}</span><span className="text-rose-600 dark:text-rose-300">{valid ? `${100 - Math.round(estimate.team1)}%` : "—"}</span></div>
    <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">{valid ? <><span className="bg-sky-500" style={{ width: `${estimate.team1}%` }} /><span className="flex-1 bg-rose-500" /></> : null}</div>
  </div>;
}

export function BalanceTeamInsights({ roster, scores, mode, map, premium, overall, byMap }: {
  roster: BalanceRoster; scores: MaSnapshot; mode: ScoreMode; map: string | null; premium: boolean;
  overall?: BalanceEstimate; byMap?: BalanceEstimate;
}) {
  const teams = [roster.team1, roster.team2].map((team) => [team.tank, ...team.dmg, ...team.sup]);
  const totals = teams.map((ids) => ids.every((id) => id && scores[id]?.[mode] != null) ? ids.reduce((sum, id) => sum + scores[id!]![mode]!, 0) : null);
  const complete = teams.flat().every(Boolean) && new Set(teams.flat()).size === 10;
  return <aside aria-label="팀 밸런스 비교" className="space-y-4 rounded-xl border bg-muted/15 p-4" aria-live="polite">
    <div className="flex items-center justify-between text-xs"><h4 className="font-semibold">{mode.toUpperCase()}점수 차이</h4><span className="text-muted-foreground">{totals[0] !== null && totals[1] !== null ? `차이 ${Math.abs(totals[0] - totals[1]).toFixed(1)}` : "점수 미등록 또는 명단 미완성"}</span></div>
    <div className="flex justify-between text-sm font-semibold tabular-nums"><span className="text-sky-600 dark:text-sky-300">1팀 {totals[0]?.toFixed(1) ?? "—"}</span><span className="text-rose-600 dark:text-rose-300">2팀 {totals[1]?.toFixed(1) ?? "—"}</span></div>
    {premium ? <div className="space-y-4 border-t pt-4">
      <EstimateRow title="예측 승률" context={predictionContext(roster, scores, mode, null)} estimate={overall} ready={complete} waiting={complete ? "예측 준비 중" : "10명 편성 후 확인"} />
      <EstimateRow title={map ? `맵 반영 승률 · ${map}` : "맵 반영 승률"} context={predictionContext(roster, scores, mode, map)} estimate={byMap} ready={complete && !!map} waiting={!map ? "맵을 선택하세요" : complete ? "예측 준비 중" : "10명 편성 후 확인"} />
    </div> : null}
  </aside>;
}
