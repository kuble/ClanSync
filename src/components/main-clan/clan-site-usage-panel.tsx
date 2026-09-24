"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isoToKstYmd } from "@/lib/clan/stats/kst";
import { summarizeVisits, type ClanSiteVisit } from "@/lib/clan/stats/clan-site-usage";

function shift(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function ClanSiteUsagePanel({ visits }: { visits: ClanSiteVisit[] }) {
  const [span, setSpan] = useState<7 | 30>(30);
  const [display, setDisplay] = useState<"chart" | "table">("chart");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = isoToKstYmd(new Date().toISOString());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const start = shift(today, 1 - span);
  const previousEnd = shift(start, -1);
  const previousStart = shift(previousEnd, 1 - span);
  const current = summarizeVisits(visits, start, today);
  const previous = summarizeVisits(visits, previousStart, previousEnd);
  const days = Array.from({ length: span }, (_, index) => shift(start, index));
  const dayCounts = days.map((date) => ({ date, count: summarizeVisits(visits, date, date).visitors }));
  const max = Math.max(1, ...dayCounts.map((day) => day.count));
  const diff = current.visitors - previous.visitors;
  const hasPrevious = visits.some((visit) => visit.date >= previousStart && visit.date <= previousEnd);
  const selected = dayCounts.find((day) => day.date === selectedDate);
  const years = [...new Set([Number(today.slice(0, 4)), ...visits.map((visit) => Number(visit.date.slice(0, 4)))] )].sort((a, b) => b - a);
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    const rows = visits.filter((visit) => visit.date.startsWith(key));
    return { key, visitors: new Set(rows.map((visit) => visit.userId)).size, personDays: rows.length };
  });
  const monthMax = Math.max(1, ...monthly.map((month) => month.visitors));
  const annual = summarizeVisits(visits, `${year}-01-01`, `${year}-12-31`);
  return <Card size="sm">
    <CardHeader><CardTitle>사이트 이용 통계</CardTitle><CardDescription>클랜 방문 기록 · 내전 출전과 별도로 집계</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2"><Button type="button" size="sm" variant={span === 7 ? "secondary" : "outline"} aria-pressed={span === 7} onClick={() => { setSpan(7); setSelectedDate(null); }}>최근 7일</Button><Button type="button" size="sm" variant={span === 30 ? "secondary" : "outline"} aria-pressed={span === 30} onClick={() => { setSpan(30); setSelectedDate(null); }}>최근 30일</Button></div>
        <span className="text-xs text-muted-foreground">{start} ~ {today}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><span className="text-xs text-muted-foreground">방문한 멤버</span><strong className="mt-1 block text-3xl tabular-nums">{current.visitors}명</strong><span className="text-xs text-muted-foreground">{hasPrevious ? `이전 ${span}일 대비 ${diff >= 0 ? "+" : ""}${diff}명 · ${previousStart} ~ ${previousEnd}` : "비교 기록 없음"}</span></div><div className="rounded-xl border p-4"><span className="text-xs text-muted-foreground">방문 활동일 합계</span><strong className="mt-1 block text-3xl tabular-nums">{current.personDays}일</strong><span className="text-xs text-muted-foreground">한 멤버가 하루 방문하면 1활동일</span></div></div>
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">날짜별 방문자</h4><div className="flex gap-1"><Button type="button" size="sm" variant={display === "chart" ? "secondary" : "ghost"} onClick={() => setDisplay("chart")}>그래프</Button><Button type="button" size="sm" variant={display === "table" ? "secondary" : "ghost"} onClick={() => setDisplay("table")}>표</Button></div></div>
      {display === "chart" ? <div className="flex h-28 items-end gap-0.5" aria-label="일별 방문자 그래프">{dayCounts.map((day) => <button key={day.date} type="button" title={`${day.date}: ${day.count}명`} aria-label={`${day.date} 방문 ${day.count}명`} aria-pressed={selectedDate === day.date} onClick={() => setSelectedDate(day.date)} className={`min-w-0 flex-1 rounded-t transition-colors focus-visible:outline-2 focus-visible:outline-primary ${selectedDate === day.date ? "bg-primary" : "bg-primary/55 hover:bg-primary/80"}`} style={{ height: `${Math.max(4, day.count / max * 100)}%` }} />)}</div> : <div className="max-h-44 overflow-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="border-b"><th className="p-2 text-left">날짜</th><th className="p-2 text-right">방문자</th></tr></thead><tbody>{dayCounts.map((day) => <tr key={day.date} className="border-b"><td className="p-2">{day.date}</td><td className="p-2 text-right">{day.count}명</td></tr>)}</tbody></table></div>}
      {selected && <p className="text-xs text-muted-foreground">{selected.date} 방문: {selected.count}명</p>}
      <div className="border-t pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold">월·연도별 비교</h4><p className="text-xs text-muted-foreground">{year}년 방문 {annual.visitors}명 · 활동일 {annual.personDays}일</p></div><select aria-label="사이트 이용 통계 연도" value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-lg border bg-background px-3 py-2 text-sm">{years.map((item) => <option key={item} value={item}>{item}년</option>)}</select></div>
        {display === "chart" ? <div className="flex h-32 items-end gap-2" role="img" aria-label={monthly.map((month) => `${month.key} 방문 ${month.visitors}명`).join(", ")}>{monthly.map((month) => <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-1"><span className="text-[10px] tabular-nums">{month.visitors}</span><span className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, month.visitors / monthMax * 82)}px` }} /><span className="text-[10px] text-muted-foreground">{month.key.slice(5)}월</span></div>)}</div> : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[440px] text-xs"><thead><tr className="border-b"><th className="p-2 text-left">월</th><th className="p-2 text-right">방문한 멤버</th><th className="p-2 text-right">활동일 합계</th></tr></thead><tbody>{monthly.map((month) => <tr key={month.key} className="border-b"><td className="p-2">{month.key}</td><td className="p-2 text-right">{month.visitors}명</td><td className="p-2 text-right">{month.personDays}일</td></tr>)}</tbody></table></div>}
        <p className="mt-2 text-xs text-muted-foreground">연간 방문자는 월별 방문자를 더하지 않고 연간 고유 멤버로 셉니다.</p>
      </div>
    </CardContent>
  </Card>;
}
