"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { TeamComparisonMode } from "@/lib/balance/formation";
import type { ReactNode } from "react";
import { formatBalanceScore, scoreComparisonShare, SCORE_LABEL, teamScoreTotal, type ScoreMode } from "@/lib/balance/score-display";
import { BalanceComparisonBar, isValidBalanceEstimate, predictionContext, sampleBalanceEstimate, type BalanceEstimate } from "./balance-team-insights";

function TeamLabels({ roster, scores, mode, comparison, showTotals }: { roster: BalanceRoster; scores: MaSnapshot; mode: ScoreMode; comparison: ReactNode; showTotals: boolean }) {
  return <>
    <span className="text-xs font-bold tracking-wider text-sky-600 dark:text-sky-300">
      1팀{showTotals ? <span data-testid="team1-score-total" className="tracking-normal" aria-label={`1팀 ${SCORE_LABEL[mode]} 합계`}>({formatBalanceScore(teamScoreTotal(roster.team1, scores, mode))})</span> : null}
    </span>
    {comparison}
    <span className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-300">
      2팀{showTotals ? <span data-testid="team2-score-total" className="tracking-normal" aria-label={`2팀 ${SCORE_LABEL[mode]} 합계`}>({formatBalanceScore(teamScoreTotal(roster.team2, scores, mode))})</span> : null}
    </span>
  </>;
}

export function BalanceTeamSummary({ roster, scores, mode, premium, showPrediction = false, samplePrediction = false, estimate, enabled = true, comparisonMode = "score" }: {
  roster: BalanceRoster;
  scores: MaSnapshot;
  mode: ScoreMode;
  premium: boolean;
  showPrediction?: boolean;
  samplePrediction?: boolean;
  estimate?: BalanceEstimate;
  enabled?: boolean;
  comparisonMode?: TeamComparisonMode;
}) {
  const totals = {
    m: [teamScoreTotal(roster.team1, scores, "m"), teamScoreTotal(roster.team2, scores, "m")] as const,
    a: [teamScoreTotal(roster.team1, scores, "a"), teamScoreTotal(roster.team2, scores, "a")] as const,
  };
  const ids = [roster.team1.tank, ...roster.team1.dmg, ...roster.team1.sup, roster.team2.tank, ...roster.team2.dmg, ...roster.team2.sup];
  const complete = ids.every(Boolean) && new Set(ids).size === 10;
  const context = predictionContext(roster, scores, mode, null);
  const resolvedEstimate = samplePrediction ? sampleBalanceEstimate(context) : estimate;
  const validEstimate = isValidBalanceEstimate(resolvedEstimate, context, complete);
  const predictedTeam1 = validEstimate ? Math.round(resolvedEstimate!.team1) : null;
  const predictionStatus = validEstimate ? samplePrediction ? "샘플" : `신뢰도 ${resolvedEstimate!.confidence} · ${resolvedEstimate!.sampleSize}경기` : complete ? "예측 준비 중" : "10명 편성 후 확인";
  const prediction = comparisonMode === "prediction" && premium && showPrediction;
  const share = prediction ? predictedTeam1 : scoreComparisonShare(totals[mode][0], totals[mode][1]);
  const title = prediction ? "예측 승률" : `${SCORE_LABEL[mode]} 합계`;
  const labels = prediction ? [predictedTeam1 == null ? "—" : `${predictedTeam1}%`, predictedTeam1 == null ? "—" : `${100 - predictedTeam1}%`] : totals[mode].map(formatBalanceScore);
  const comparison = <div data-testid="team-comparison-graph" data-mode={prediction ? "prediction" : mode} data-score-mode={mode} aria-label={`${title}: 1팀 ${labels[0]}, 2팀 ${labels[1]}${prediction ? `, ${predictionStatus}` : ""}`} aria-live="polite" className="min-w-0 space-y-1">
    <p className="text-[10px] font-medium text-muted-foreground">{title}</p>
    <div className="flex justify-between gap-2 text-[11px] font-bold tabular-nums"><span className="text-sky-600 dark:text-sky-300">{labels[0]}</span><span className="text-rose-600 dark:text-rose-300">{labels[1]}</span></div>
    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">{share == null ? null : <><span data-testid="team-comparison-blue-bar" className="bg-sky-500" style={{ width: `${share}%` }} /><span className="flex-1 bg-rose-500" /></>}</div>
    {prediction ? <p className="text-[9px] text-muted-foreground">{predictionStatus}</p> : null}
  </div>;
  const headingClass = "mb-3 grid grid-cols-[minmax(0,1fr)_minmax(110px,32%)_minmax(0,1fr)] items-center gap-2 rounded-lg text-center";
  const content = <TeamLabels roster={roster} scores={scores} mode={mode} comparison={comparison} showTotals={!prediction} />;
  const heading = <div className={headingClass}>{content}</div>;

  if (!enabled) return heading;

  return <Tooltip disableHoverablePopup>
    <TooltipTrigger
      delay={300}
      render={<div tabIndex={0} aria-label="팀 비교 요약 보기" className={`${headingClass} cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring`}>{content}</div>}
    />
    <TooltipContent
      role="tooltip"
      side="bottom"
      sideOffset={8}
      className="pointer-events-none block w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl [&>div:last-child]:bg-popover"
    >
      <p className="text-sm font-bold">팀 비교 요약</p>
      {showPrediction ? <BalanceComparisonBar title="예측 승률" team1Label={predictedTeam1 == null ? "—" : `${predictedTeam1}%`} team2Label={predictedTeam1 == null ? "—" : `${100 - predictedTeam1}%`} team1Share={predictedTeam1} status={predictionStatus} testId="team-summary-prediction" /> : null}
      <div className={`grid gap-3 ${premium ? "grid-cols-2" : "grid-cols-1"}`}>
        <BalanceComparisonBar compact title={`${SCORE_LABEL.m} 합계`} team1Label={formatBalanceScore(totals.m[0])} team2Label={formatBalanceScore(totals.m[1])} team1Share={scoreComparisonShare(totals.m[0], totals.m[1])} testId="team-summary-evaluation" />
        {premium ? <BalanceComparisonBar compact title={`${SCORE_LABEL.a} 합계`} team1Label={formatBalanceScore(totals.a[0])} team2Label={formatBalanceScore(totals.a[1])} team1Share={scoreComparisonShare(totals.a[0], totals.a[1])} testId="team-summary-analysis" /> : null}
      </div>
    </TooltipContent>
  </Tooltip>;
}
