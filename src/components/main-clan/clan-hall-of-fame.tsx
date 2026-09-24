"use client";

import { useState } from "react";
import { CalendarCheck, Settings2, Swords, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { HofSettingsForm } from "./clan-stats-view";
import { StatsGauge } from "./clan-stats-charts";

type Category = "rate" | "attendance" | "appearances" | "streak" | "prediction";
const CATEGORIES = [
  { id: "rate", label: "승률", Icon: Trophy },
  { id: "attendance", label: "최다 출석", Icon: CalendarCheck },
  { id: "appearances", label: "최다 출전", Icon: Swords },
  { id: "prediction", label: "예측 적중", Icon: Target },
  { id: "streak", label: "최장 연승", Icon: Trophy },
] as const;

export function HallOfFame({ model, gameSlug, clanId, onChoosePerson }: {
  model: ClanStatsPageModel; gameSlug: string; clanId: string; onChoosePerson: (userId: string) => void;
}) {
  const visible = {
    rate: model.permissions.isStaff || model.hof.config.winRateVisibleTop > 0,
    attendance: model.permissions.isStaff || model.hof.config.participationVisibleTop > 0,
    appearances: model.permissions.isStaff || model.hof.config.cumulativeVisibleTop > 0,
    streak: model.permissions.isStaff || model.hof.config.streakVisibleTop > 0,
    prediction: model.permissions.isStaff || model.hof.config.predictionVisibleTop > 0,
  };
  const now = currentKstYearMonth();
  const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  const months = [...new Set([currentMonth, ...Object.keys(model.hof.historyMonths)])].sort().reverse();
  const years = [...new Set([String(now.year), ...Object.keys(model.hof.historyYears)])].sort().reverse();
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(now.year));
  const [category, setCategory] = useState<Category>(CATEGORIES.find((item) => visible[item.id])?.id ?? "rate");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const block = period === "all" ? model.hof.periods.all
    : period === "month" ? (month === currentMonth ? model.hof.periods.month : model.hof.historyMonths[month])
      : year === String(now.year) ? model.hof.periods.year : model.hof.historyYears[year];
  const { totals } = block;
  const rows = category === "rate"
    ? block.winRate.map((row) => ({ ...row, value: `${row.ratePct ?? 0}%`, detail: `${row.wins}승 ${row.draws}무 ${row.losses}패 · ${row.wins + row.draws + row.losses}경기`, numerator: row.wins, denominator: row.wins + row.draws + row.losses }))
    : category === "attendance"
      ? block.participation.map((row) => ({ ...row, value: `${row.played}일`, detail: `전체 개최 ${totals.days}일 중 ${row.played}일 출석 · 내전 ${totals.sessions}회`, numerator: row.played, denominator: totals.days }))
      : category === "appearances"
        ? block.cumulative.map((row) => ({ ...row, value: `${row.played}경기`, detail: `전체 ${totals.matches}경기 중 ${row.played}경기 출전 · 내전 ${totals.sessions}회`, numerator: row.played, denominator: totals.matches }))
        : category === "prediction"
          ? block.predictionCorrect.map((row) => ({ ...row, value: `${row.ratePct ?? 0}%`, detail: `${row.valid}회 예측 중 ${row.correct}회 적중 · 적중 횟수순`, numerator: row.correct, denominator: row.valid }))
          : block.streaks.map((row) => ({ ...row, value: `${row.longest}연승`, detail: "선택 기간 최장 연승", numerator: row.longest, denominator: totals.matches }));
  const leaders = [
    { id: "rate" as const, row: block.winRate[0], value: block.winRate[0] ? `${block.winRate[0].ratePct}%` : "—" },
    { id: "attendance" as const, row: block.participation[0], value: block.participation[0] ? `${block.participation[0].played}일` : "—" },
    { id: "appearances" as const, row: block.cumulative[0], value: block.cumulative[0] ? `${block.cumulative[0].played}경기` : "—" },
    { id: "prediction" as const, row: block.predictionCorrect[0], value: block.predictionCorrect[0] ? `${block.predictionCorrect[0].correct}회` : "—" },
  ];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-bold">명예의 전당</h3><p className="text-xs text-muted-foreground">공개된 기록과 등재 기준에 따른 순위입니다.</p></div>
      {model.permissions.setHofRules && <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}><Settings2 className="size-4" aria-hidden="true" /> 설정</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>명예의 전당 설정</DialogTitle><DialogDescription>순위 공개 범위와 등재 기준을 정합니다.</DialogDescription></DialogHeader><HofSettingsForm gameSlug={gameSlug} clanId={clanId} cfg={model.hof.config} exposeHof={model.hof.exposeHof} isLeader={model.permissions.isLeader} onDone={() => setSettingsOpen(false)} /></DialogContent>
      </Dialog>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="명예의 전당 기간" className="flex gap-1">
        {([{ id: "all", label: "전체" }, { id: "month", label: "월별" }, { id: "year", label: "연도별" }] as const).map((item) => <Button key={item.id} type="button" size="sm" aria-pressed={period === item.id} variant={period === item.id ? "secondary" : "ghost"} onClick={() => setPeriod(item.id)}>{item.label}</Button>)}
      </div>
      {period === "month" && <select aria-label="명예의 전당 월" value={month} onChange={(event) => setMonth(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">{months.map((key) => <option key={key} value={key}>{key.slice(0, 4)}년 {Number(key.slice(5))}월</option>)}</select>}
      {period === "year" && <select aria-label="명예의 전당 연도" value={year} onChange={(event) => setYear(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm">{years.map((key) => <option key={key} value={key}>{key}년</option>)}</select>}
    </div>
    {block.undisclosed ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{block.undisclosedHint}</p> : <>
      <p className="text-xs text-muted-foreground">선택 기간 정규 내전 <strong className="text-foreground">{totals.sessions}회</strong> · 개최 {totals.days}일 · 전체 {totals.matches}경기</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="명예의 전당 대표 기록">
        {leaders.filter((leader) => visible[leader.id]).map(({ id, row, value }) => {
          const { Icon, label } = CATEGORIES.find((item) => item.id === id)!;
          return <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} className={`min-w-0 rounded-xl border p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${category === id ? "border-primary/50 bg-primary/5" : "bg-card"}`}>
            <span className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />{label}</span>
            <span className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs font-medium" title={row?.nickname}>{row?.nickname ?? "기록 없음"}</span><strong className="shrink-0 text-sm tabular-nums">{value}</strong></span>
          </button>;
        })}
      </div>
      <Card size="sm"><CardHeader><CardTitle>순위</CardTitle><CardDescription>부문을 선택하면 해당 순위를 확인할 수 있습니다.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1" role="group" aria-label="명예의 전당 부문">{CATEGORIES.filter((item) => visible[item.id]).map(({ id, label }) => <Button key={id} type="button" size="sm" aria-pressed={category === id} variant={category === id ? "secondary" : "ghost"} onClick={() => setCategory(id)}>{label}</Button>)}</div>
        {category === "attendance" && <p className="text-xs text-muted-foreground">한 경기 이상 출전한 날을 출석으로 셉니다. 같은 날 여러 내전에 참여해도 1일입니다.</p>}
        {category === "prediction" && <p className="text-xs text-muted-foreground">순위는 적중 횟수순이며 게이지는 적중률입니다. 무승부·무효 예측은 제외합니다.</p>}
        {!rows.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">등재 기준을 충족한 기록이 없습니다.</p> : <ol className="space-y-2">{rows.map((row, index) => {
          const canOpen = model.personal.people.some((person) => person.userId === row.userId);
          const content = <>
            {category !== "streak" && <StatsGauge value={row.numerator} total={row.denominator} label={`${row.nickname}: ${row.detail}, ${row.value}`} />}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">{index + 1}</span>
            <span className="min-w-0 flex-1 space-y-1"><span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{row.nickname}</span><strong className="shrink-0 text-sm tabular-nums">{row.value}</strong></span>
              <span className="block text-[11px] text-muted-foreground">{row.detail}</span>
            </span>
          </>;
          const className = "relative isolate flex w-full items-center gap-3 overflow-hidden rounded-xl border p-3 text-left";
          return <li key={row.userId}>{canOpen ? <button type="button" onClick={() => onChoosePerson(row.userId)} className={`${className} hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary`}>{content}</button> : <div className={className}>{content}</div>}</li>;
        })}</ol>}
      </CardContent></Card>
    </>}
  </div>;
}
