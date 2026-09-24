"use client";

import { useState } from "react";
import { Trophy, CalendarCheck, Swords, Flame, Crosshair } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptionWheel } from "@/components/ui/option-wheel";
import { StatTitle, StatTooltip } from "./stat-help";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";

export function StatsEmblems({ hof, userId }: { hof: ClanStatsPageModel["hof"]; userId: string }) {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const periods = period === "month" ? hof.historyMonths : hof.historyYears;
  const emblems = Object.entries(periods).sort(([a], [b]) => b.localeCompare(a)).flatMap(([key, block]) => {
    if (block.undisclosed) return [];
    return ([ ["승률", block.winRate], ["최다 출석", block.participation], ["최다 출전", block.cumulative], ["최장 연승", block.streaks], ["예측 적중", block.predictionCorrect] ] as const).flatMap(([category, rows]) => {
      const rank = rows.findIndex((row) => row.userId === userId) + 1;
      return rank > 0 && rank <= 3 ? [{ key: `${key}-${category}`, date: key, category, rank }] : [];
    });
  });
  return <Card size="sm"><CardHeader><CardTitle><StatTitle title="엠블럼 컬렉션" help="마감된 월간·연간 순위의 1~3위에게 표시합니다. 트로피·달력·교차 검·불꽃·과녁은 부문을, 금·은·동은 순위를 나타냅니다. 이중 테두리는 연간 기록입니다. 공개된 부문만 표시하며 기록 정정 시 재집계됩니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
    <OptionWheel label="수상 기간" options={[{ id: "month", label: "월간" }, { id: "year", label: "연간" }]} value={period} onChange={setPeriod} />
    {emblems.length ? <div className="flex flex-wrap gap-3" aria-label="수상 엠블럼">{emblems.map((emblem) => {
      const design = {
        "승률": { Icon: Trophy, shape: "M32 3 56 13 52 43 32 61 12 43 8 13Z" },
        "최다 출석": { Icon: CalendarCheck, shape: "M16 5H48L59 16V48L48 59H16L5 48V16Z" },
        "최다 출전": { Icon: Swords, shape: "M32 2 61 32 32 62 3 32Z" },
        "최장 연승": { Icon: Flame, shape: "M32 2 41 14 56 9 53 26 63 36 48 44 45 59 32 53 19 59 16 44 1 36 11 26 8 9 23 14Z" },
        "예측 적중": { Icon: Crosshair, shape: "M32 3A29 29 0 1 1 31.99 3Z" },
      }[emblem.category];
      const { Icon } = design;
      return <StatTooltip key={emblem.key} label={emblem.date + " " + emblem.category + " " + emblem.rank + "위 엠블럼"}
        description={emblem.date + " " + (period === "month" ? "월간" : "연간") + " · " + emblem.category + " " + emblem.rank + "위 · " + (emblem.rank === 1 ? "금" : emblem.rank === 2 ? "은" : "동") + " 엠블럼"}
        className={"relative flex size-20 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:hover:-translate-y-1 " + (emblem.rank === 1 ? "text-amber-400" : emblem.rank === 2 ? "text-slate-300" : "text-orange-400")}>
        <svg viewBox="0 0 64 64" className="absolute inset-1 size-[72px]" aria-hidden><path d={design.shape} fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.5" />{period === "year" && <path d={design.shape} transform="translate(6.4 6.4) scale(.8)" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />}</svg>
        <Icon className="relative -mt-2 size-7" strokeWidth={1.7} aria-hidden />
        <span aria-hidden className="absolute bottom-2 rounded-full border border-current/30 bg-card px-1.5 text-[10px] font-black leading-4">{emblem.rank}</span>
      </StatTooltip>;
    })}</div> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">마감된 {period === "month" ? "월간" : "연간"} 기록의 상위 3위 엠블럼이 없습니다.</p>}
  </CardContent></Card>;
}
