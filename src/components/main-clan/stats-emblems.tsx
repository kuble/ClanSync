"use client";

import { useId, useState } from "react";
import { Crown, Medal, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OptionWheel } from "@/components/ui/option-wheel";
import { StatTitle } from "./stat-help";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";

export function StatsEmblems({ hof, userId }: { hof: ClanStatsPageModel["hof"]; userId: string }) {
  const descriptionId = useId();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [opened, setOpened] = useState<string | null>(null);
  const periods = period === "month" ? hof.historyMonths : hof.historyYears;
  const emblems = Object.entries(periods).sort(([a], [b]) => b.localeCompare(a)).flatMap(([key, block]) => {
    if (block.undisclosed) return [];
    return ([ ["승률", block.winRate], ["최다 출석", block.participation], ["최다 출전", block.cumulative], ["최장 연승", block.streaks], ["예측 적중", block.predictionCorrect] ] as const).flatMap(([category, rows]) => {
      const rank = rows.findIndex((row) => row.userId === userId) + 1;
      return rank > 0 && rank <= 3 ? [{ key: `${key}-${category}`, date: key, category, rank }] : [];
    });
  });
  return <Card size="sm"><CardHeader><CardTitle><StatTitle title="엠블럼 컬렉션" help="마감된 월간·연간 순위의 1~3위에게 표시합니다. 금·은·동은 순위, 방패 테두리는 연간 기록입니다. 공개된 부문만 표시하며 기록 정정 시 재집계됩니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
    <OptionWheel label="수상 기간" options={[{ id: "month", label: "월간" }, { id: "year", label: "연간" }]} value={period} onChange={setPeriod} />
    {emblems.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="수상 엠블럼">{emblems.map((emblem) => <Tooltip key={emblem.key} open={opened === emblem.key} onOpenChange={(open) => setOpened(open ? emblem.key : null)}><TooltipTrigger render={<button type="button" aria-label={`${emblem.date} ${emblem.category} ${emblem.rank}위 엠블럼`} aria-describedby={opened === emblem.key ? `${descriptionId}-${emblem.key}` : undefined} onFocus={() => setOpened(emblem.key)} onClick={() => setOpened(emblem.key)} className={`group flex flex-col items-center rounded-xl border bg-gradient-to-b p-3 focus-visible:outline-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${emblem.rank === 1 ? "border-amber-400/35 from-amber-400/15 to-transparent text-amber-400" : emblem.rank === 2 ? "border-slate-300/35 from-slate-300/15 to-transparent text-slate-300" : "border-orange-600/35 from-orange-600/15 to-transparent text-orange-400"}`} />}>
      <span className="relative flex size-14 items-center justify-center">{period === "year" ? <Shield className="absolute size-14" strokeWidth={1} /> : <Medal className="absolute size-14" strokeWidth={1} />}<span className={`relative font-black ${period === "month" ? "mt-5 text-sm" : "-mt-1 text-lg"}`}>{emblem.rank}</span>{emblem.rank === 1 && <Crown className="absolute -top-2 size-4" />}</span><span className="mt-1 text-[10px] font-medium tabular-nums">{emblem.date}</span><span className="text-[10px] text-foreground">{emblem.category}</span>
    </TooltipTrigger><TooltipContent id={`${descriptionId}-${emblem.key}`} role="tooltip">{emblem.date} {period === "month" ? "월간" : "연간"} · {emblem.category} {emblem.rank}위 · {emblem.rank === 1 ? "금" : emblem.rank === 2 ? "은" : "동"} 엠블럼</TooltipContent></Tooltip>)}</div> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">마감된 {period === "month" ? "월간" : "연간"} 기록의 상위 3위 엠블럼이 없습니다.</p>}
  </CardContent></Card>;
}
