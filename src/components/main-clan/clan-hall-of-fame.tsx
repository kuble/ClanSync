"use client";

import { useState } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle } from "./stat-help";
import { Crown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { HofSettingsForm } from "./clan-stats-view";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsPeriodFilter } from "./stats-period-filter";
import { statsPeriodKey, statsPeriodLabel, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { HofComments } from "./hof-comments";

const RANKINGS = [
  { id: "rate", label: "승률", help: "승 / (승 + 무 + 패). 최소 출전 기준을 충족한 멤버만 등재합니다." },
  { id: "attendance", label: "최다 출석", help: "한 경기 이상 출전한 내전 날짜 수입니다. 같은 날 여러 내전에 참여해도 1일로 셉니다." },
  { id: "appearances", label: "최다 출전", help: "선택 기간의 전체 유효 경기 중 실제 출전한 경기 수입니다." },
  { id: "prediction", label: "예측 적중", help: "적중 횟수순으로 순위를 매깁니다. 적중률을 함께 표시하며 무승부·무효 예측은 제외합니다." },
] as const;

type RankRow = { userId: string; nickname: string; value: string; detail: string };

export function HallOfFame({ model, gameSlug, clanId, onChoosePerson }: {
  model: ClanStatsPageModel; gameSlug: string; clanId: string; onChoosePerson: (userId: string) => void;
}) {
  const visible = {
    rate: model.permissions.isStaff || model.hof.config.winRateVisibleTop > 0,
    attendance: model.permissions.isStaff || model.hof.config.participationVisibleTop > 0,
    appearances: model.permissions.isStaff || model.hof.config.cumulativeVisibleTop > 0,
    prediction: model.permissions.isStaff || model.hof.config.predictionVisibleTop > 0,
  };
  const now = currentKstYearMonth();
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const years = [...new Set([String(now.year), ...Object.keys(model.hof.historyYears)])].sort().reverse();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const month = `${period.year}-${period.month}`, year = period.year;
  const [ranking, setRanking] = useState<(typeof RANKINGS)[number]["id"]>("rate");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedBlock = period.mode === "all" ? model.hof.periods.all
    : period.mode === "month" ? (month === currentMonth ? model.hof.periods.month : model.hof.historyMonths[month])
      : year === String(now.year) ? model.hof.periods.year : model.hof.historyYears[year];
  const block = selectedBlock ?? {
    totals: { sessions: 0, days: 0, matches: 0 }, minimumGames: 1,
    unqualified: model.permissions.isStaff ? [...model.hof.periods.all.winRate, ...model.hof.periods.all.unqualified].map((row) => ({ ...row, wins: 0, draws: 0, losses: 0, ratePct: null })) : [],
    undisclosed: false, undisclosedHint: null, winRate: [], wins: [], streaks: [], participation: [], cumulative: [], predictionCorrect: [],
  };
  const { totals } = block;
  const rankingRows: Record<(typeof RANKINGS)[number]["id"], RankRow[]> = {
    rate: block.winRate.map((row) => ({ ...row, value: `${row.ratePct ?? 0}%`, detail: `${row.wins}승 / ${row.draws}무 / ${row.losses}패 · ${row.wins + row.draws + row.losses}경기` })),
    attendance: block.participation.map((row) => ({ ...row, value: `${row.played}일`, detail: `전체 개최 ${totals.days}일 중 ${row.played}일 출석 · 내전 ${totals.sessions}회` })),
    appearances: block.cumulative.map((row) => ({ ...row, value: `${row.played}경기`, detail: `전체 ${totals.matches}경기 중 ${row.played}경기 출전 · 내전 ${totals.sessions}회` })),
    prediction: block.predictionCorrect.map((row) => ({ ...row, value: `${row.correct}회`, detail: `${row.valid}회 예측 중 ${row.correct}회 적중 · 적중률 ${row.ratePct ?? 0}%` })),
  };
  const available = RANKINGS.filter(({ id }) => visible[id]);
  const active = available.find(({ id }) => id === ranking) ?? available[0];
  const periodKey = statsPeriodKey(period);
  const periodLabel = statsPeriodLabel(period);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><h3 className="text-base font-bold"><StatTitle title="명예의 전당" help="공개된 기록과 등재 기준에 따른 순위입니다." /></h3></div>
      {model.permissions.isStaff && model.permissions.setHofRules && <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}><Settings2 className="size-4" aria-hidden="true" /> 설정</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>통계 공개 설정</DialogTitle><DialogDescription>순위 공개 범위와 등재 기준을 정합니다.</DialogDescription></DialogHeader><HofSettingsForm gameSlug={gameSlug} clanId={clanId} cfg={model.hof.config} exposeHof={model.hof.exposeHof} isLeader={model.permissions.isLeader} onDone={() => setSettingsOpen(false)} /></DialogContent>
      </Dialog>}
    </div>
    <div className="flex flex-wrap items-start gap-4">
      {active && <RubberSegment label="부문" labelPosition="top" options={available} value={active.id} onChange={setRanking} />}
      <StatsPeriodFilter value={period} onChange={(next) => setPeriod({ ...next, month: next.year === String(now.year) && Number(next.month) > now.month ? String(now.month).padStart(2, "0") : next.month })} years={years} maxMonth={year === String(now.year) ? now.month : 12} />
    </div>
    {block.undisclosed ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{block.undisclosedHint}</p> : !active ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">공개된 통계 부문이 없습니다.</p> : <>
      <p className="text-xs text-muted-foreground">선택 기간 정규 내전 <strong className="text-foreground">{totals.sessions}회</strong> · 개최 {totals.days}일 · 전체 {totals.matches}경기</p>
      <div className="grid items-start gap-4 min-[1000px]:grid-cols-2" aria-label="명예의 전당 순위와 반응">
          <Card key={active.id} size="sm" className="min-w-0">
            <CardHeader><CardTitle><h4><StatTitle title={active.label} help={active.help} /></h4></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {active.id === "rate" && <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border bg-background/40 px-3 py-2 text-xs"><span className="text-muted-foreground">최소 규정 경기</span><strong>{totals.matches ? `${block.minimumGames}경기 이상 출전` : "집계할 경기 없음"}</strong></div>}
              {rankingRows[active.id].length ? (
                <StatsScrollArea label={`${active.label} 순위 목록`} className="max-h-[28rem]">
                  <ol className="space-y-2">
                    {rankingRows[active.id].map((row, index) => {
                      const canOpen = model.personal.people.some((person) => person.userId === row.userId);
                      const content = <>
                        <span className={`flex w-12 shrink-0 flex-col items-center font-black tabular-nums ${index === 0 ? "text-amber-300" : index === 1 ? "text-slate-300" : index === 2 ? "text-orange-300" : "text-muted-foreground"}`}>
                          {index < 3 && <Crown className="mb-0.5 size-3.5" aria-hidden="true" />}
                          <span className="text-2xl leading-none">{String(index + 1).padStart(2, "0")}<span className="sr-only">위</span></span>
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{row.nickname}</span><strong className="shrink-0 text-lg tabular-nums">{row.value}</strong></span>
                          <span className="block text-[11px] text-muted-foreground">{row.detail}</span>
                        </span>
                      </>;
                      const className = `relative flex min-h-[76px] w-full items-center gap-3 rounded-lg border p-3 text-left ${index === 0 ? "border-amber-400/25 bg-amber-400/[0.04]" : "bg-background/20"}`;
                      return <li key={row.userId}>{canOpen ? <button type="button" onClick={() => onChoosePerson(row.userId)} className={`${className} hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary`}>{content}</button> : <div className={className}>{content}</div>}</li>;
                    })}
                  </ol>
                </StatsScrollArea>
              ) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">등재 기준을 충족한 기록이 없습니다.</p>}
              {active.id === "rate" && model.permissions.isStaff && <details className="rounded-lg border border-dashed p-3">
                <summary className="cursor-pointer text-xs font-semibold">규정 미달 {block.unqualified.length}명 <span className="ml-1 font-normal text-muted-foreground">운영진 전용</span></summary>
                <p className="mt-2 text-[11px] text-muted-foreground">정식 순위에서 제외됩니다. 출전 수가 기준에 도달하면 자동 등재됩니다.</p>
                {block.unqualified.length ? <StatsScrollArea label="규정 미달 멤버" className="mt-3 max-h-64"><ul className="divide-y">{block.unqualified.map((row) => {
                  const played = row.wins + row.draws + row.losses;
                  return <li key={row.userId} className="flex items-center gap-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-medium">{row.nickname}</span><span className="shrink-0 text-right tabular-nums"><span className="block">{played} / {block.minimumGames}경기</span><span className="text-muted-foreground">{Math.max(0, block.minimumGames - played)}경기 부족</span></span></li>;
                })}</ul></StatsScrollArea> : <p className="mt-3 text-xs text-muted-foreground">규정 미달 멤버가 없습니다.</p>}
              </details>}
            </CardContent>
          </Card>
          <HofComments key={`${clanId}:${active.id}:${periodKey}`} clanId={clanId} ranking={active.id} periodKey={periodKey} label={`${periodLabel} · ${active.label}`} />
      </div>
    </>}
  </div>;
}
