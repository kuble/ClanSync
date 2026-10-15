"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle } from "./stat-help";
import type { IntraStats } from "@/lib/clan/stats/clan-stats-analytics";
import { StatsGauge } from "./clan-stats-charts";

export function ClanFormationStats({ summaries }: { summaries: IntraStats["scoreGapSummary"] }) {
  const [score, setScore] = useState<"evaluation" | "analysis">("evaluation");
  const summary = summaries[score];
  return <Card className="gap-0 py-0" role="region" aria-label="편성 점수 차이">
    <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <h3 aria-label="편성 점수 차이" className="text-sm font-semibold"><StatTitle title="편성 점수 차이" help="편성 당시 두 팀 점수 합계의 차이입니다. 경기 전 점수가 저장된 기록만 집계하며, 실제 경기의 접전 정도를 뜻하지 않습니다." /></h3>
      <RubberSegment label="편성 통계 점수 종류" labelPosition="hidden" options={[{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }]} value={score} onChange={setScore} />
    </CardHeader>
    <CardContent className="grid gap-6 px-5 py-5 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,3fr)]">
      <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
        <div><p className="text-xs text-muted-foreground">평균 차이</p><p className="mt-2 text-3xl font-semibold tabular-nums">{summary.average ?? "—"}<span className="ml-1 text-sm font-normal text-muted-foreground">점</span></p></div>
        <div><p className="text-xs text-muted-foreground">집계 경기</p><p className="mt-2 text-lg font-semibold tabular-nums">{summary.count.toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">경기</span></p></div>
      </div>
      <div className="space-y-4">
        {["1점 미만", "1~2점", "2~4점", "4점 이상"].map((label, index) => <div key={label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className="tabular-nums"><strong className="font-medium">{summary.ranges[index].toLocaleString()}경기</strong><span className="ml-3 inline-block w-12 text-right text-muted-foreground">{(summary.count ? summary.ranges[index] / summary.count * 100 : 0).toFixed(1)}%</span></span></div>
          <div className="relative isolate h-2 overflow-hidden rounded-full bg-muted/60"><StatsGauge value={summary.ranges[index]} total={summary.count} label={`${label}: ${summary.ranges[index]} / ${summary.count}경기`} /></div>
        </div>)}
        <p className="min-h-4 text-xs text-muted-foreground">{summary.average === null ? "경기 전 점수가 저장된 기록이 없습니다." : null}</p>
      </div>
    </CardContent>
  </Card>;
}
