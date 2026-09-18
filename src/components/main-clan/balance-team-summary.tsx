"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import { formatBalanceScore, scoreComparisonShare, SCORE_LABEL, teamScoreTotal, type ScoreMode } from "@/lib/balance/score-display";
import { BalanceComparisonBar, isValidBalanceEstimate, predictionContext, sampleBalanceEstimate, type BalanceEstimate } from "./balance-team-insights";

function TeamLabels({ roster, scores, mode }: { roster: BalanceRoster; scores: MaSnapshot; mode: ScoreMode }) {
  return <>
    <span className="text-xs font-bold tracking-wider text-sky-600 dark:text-sky-300">
      1팀<span data-testid="team1-score-total" className="tracking-normal" aria-label={`1팀 ${SCORE_LABEL[mode]} 합계`}>({formatBalanceScore(teamScoreTotal(roster.team1, scores, mode))})</span>
    </span>
    <span className="text-base font-black italic text-muted-foreground/60">VS</span>
    <span className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-300">
      2팀<span data-testid="team2-score-total" className="tracking-normal" aria-label={`2팀 ${SCORE_LABEL[mode]} 합계`}>({formatBalanceScore(teamScoreTotal(roster.team2, scores, mode))})</span>
    </span>
  </>;
}

export function BalanceTeamSummary({ roster, scores, mode, premium, showPrediction = false, samplePrediction = false, estimate, enabled = true }: {
  roster: BalanceRoster;
  scores: MaSnapshot;
  mode: ScoreMode;
  premium: boolean;
  showPrediction?: boolean;
  samplePrediction?: boolean;
  estimate?: BalanceEstimate;
  enabled?: boolean;
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
  const heading = <div className="mb-3 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 rounded-lg text-center sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"><TeamLabels roster={roster} scores={scores} mode={mode} /></div>;

  if (!enabled) return heading;

  return <Tooltip disableHoverablePopup>
    <TooltipTrigger
      delay={300}
      render={<div tabIndex={0} aria-label="팀 비교 요약 보기" className="mb-3 grid cursor-help grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"><TeamLabels roster={roster} scores={scores} mode={mode} /></div>}
    />
    <TooltipContent
      role="tooltip"
      side="bottom"
      sideOffset={8}
      className="pointer-events-none block w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl [&>div:last-child]:bg-popover"
    >
      <p className="text-sm font-bold">팀 비교 요약</p>
      {showPrediction ? <BalanceComparisonBar title="예측 승률" team1Label={predictedTeam1 == null ? "—" : `${predictedTeam1}%`} team2Label={predictedTeam1 == null ? "—" : `${100 - predictedTeam1}%`} team1Share={predictedTeam1} status={validEstimate ? samplePrediction ? "샘플" : `신뢰도 ${resolvedEstimate!.confidence} · ${resolvedEstimate!.sampleSize}경기` : complete ? "예측 준비 중" : "10명 편성 후 확인"} testId="team-summary-prediction" /> : null}
      <div className={`grid gap-3 ${premium ? "grid-cols-2" : "grid-cols-1"}`}>
        <BalanceComparisonBar compact title={`${SCORE_LABEL.m} 합계`} team1Label={formatBalanceScore(totals.m[0])} team2Label={formatBalanceScore(totals.m[1])} team1Share={scoreComparisonShare(totals.m[0], totals.m[1])} testId="team-summary-evaluation" />
        {premium ? <BalanceComparisonBar compact title={`${SCORE_LABEL.a} 합계`} team1Label={formatBalanceScore(totals.a[0])} team2Label={formatBalanceScore(totals.a[1])} team1Share={scoreComparisonShare(totals.a[0], totals.a[1])} testId="team-summary-analysis" /> : null}
      </div>
    </TooltipContent>
  </Tooltip>;
}
