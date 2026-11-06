"use client";

import { useTranslator } from "#use-translator";
import { useAnalysisPrediction } from "./balance-analysis-provider";
import { formatPercent } from "@/lib/format-percent";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { TeamComparisonMode } from "@/lib/balance/formation";
import type { ReactNode } from "react";
import { formatBalanceScore, scoreComparisonShare, SCORE_LABEL, teamScoreTotal, type ScoreMode } from "@/lib/balance/score-display";
import { BalanceComparisonBar, isValidBalanceEstimate, predictionContext, sampleBalanceEstimate, type BalanceEstimate } from "./balance-team-insights";

function TeamLabels({ comparison }: { comparison: ReactNode }) {
  const tx = useTranslator();
  return <>
    <span className="text-xs font-bold tracking-wider text-team-blue">
      {tx("1팀")}
    </span>
    {comparison}
    <span className="text-xs font-bold tracking-wider text-team-red">
      {tx("2팀")}
    </span>
  </>;
}

export function BalanceTeamSummary({ roster, scores, scoreStatus, mode, premium, showPrediction = false, samplePrediction = false, estimate, enabled = true, comparisonMode = "score" }: {
  roster: BalanceRoster;
  scores?: MaSnapshot;
  scoreStatus?: ReactNode;
  mode: ScoreMode;
  premium: boolean;
  showPrediction?: boolean;
  samplePrediction?: boolean;
  estimate?: BalanceEstimate;
  enabled?: boolean;
  comparisonMode?: TeamComparisonMode;
}) {
  const tx = useTranslator();
  const totals = {
    m: [scores ? teamScoreTotal(roster.team1, scores, "m") : null, scores ? teamScoreTotal(roster.team2, scores, "m") : null] as const,
    a: [scores ? teamScoreTotal(roster.team1, scores, "a") : null, scores ? teamScoreTotal(roster.team2, scores, "a") : null] as const,
  };
  const ids = [roster.team1.tank, ...roster.team1.dmg, ...roster.team1.sup, roster.team2.tank, ...roster.team2.dmg, ...roster.team2.sup];
  const complete = ids.every(Boolean) && new Set(ids).size === 10;
  const wantsPrediction = Boolean(scores && premium && showPrediction);
  const context = wantsPrediction && scores ? predictionContext(roster, scores, mode, null) : "";
  const analysis = useAnalysisPrediction(roster, mode, undefined, wantsPrediction);
  const resolvedEstimate = wantsPrediction && analysis === undefined && samplePrediction ? sampleBalanceEstimate(context) : estimate;
  const validEstimate = wantsPrediction && isValidBalanceEstimate(resolvedEstimate, context, complete);
  const predictedTeam1 = analysis !== undefined ? analysis : validEstimate ? resolvedEstimate!.team1 : null;
  let predictionStatus = complete ? "예측 준비 중" : "10명 편성 후 확인";
  if (typeof analysis === "number") predictionStatus = "";
  else if (analysis === null) predictionStatus = "10명 편성 후 확인";
  else if (validEstimate) predictionStatus = samplePrediction ? "샘플" : `신뢰도 ${resolvedEstimate!.confidence} · ${resolvedEstimate!.sampleSize}경기`;
  const prediction = (analysis !== undefined || comparisonMode === "prediction") && premium && showPrediction;
  const share = prediction ? predictedTeam1 : scoreComparisonShare(totals[mode][0], totals[mode][1]);
  const title = prediction ? tx("예측 승률") : tx("{0} 합계", tx(SCORE_LABEL[mode]));
  const labels = prediction ? [predictedTeam1 == null ? "—" : formatPercent(predictedTeam1), predictedTeam1 == null ? "—" : formatPercent(100 - predictedTeam1)] : totals[mode].map(value => formatBalanceScore(value).replace(/점$/, tx("점")));
  const comparison = <div data-testid="team-comparison-graph" data-mode={prediction ? "prediction" : mode} data-score-mode={mode} aria-label={tx("{0}: 1팀 {1}, 2팀 {2}{3}", title, labels[0], labels[1], prediction && predictionStatus ? `, ${predictionStatus}` : "")} aria-live="polite" className="w-[clamp(110px,32cqw,220px)] min-w-0 justify-self-center space-y-0.5">
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 text-[11px] leading-4 font-bold tabular-nums">
      <span data-testid={prediction ? undefined : "team1-score-total"} aria-label={tx("1팀 {0}", title)} className="text-left text-team-blue">{tx(labels[0])}</span>
      <p className="truncate text-center text-[10px] leading-3 font-medium text-muted-foreground">{title}</p>
      <span data-testid={prediction ? undefined : "team2-score-total"} aria-label={tx("2팀 {0}", title)} className="text-right text-team-red">{tx(labels[1])}</span>
    </div>
    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">{share == null ? null : <><span data-testid="team-comparison-blue-bar" className="bg-sky-500" style={{ width: `${share}%` }} /><span className="flex-1 bg-rose-500" /></>}</div>
  </div>;
  const headingClass = "grid h-6 grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-x-2 rounded-lg px-2 text-center [container-type:inline-size] sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] sm:px-3";
  const content = <TeamLabels comparison={comparison} />;
  const status = <div data-testid="balance-score-status" className="flex h-6 min-w-0 items-center justify-center gap-2 px-2 text-center text-[10px] leading-3 text-muted-foreground sm:px-3">
    {scoreStatus ?? (prediction && predictionStatus && !(validEstimate && samplePrediction) ? <span>{tx(predictionStatus)}</span> : null)}
  </div>;
  const heading = <div className="mb-1"><div className={headingClass}>{content}</div>{status}</div>;

  if (!enabled) return heading;

  return <div className="mb-1"><Tooltip disableHoverablePopup>
    <TooltipTrigger
      delay={300}
      render={<div tabIndex={0} aria-label={tx("팀 비교 요약 보기")} className={`${headingClass} cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring`}>{content}</div>}
    />
    <TooltipContent
      role="tooltip"
      side="bottom"
      sideOffset={8}
      className="pointer-events-none block w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl [&>div:last-child]:bg-popover"
    >
      <p className="text-sm font-bold">{tx("팀 비교 요약")}</p>
      {showPrediction ? <BalanceComparisonBar title={tx("예측 승률")} team1Label={predictedTeam1 == null ? "—" : formatPercent(predictedTeam1)} team2Label={predictedTeam1 == null ? "—" : formatPercent(100 - predictedTeam1)} team1Share={predictedTeam1} status={predictionStatus} testId="team-summary-prediction" /> : null}
      <div className={`grid gap-3 ${premium ? "grid-cols-2" : "grid-cols-1"}`}>
        <BalanceComparisonBar compact title={tx("{0} 합계", tx(SCORE_LABEL.m))} team1Label={formatBalanceScore(totals.m[0])} team2Label={formatBalanceScore(totals.m[1])} team1Share={scoreComparisonShare(totals.m[0], totals.m[1])} testId="team-summary-evaluation" />
        {premium ? <BalanceComparisonBar compact title={tx("{0} 합계", tx(SCORE_LABEL.a))} team1Label={formatBalanceScore(totals.a[0])} team2Label={formatBalanceScore(totals.a[1])} team1Share={scoreComparisonShare(totals.a[0], totals.a[1])} testId="team-summary-analysis" /> : null}
      </div>
    </TooltipContent>
  </Tooltip>{status}</div>;
}
