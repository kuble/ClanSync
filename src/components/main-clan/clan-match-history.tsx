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
  const key = statsPeriodKey(period), term = search.trim().toLocaleLowerCase("ko");
  const years = [...new Set([String(now.year), ...model.archive.datesKst.map((date) => date.slice(0, 4))])].sort().reverse();
  const maps = [...new Set(Object.values(model.archive.sampleByDate).flatMap((rows) => rows.flatMap((row) => row.mapLabel ? [row.mapLabel] : [])))].sort((a, b) => a.localeCompare(b, "ko"));
  const sampleByDate = Object.fromEntries(Object.entries(model.archive.sampleByDate).filter(([date]) => key === "all" || date.startsWith(key)).map(([date, rows]) => [date, rows.filter((row) => (map === "all" || row.mapLabel === map) && (!term || row.players.some((player) => player.nickname.toLocaleLowerCase("ko").includes(term))))]));
  const archive = { datesKst: model.archive.datesKst.filter((date) => sampleByDate[date]?.length), sampleByDate };
  return <div className="space-y-5">
    <StatsPeriodFilter value={period} onChange={setPeriod} years={years} withDay />
    <Card size="sm"><CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><CardTitle><StatTitle title="경기 기록" help="날짜별 팀 구성과 경기 결과를 확인합니다. 기간·맵·참가자 조건을 함께 사용할 수 있습니다." /></CardTitle><div className="flex flex-wrap items-end gap-2">
      <label className="space-y-2 text-[11px] text-muted-foreground"><span className="block">맵</span><select aria-label="기록 맵" value={map} onChange={(event) => setMap(event.target.value)} className="h-9 max-w-40 rounded-lg border bg-background px-2 text-xs text-foreground"><option value="all">전체 맵</option>{maps.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="space-y-2 text-[11px] text-muted-foreground"><span className="block">참가자</span><input aria-label="경기 참가자 검색" type="search" placeholder="참가자 이름 검색" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground sm:w-48" /></label>
    </div></CardHeader><CardContent><ClanStatsArchive key={`${key}:${map}:${term}`} archive={archive} /></CardContent></Card>
  </div>;
}
