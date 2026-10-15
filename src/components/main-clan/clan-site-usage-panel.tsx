"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle, StatTooltip } from "./stat-help";
import { isoToKstYmd } from "@/lib/clan/stats/kst";
import { summarizeVisits, type ClanSiteVisit } from "@/lib/clan/stats/clan-site-usage";

function shift(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function VisitDetails({ label, visitors, memberNames }: { label: string; visitors: string[]; memberNames: Record<string, string> }) {
  return <div className="min-w-36 space-y-2 py-1"><p className="font-semibold tabular-nums">{label}</p><p className="text-[11px]">방문 {visitors.length}명</p>{visitors.length ? <ul className="board-scroll max-h-[min(18rem,calc(100dvh-8rem))] space-y-1 overflow-y-auto border-t border-current/15 pt-2">{visitors.map((id) => <li key={id} className="break-all">{memberNames[id] ?? "탈퇴한 멤버"}</li>)}</ul> : <p>방문 기록 없음</p>}</div>;
}

export function ClanSiteUsagePanel({ visits, memberNames }: { visits: ClanSiteVisit[]; memberNames: Record<string, string> }) {
  const [span, setSpan] = useState<7 | 30>(30);
  const [display, setDisplay] = useState<"chart" | "table">("chart");
  const today = isoToKstYmd(new Date().toISOString());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const start = shift(today, 1 - span);
  const previousEnd = shift(start, -1);
  const previousStart = shift(previousEnd, 1 - span);
  const current = summarizeVisits(visits, start, today);
  const previous = summarizeVisits(visits, previousStart, previousEnd);
  const days = Array.from({ length: span }, (_, index) => shift(start, index));
  const dayCounts = days.map((date) => {
    const visitors = [...new Set(visits.filter((visit) => visit.date === date).map((visit) => visit.userId))];
    return { date, count: visitors.length, visitors };
  });
  const max = Math.max(1, ...dayCounts.map((day) => day.count));
  const diff = current.visitors - previous.visitors;
  const hasPrevious = visits.some((visit) => visit.date >= previousStart && visit.date <= previousEnd);
  const years = [...new Set([Number(today.slice(0, 4)), ...visits.map((visit) => Number(visit.date.slice(0, 4)))] )].sort((a, b) => b - a);
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    const rows = visits.filter((visit) => visit.date.startsWith(key));
    const visitorIds = [...new Set(rows.map((visit) => visit.userId))];
    return { key, visitors: visitorIds.length, visitorIds, personDays: rows.length };
  });
  const monthMax = Math.max(1, ...monthly.map((month) => month.visitors));
  const annual = summarizeVisits(visits, `${year}-01-01`, `${year}-12-31`);
  return <Card className="gap-0 py-0" role="region" aria-label="사이트 이용 통계">
    <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <h3 aria-label="사이트 이용 통계" className="text-sm font-semibold"><StatTitle title="사이트 이용 통계" help="클랜 페이지를 방문한 멤버를 한국 시간 기준으로 하루 한 번 집계합니다. 내전 출전 기록과는 별도입니다." /></h3>
      <RubberSegment label="사이트 이용 통계 기간" labelPosition="hidden" options={[{ id: "7", label: "최근 7일" }, { id: "30", label: "최근 30일" }]} value={span === 7 ? "7" : "30"} onChange={(value) => setSpan(value === "7" ? 7 : 30)} />
    </CardHeader>
    <CardContent className="space-y-5 px-5 py-5">
      <p className="text-xs tabular-nums text-muted-foreground">{start.replaceAll("-", ".")} ~ {today.replaceAll("-", ".")}</p>
      <div className="grid grid-cols-2 divide-x border-b pb-5">
        <div className="pr-5">
          <div className="text-xs text-muted-foreground"><StatTitle title="방문한 멤버" help={`선택 기간에 방문한 고유 멤버 수입니다. 비교 기간은 ${previousStart} ~ ${previousEnd}입니다.`} /></div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{current.visitors.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted-foreground">명</span></p>
          <p className="mt-2 text-xs text-muted-foreground">{hasPrevious ? <>이전 기간 <span className="font-medium tabular-nums text-foreground">{diff >= 0 ? "+" : ""}{diff.toLocaleString()}명</span></> : "비교 기록 없음"}</p>
        </div>
        <div className="pl-5">
          <div className="text-xs text-muted-foreground"><StatTitle title="방문 활동일 합계" help="한 멤버가 하루 방문하면 1활동일입니다. 같은 날 여러 번 방문해도 한 번만 세며, 모든 멤버의 활동일을 더합니다." /></div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{current.personDays.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted-foreground">일</span></p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold"><StatTitle title="날짜별 방문자" help="막대에 마우스를 올리면 날짜와 방문 멤버를 볼 수 있습니다. 키보드 초점과 터치로도 확인할 수 있습니다." /></h4>
          <RubberSegment label="사이트 이용 통계 표시" labelPosition="hidden" options={[{ id: "chart", label: "그래프" }, { id: "table", label: "표" }]} value={display} onChange={setDisplay} />
        </div>
        <div className="h-48 min-w-0">
          {display === "chart" ? <>
            <div className="flex h-40 items-end gap-1 border-b" aria-label="일별 방문자 그래프">{dayCounts.map((day) => <StatTooltip key={day.date} label={`${day.date} 방문 ${day.count}명`} hoverable
              render={<button type="button" aria-label={`${day.date} 방문 ${day.count}명`} style={{ height: `${Math.max(4, day.count / max * 100)}%` }} />}
              className="min-w-0 flex-1 rounded-t-sm bg-primary/55 transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-primary"
              description={<VisitDetails label={day.date} visitors={day.visitors} memberNames={memberNames} />}>{null}</StatTooltip>)}</div>
            <div className="mt-3 flex justify-between text-[10px] tabular-nums text-muted-foreground"><span>{start.slice(5).replace("-", ".")}</span><span>{days[Math.floor((span - 1) / 2)].slice(5).replace("-", ".")}</span><span>{today.slice(5).replace("-", ".")}</span></div>
          </> : <div className="board-scroll h-full overflow-auto rounded-lg border"><table className="w-full text-xs" aria-label="날짜별 방문자 표"><thead className="sticky top-0 bg-card"><tr className="border-b text-muted-foreground"><th className="p-3 text-left font-normal">날짜</th><th className="p-3 text-right font-normal">방문자</th></tr></thead><tbody className="divide-y">{dayCounts.map((day) => <tr key={day.date}><td className="px-3 py-2 tabular-nums">{day.date}</td><td className="px-3 py-2 text-right tabular-nums">{day.count.toLocaleString()}명</td></tr>)}</tbody></table></div>}
        </div>
      </div>
      <div className="space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h4 className="text-sm font-semibold"><StatTitle title="월·연도별 비교" help="월별·연간 고유 방문 멤버 수와 활동일 합계입니다. 연간 방문자는 월별 방문자를 더하지 않고 중복을 제외합니다." /></h4><p className="mt-2 text-xs tabular-nums text-muted-foreground">방문 {annual.visitors.toLocaleString()}명 · 활동일 {annual.personDays.toLocaleString()}일</p></div>
          <select aria-label="사이트 이용 통계 연도" value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring">{years.map((item) => <option key={item} value={item}>{item}년</option>)}</select>
        </div>
        <div className="h-44 min-w-0">
          {display === "chart" ? <div className="flex h-full items-end gap-1.5" role="group" aria-label="월별 방문자 그래프">{monthly.map((month) => <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-[10px] tabular-nums">{month.visitors.toLocaleString()}</span>
            <StatTooltip label={`${year}년 ${Number(month.key.slice(5))}월 방문 ${month.visitors}명`} hoverable
              render={<button type="button" aria-label={`${year}년 ${Number(month.key.slice(5))}월 방문 ${month.visitors}명`} style={{ height: `${Math.max(4, month.visitors / monthMax * 126)}px` }} />}
              className="w-full rounded-t-sm bg-primary/55 transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-primary"
              description={<VisitDetails label={`${year}년 ${Number(month.key.slice(5))}월`} visitors={month.visitorIds} memberNames={memberNames} />}>{null}</StatTooltip>
            <span className="text-[10px] tabular-nums text-muted-foreground">{Number(month.key.slice(5))}월</span></div>)}</div> : <div className="board-scroll h-full overflow-auto rounded-lg border"><table className="w-full text-xs" aria-label="월별 방문자 표"><thead className="sticky top-0 bg-card"><tr className="border-b text-muted-foreground"><th className="p-3 text-left font-normal">월</th><th className="p-3 text-right font-normal">방문 멤버</th><th className="p-3 text-right font-normal">활동일</th></tr></thead><tbody className="divide-y">{monthly.map((month) => <tr key={month.key}><td className="px-3 py-2 tabular-nums">{month.key}</td><td className="px-3 py-2 text-right tabular-nums">{month.visitors.toLocaleString()}명</td><td className="px-3 py-2 text-right tabular-nums">{month.personDays.toLocaleString()}일</td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </CardContent>
  </Card>;
}
