"use client";

import { useTranslator } from "#use-translator";
import { formatPercent } from "@/lib/format-percent";
import { useState, type ReactNode } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle } from "./stat-help";
import { Crown, MessageSquare, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsPeriodFilter } from "./stats-period-filter";
import { statsPeriodKey, statsPeriodLabel, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { HofScoreboard } from "./hof-scoreboard";
import { HofComments } from "./hof-comments";
import { StatsDrawerTab } from "./stats-side-panel";
import { useStatsPeriod } from "./use-stats-period";

const RANKINGS = [
  { id: "rate", label: "승률", help: "승 / (승 + 무 + 패). 최소 출전 기준을 충족한 멤버만 등재합니다." },
  { id: "attendance", label: "최다 참여", help: "한 경기 이상 출전한 정규 내전 횟수입니다. 같은 내전의 여러 경기는 1회로 세며, 전체 정규 내전 중 최소 참여 비율을 충족한 멤버를 등재합니다." },
  { id: "appearances", label: "최다 출전", help: "선택 기간의 전체 유효 경기 중 실제 출전한 경기 수입니다." },
  { id: "prediction", label: "예측 적중", help: "적중 횟수순으로 순위를 매깁니다. 적중률을 함께 표시하며 무승부·무효 예측은 제외합니다." },
] as const;

type RankRow = { userId: string; nickname: string; value: string; detail: string; rank?: number | null; shortfall?: number };

export function HallOfFame({ model, clanId, onChoosePerson, settings, reactions }: {
  model: ClanStatsPageModel; clanId: string; onChoosePerson: (userId: string) => void; settings?: ReactNode; reactions?: ReactNode;
}) {
  const tx = useTranslator();
  const visible = {
    rate: model.permissions.isStaff || model.hof.config.winRateVisibleTop > 0,
    attendance: model.permissions.isStaff || model.hof.config.participationVisibleTop > 0,
    appearances: model.permissions.isStaff || model.hof.config.cumulativeVisibleTop > 0,
    prediction: model.permissions.isStaff || model.hof.config.predictionVisibleTop > 0,
  };
  const now = currentKstYearMonth();
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const years = [...new Set([String(now.year), ...Object.keys(model.periodDirectory ?? model.hof.historyYears).filter((key) => /^\d{4}$/.test(key))])].sort().reverse();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const month = `${period.year}-${period.month}`, year = period.year;
  const [ranking, setRanking] = useState<(typeof RANKINGS)[number]["id"]>("rate");
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const selectedBlock = period.mode === "all" ? model.hof.periods.all
    : period.mode === "month" ? (month === currentMonth ? model.hof.periods.month : model.hof.historyMonths[month])
      : year === String(now.year) ? model.hof.periods.year : model.hof.historyYears[year];
  const loaded = useStatsPeriod(model, statsPeriodKey(period), !selectedBlock);
  const block = selectedBlock ?? loaded.data?.hof ?? {
    totals: { sessions: 0, days: 0, matches: 0 }, minimumGames: 1, minimumSessions: 1, unqualifiedParticipation: [],
    unqualified: model.permissions.isStaff ? [...model.hof.periods.all.winRate, ...model.hof.periods.all.unqualified].map((row) => ({ ...row, wins: 0, draws: 0, losses: 0, ratePct: null })) : [],
    undisclosed: false, undisclosedHint: null, winRate: [], wins: [], streaks: [], participation: [], cumulative: [], predictionCorrect: [],
  };
  const { totals } = block;
  const rankingRows: Record<(typeof RANKINGS)[number]["id"], RankRow[]> = {
    rate: [
      ...block.winRate.map((row, index) => ({ ...row, rank: index + 1, shortfall: 0 })),
      ...(model.permissions.isStaff ? block.unqualified.map((row) => ({ ...row, rank: null, shortfall: Math.max(0, block.minimumGames - row.wins - row.draws - row.losses) })) : []),
    ].sort((a, b) => (b.ratePct ?? -1) - (a.ratePct ?? -1) || b.wins - a.wins || a.userId.localeCompare(b.userId))
      .map((row) => ({ ...row, value: row.ratePct === null ? "—" : formatPercent(row.ratePct), detail: tx("{0}승 / {1}무 / {2}패 · {3}경기", row.wins, row.draws, row.losses, row.wins + row.draws + row.losses) })),
    attendance: [
      ...block.participation.map((row, index) => ({ ...row, rank: index + 1, shortfall: 0 })),
      ...(model.permissions.isStaff ? block.unqualifiedParticipation.map((row) => ({ ...row, rank: null, shortfall: Math.max(0, block.minimumSessions - row.played) })) : []),
    ].sort((a, b) => b.ratePct - a.ratePct || b.played - a.played || a.userId.localeCompare(b.userId))
      .map((row) => ({ ...row, value: tx("{0}회", row.played), detail: tx("전체 정규 내전 {0}회 중 {1}회 참여 · 참여율 {2}", totals.sessions, row.played, formatPercent(row.ratePct)) })),
    appearances: block.cumulative.map((row) => ({ ...row, value: tx("{0}경기", row.played), detail: tx("전체 {0}경기 중 {1}경기 출전 · 내전 {2}회", totals.matches, row.played, totals.sessions) })),
    prediction: block.predictionCorrect.map((row) => ({ ...row, value: tx("{0}회", row.correct), detail: tx("{0}회 예측 중 {1}회 적중 · 적중률 {2}", row.valid, row.correct, formatPercent(row.ratePct ?? 0)) })),
  };
  const available = RANKINGS.filter(({ id }) => visible[id]);
  const active = available.find(({ id }) => id === ranking) ?? available[0];
  const periodKey = statsPeriodKey(period);
  const periodLabel = statsPeriodLabel(period);
  const criteria = {
    rate: totals.matches ? tx("{0}경기 이상 출전", block.minimumGames) : "집계할 경기 없음",
    attendance: totals.sessions ? tx("{0}회 이상 참여 · {1}%", block.minimumSessions, model.hof.config.eligibilitySessionPct) : "집계할 내전 없음",
    appearances: "출전 경기 수",
    prediction: "예측 적중 횟수",
  };
  return <div className="relative space-y-4" aria-busy={loaded.pending}>
    <section aria-label={tx("명예의 전당 필터")} className="sticky top-[60px] z-30 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:gap-3 supports-[backdrop-filter]:bg-background/80">
      {active && <RubberSegment label={tx("부문")} labelPosition="hidden" options={available} value={active.id} onChange={setRanking} />}
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:flex-1 sm:gap-3">
        <StatsPeriodFilter value={period} onChange={(next) => setPeriod({ ...next, month: next.year === String(now.year) && Number(next.month) > now.month ? String(now.month).padStart(2, "0") : next.month })} years={years} maxMonth={year === String(now.year) ? now.month : 12} />
        <div className="ml-auto shrink-0">{settings}</div>
      </div>
    </section>
    {loaded.feedback}
    {block.undisclosed ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tx(block.undisclosedHint)}</p> : !active ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tx("공개된 통계 부문이 없습니다.")}</p> : <>
      <div className="grid items-stretch gap-4 min-[1000px]:auto-rows-[max(36rem,calc(100dvh-15rem))] min-[1000px]:grid-cols-2" aria-label={tx("명예의 전당 순위와 반응")}>
          {!reactions && <StatsDrawerTab label={tx("반응")} title={tx("반응 열기")} icon={MessageSquare} open={reactionsOpen} onOpen={() => setReactionsOpen(true)} />}
          <Card size="sm" className="h-[36rem] min-h-0 min-w-0 min-[1000px]:h-auto" aria-label={tx("{0} 순위", active.label)}>
            <CardHeader><CardTitle><h4 className="flex items-center gap-2 text-base font-semibold tracking-tight"><Trophy className="size-4 text-primary" aria-hidden="true" /><StatTitle title={tx(active.label)} help={active.help} /></h4></CardTitle></CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <HofScoreboard period={periodLabel} sessions={totals.sessions} matches={totals.matches} criterion={criteria[active.id]} pending={loaded.pending} />
                <StatsScrollArea label={tx("{0} 순위 목록", active.label)} className="min-h-0 flex-1">
              {rankingRows[active.id].length ? (
                  <ol className="space-y-2">
                    {rankingRows[active.id].map((row, index) => {
                      const canOpen = model.personal.people.some((person) => person.userId === row.userId);
                      const rank = row.rank === undefined ? index + 1 : row.rank;
                      const unqualified = rank === null;
                      const content = <>
                        <span className={`flex w-9 shrink-0 flex-col items-center font-bold tabular-nums sm:w-10 ${rank === 1 ? "text-pro-gold" : rank === 2 ? "text-slate-700 dark:text-slate-300" : rank === 3 ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground"}`}>
                          {rank !== null && rank <= 3 && <Crown className="mb-0.5 size-3.5" aria-hidden="true" />}
                          <span className="text-2xl leading-none">{rank === null ? "--" : String(rank).padStart(2, "0")}<span className="sr-only">{unqualified ? tx("순위 제외") : tx("위")}</span></span>
                        </span>
                        <span className="min-w-0 flex-1 space-y-1.5">
                          <span className="block truncate text-sm font-medium text-foreground/90">{row.nickname}</span>
                          <span className="block text-xs leading-relaxed text-muted-foreground">{row.detail}</span>
                          {unqualified && <span className="block text-xs text-muted-foreground">{tx("규정 미달 ·")} {row.shortfall}{active.id === "attendance" ? tx("회") : tx("경기")} {tx("부족")}</span>}
                        </span>
                        <strong className={`shrink-0 text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${unqualified ? "text-muted-foreground" : rank === 1 ? "text-pro-gold" : "text-foreground/85"}`}>{row.value}</strong>
                      </>;
                      const className = `relative flex min-h-[80px] w-full items-center gap-2.5 rounded-lg border p-3 text-left sm:gap-3 ${unqualified ? "border-dashed bg-muted/20" : rank === 1 ? "border-amber-400/25 bg-amber-400/[0.04]" : "border-border/60 bg-background/20"}`;
                      return <li key={row.userId}>{canOpen ? <button type="button" onClick={() => onChoosePerson(row.userId)} className={`${className} hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary`}>{content}</button> : <div className={className}>{content}</div>}</li>;
                    })}
                  </ol>
              ) : <p className="flex min-h-72 items-center justify-center p-8 text-center text-sm text-muted-foreground">{loaded.pending ? tx("집계 중…") : tx("등재 기준을 충족한 기록이 없습니다.")}</p>}
                </StatsScrollArea>
            </CardContent>
          </Card>
          {reactions ?? <HofComments clanId={clanId} ranking={active.id} periodKey={periodKey} label={`${periodLabel} · ${active.label}`} drawerOpen={reactionsOpen} onDrawerOpenChange={setReactionsOpen} />}
      </div>
    </>}
  </div>;
}
