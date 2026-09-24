"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptionWheel } from "@/components/ui/option-wheel";
import { StatTitle } from "./stat-help";
import type { IntraStats } from "@/lib/clan/stats/clan-stats-analytics";
import { StatsGauge } from "./clan-stats-charts";

export function ClanFormationStats({ summaries }: { summaries: IntraStats["scoreGapSummary"] }) {
  const [score, setScore] = useState<"evaluation" | "analysis">("evaluation");
  const summary = summaries[score];
  return <Card size="sm">
    <CardHeader><CardTitle><StatTitle title="편성 점수 차이" help="운영진용 내전 통계입니다. 편성 당시 두 팀 점수 합계를 비교하며 실제 경기의 접전 정도를 뜻하지 않습니다." /></CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between gap-3"><OptionWheel label="편성 통계 점수 종류" options={[{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }]} value={score} onChange={setScore} /><span className="text-xs text-muted-foreground">{summary.count}경기</span></div>
      {summary.average === null ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">경기 전 점수가 저장된 기록이 없습니다.</p> : <>
        <p className="text-sm text-muted-foreground">평균 차이 <strong className="ml-2 text-xl tabular-nums text-foreground">{summary.average}점</strong></p>
        <div className="space-y-3">{["1점 미만", "1~2점", "2~4점", "4점 이상"].map((label, index) => <div key={label} className="relative isolate overflow-hidden rounded-lg border p-3"><div className="flex justify-between text-xs"><span>{label}</span><strong className="tabular-nums">{summary.ranges[index]} / {summary.count}경기</strong></div><StatsGauge value={summary.ranges[index]} total={summary.count} label={`${label}: ${summary.ranges[index]} / ${summary.count}경기`} /></div>)}</div>
      </>}

    </CardContent>
  </Card>;
}
