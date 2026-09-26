"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { statsPeriodKey, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { StatsPeriodFilter } from "./stats-period-filter";
import { ClanStatsArchive } from "./clan-stats-archive";
import { StatTitle } from "./stat-help";

export function ClanMatchHistory({ model }: { model: ClanStatsPageModel }) {
  const now = currentKstYearMonth();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const [search, setSearch] = useState("");
  const [map, setMap] = useState("all");
  const key = statsPeriodKey(period);
  const years = [...new Set([String(now.year), ...model.archive.datesKst.map((date) => date.slice(0, 4))])].sort().reverse();
  const maps = [...new Set(Object.values(model.archive.sampleByDate).flatMap((rows) => rows.flatMap((row) => row.mapLabel ? [row.mapLabel] : [])))].sort((a, b) => a.localeCompare(b, "ko"));
  const sampleByDate = Object.fromEntries(Object.entries(model.archive.sampleByDate).filter(([date]) => key === "all" || date.startsWith(key)));
  const archive = { datesKst: model.archive.datesKst.filter((date) => sampleByDate[date]?.length), sampleByDate };
  return <div className="space-y-5">
    <StatsPeriodFilter value={period} onChange={setPeriod} years={years} />
    <Card size="sm"><CardHeader><CardTitle><StatTitle title="경기 기록" help="날짜를 누르면 달력이 열립니다. 맵·참가자는 경기 목록을 좁히며, 오른쪽 표는 선택한 날 전체 내전 결과를 집계합니다." /></CardTitle></CardHeader><CardContent><ClanStatsArchive key={key} archive={archive} periodKey={key} mapFilter={map} participantSearch={search} filters={<div className="flex max-w-full flex-wrap items-end gap-2 sm:ml-auto">
      <label className="space-y-2 text-[11px] text-muted-foreground"><span className="block">맵</span><select aria-label="기록 맵" value={map} onChange={(event) => setMap(event.target.value)} className="h-9 max-w-40 rounded-lg border bg-background px-2 text-xs text-foreground"><option value="all">전체 맵</option>{maps.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="space-y-2 text-[11px] text-muted-foreground"><span className="block">참가자</span><input aria-label="경기 참가자 검색" type="search" placeholder="참가자 이름 검색" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground sm:w-48" /></label>
    </div>} /></CardContent></Card>
  </div>;
}
