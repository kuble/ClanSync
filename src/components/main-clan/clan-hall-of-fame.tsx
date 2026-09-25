"use client";

import { useState } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle } from "./stat-help";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { HofSettingsForm } from "./clan-stats-view";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsGauge } from "./clan-stats-charts";
import { HofRankChart, RANK_COLORS } from "./hof-rank-chart";

const RANKINGS = [
  { id: "rate", label: "승률", help: "승 / (승 + 무 + 패). 최소 출전 기준을 충족한 멤버만 등재합니다." },
  { id: "attendance", label: "최다 출석", help: "한 경기 이상 출전한 내전 날짜 수입니다. 같은 날 여러 내전에 참여해도 1일로 셉니다." },
  { id: "appearances", label: "최다 출전", help: "선택 기간의 전체 유효 경기 중 실제 출전한 경기 수입니다." },
  { id: "prediction", label: "예측 적중", help: "적중 횟수순으로 순위를 매깁니다. 게이지는 적중률이며 무승부·무효 예측은 제외합니다." },
] as const;

type RankRow = { userId: string; nickname: string; value: string; detail: string; numerator: number; denominator: number };

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
  const months = [...new Set([currentMonth, ...Object.keys(model.hof.historyMonths)])].sort().reverse();
  const years = [...new Set([String(now.year), ...Object.keys(model.hof.historyYears)])].sort().reverse();
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(now.year));
  const [ranking, setRanking] = useState<(typeof RANKINGS)[number]["id"]>("rate");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const block = period === "all" ? model.hof.periods.all
    : period === "month" ? (month === currentMonth ? model.hof.periods.month : model.hof.historyMonths[month])
      : year === String(now.year) ? model.hof.periods.year : model.hof.historyYears[year];
  const { totals } = block;
  const rankingRows: Record<(typeof RANKINGS)[number]["id"], RankRow[]> = {
    rate: block.winRate.map((row) => ({ ...row, value: `${row.ratePct ?? 0}%`, detail: `${row.wins}승 / ${row.draws}무 / ${row.losses}패 · ${row.wins + row.draws + row.losses}경기`, numerator: row.wins, denominator: row.wins + row.draws + row.losses })),
    attendance: block.participation.map((row) => ({ ...row, value: `${row.played}일`, detail: `전체 개최 ${totals.days}일 중 ${row.played}일 출석 · 내전 ${totals.sessions}회`, numerator: row.played, denominator: totals.days })),
    appearances: block.cumulative.map((row) => ({ ...row, value: `${row.played}경기`, detail: `전체 ${totals.matches}경기 중 ${row.played}경기 출전 · 내전 ${totals.sessions}회`, numerator: row.played, denominator: totals.matches })),
    prediction: block.predictionCorrect.map((row) => ({ ...row, value: `${row.correct}회`, detail: `${row.valid}회 예측 중 ${row.correct}회 적중 · 적중률 ${row.ratePct ?? 0}%`, numerator: row.correct, denominator: row.valid })),
  };
  const available = RANKINGS.filter(({ id }) => visible[id]);
  const active = available.find(({ id }) => id === ranking) ?? available[0];
  const history = period === "all" ? model.hof.rankHistory.all
    : period === "month" ? model.hof.rankHistory.months[month] ?? [] : model.hof.rankHistory.years[year] ?? [];
  const monthYears = [...new Set(months.map((key) => key.slice(0, 4)))];
  const monthsInYear = months.filter((key) => key.startsWith(month.slice(0, 4)));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><h3 className="text-base font-bold"><StatTitle title="명예의 전당" help="공개된 기록과 등재 기준에 따른 순위입니다." /></h3></div>
      {model.permissions.isStaff && model.permissions.setHofRules && <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}><Settings2 className="size-4" aria-hidden="true" /> 설정</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>통계 공개 설정</DialogTitle><DialogDescription>순위 공개 범위와 등재 기준을 정합니다.</DialogDescription></DialogHeader><HofSettingsForm gameSlug={gameSlug} clanId={clanId} cfg={model.hof.config} exposeHof={model.hof.exposeHof} isLeader={model.permissions.isLeader} onDone={() => setSettingsOpen(false)} /></DialogContent>
      </Dialog>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {available.length > 0 && <RubberSegment label="통계 부문" options={available} value={active.id} onChange={setRanking} />}
      <RubberSegment label="명예의 전당 기간" options={[{ id: "all", label: "전체" }, { id: "month", label: "월별" }, { id: "year", label: "연도별" }]} value={period} onChange={setPeriod} />
      {period === "month" && <>
        <RubberSegment label="연도" options={monthYears.map((key) => ({ id: key, label: `${key}년` }))} value={month.slice(0, 4)} onChange={(key) => setMonth(months.find((item) => item.startsWith(key)) ?? month)} />
        <RubberSegment label="월" options={monthsInYear.map((key) => ({ id: key, label: `${Number(key.slice(5))}월` }))} value={month} onChange={setMonth} />
      </>}
      {period === "year" && <RubberSegment label="명예의 전당 연도" options={years.map((key) => ({id: key, label: key + "년"}))} value={year} onChange={setYear} />}
    </div>
    {block.undisclosed ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{block.undisclosedHint}</p> : !active ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">공개된 통계 부문이 없습니다.</p> : <>
      <p className="text-xs text-muted-foreground">선택 기간 정규 내전 <strong className="text-foreground">{totals.sessions}회</strong> · 개최 {totals.days}일 · 전체 {totals.matches}경기</p>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.3fr)]" aria-label="명예의 전당 순위와 변동">
          <Card key={active.id} size="sm" className="min-w-0">
            <CardHeader><CardTitle><h4><StatTitle title={active.label} help={active.help} /></h4></CardTitle></CardHeader>
            <CardContent>
              {rankingRows[active.id].length ? (
                <StatsScrollArea label={`${active.label} 순위 목록`} className="max-h-[28rem]">
                  <ol className="space-y-2">
                    {rankingRows[active.id].map((row, index) => {
                      const canOpen = model.personal.people.some((person) => person.userId === row.userId);
                      const content = <>
                        <StatsGauge value={row.numerator} total={row.denominator} label={`${row.nickname}: ${row.detail}, ${row.value}`} />
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ color: RANK_COLORS[index % RANK_COLORS.length], backgroundColor: `${RANK_COLORS[index % RANK_COLORS.length]}22` }}>{index + 1}</span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{row.nickname}</span><strong className="shrink-0 text-sm tabular-nums">{row.value}</strong></span>
                          <span className="block text-[11px] text-muted-foreground">{row.detail}</span>
                        </span>
                      </>;
                      const className = "relative isolate flex w-full items-center gap-3 overflow-hidden rounded-xl border p-3 text-left";
                      return <li key={row.userId}>{canOpen ? <button type="button" onClick={() => onChoosePerson(row.userId)} className={`${className} hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary`}>{content}</button> : <div className={className}>{content}</div>}</li>;
                    })}
                  </ol>
                </StatsScrollArea>
              ) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">등재 기준을 충족한 기록이 없습니다.</p>}
            </CardContent>
          </Card>
          <Card size="sm" className="min-w-0"><CardHeader><CardTitle><h4>누적 순위 변동</h4></CardTitle></CardHeader><CardContent>
            <HofRankChart points={history} rows={rankingRows[active.id]} ranking={active.id} period={period} />
          </CardContent></Card>
      </div>
    </>}
  </div>;
}
