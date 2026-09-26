"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RubberSegment } from "@/components/ui/rubber-segment";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { EMPTY_INTRA_OVERVIEW, intraTrendPoints, statsPeriodKey, statsPeriodLabel, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { mapDetailsForLabel } from "@/lib/balance/map-pools";
import { OW_HERO_PORTRAITS } from "@/lib/balance/ow-hero-portraits";
import { StatsPeriodFilter } from "./stats-period-filter";
import { StatsTrend } from "./clan-stats-charts";
import { StatsDonut } from "./stats-donut";
import { StatTitle } from "./stat-help";

const METRICS = [{ id: "sessions", label: "개최 내전", unit: "회" }, { id: "completed", label: "완료 경기", unit: "경기" }, { id: "participants", label: "출전 멤버", unit: "명" }] as const;
const MAP_TYPES = [{ id: "all", label: "전체" }, { id: "hybrid", label: "혼합" }, { id: "control", label: "쟁탈" }, { id: "escort", label: "화물" }, { id: "push", label: "밀기" }] as const;
// Temporary artwork preview: false restores the original three donut presentations.
const DONUT_IMAGE_PREVIEW = true;

export function IntraClanStats({ model }: { model: ClanStatsPageModel }) {
  const now = currentKstYearMonth();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const [metric, setMetric] = useState<(typeof METRICS)[number]["id"]>("sessions");
  const [mapType, setMapType] = useState("all");
  const [banRole, setBanRole] = useState("all");
  const years = [...new Set([String(now.year), ...Object.keys(model.intraPeriods).filter((key) => /^\d{4}$/.test(key))])].sort().reverse();
  const stats = model.intraPeriods[statsPeriodKey(period)] ?? EMPTY_INTRA_OVERVIEW;
  const activeMetric = METRICS.find((item) => item.id === metric)!;
  const maps = stats.maps.filter((row) => mapType === "all" || mapDetailsForLabel(row.name)?.type === mapType).map((row) => ({ ...row, image: mapDetailsForLabel(row.name)?.image }));
  const bans = stats.bans.filter((row) => banRole === "all" || row.role === banRole).map((row) => ({ ...row, image: OW_HERO_PORTRAITS[row.id] }));
  const preferredMaps = stats.mapVotes.map((row) => ({ ...row, image: mapDetailsForLabel(row.name)?.image }));
  return <div className="space-y-5" aria-label="내전 통계 내용">
    <h3 className="text-base font-bold"><StatTitle title="내전 통계" help="기간 필터는 참여 추이, 요약, 맵·밴·선호 맵에 함께 적용됩니다. 날짜는 한국 시간의 내전 개최일 기준입니다." /></h3>
    <StatsPeriodFilter value={period} onChange={setPeriod} years={years} />
    <Card size="sm"><CardHeader><CardTitle><StatTitle title="참여 추이" help="전체는 연도별, 연도는 월별, 월은 일별 추이입니다. 그래프에 마우스를 올리거나 방향키로 값을 확인하세요. 출전 멤버는 각 기간의 고유 인원으로, 기간별 인원을 더한 값과 전체 인원은 다를 수 있습니다." /></CardTitle><p className="text-xs text-muted-foreground">{statsPeriodLabel(period)} · {activeMetric.label}</p></CardHeader>
      <CardContent className="grid min-w-0 gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_220px]">
        <StatsTrend key={`${statsPeriodKey(period)}:${metric}`} points={intraTrendPoints(model.intraPeriods, period, metric)} label={activeMetric.label} unit={activeMetric.unit} />
        <div className="grid grid-cols-1 gap-2 sm:max-[899px]:grid-cols-3" aria-label="선택 기간 요약">
          {METRICS.map((item) => <button key={item.id} type="button" onClick={() => setMetric(item.id)} aria-pressed={metric === item.id} className={`rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${metric === item.id ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"}`}><span className="text-xs text-muted-foreground">{item.label}</span><strong className="mt-1 block text-2xl tabular-nums">{stats[item.id].toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span></strong><span className="mt-1 block text-[11px] text-muted-foreground">{item.id === "sessions" ? `내전당 평균 ${stats.averageMatchesPerSession ?? "—"}경기` : item.id === "completed" ? `무승부 ${stats.draws}경기 · ${stats.completed ? (stats.draws / stats.completed * 100).toFixed(1) : 0}%` : `내전당 평균 ${stats.averageParticipantsPerSession ?? "—"}명`}</span></button>)}
        </div>
      </CardContent>
    </Card>
    <div className="grid items-start gap-4 min-[800px]:grid-cols-2 min-[1200px]:grid-cols-3">
      <Card size="sm" className="min-w-0"><CardHeader><CardTitle><StatTitle title="맵별 경기" help="선택한 맵 유형 내 경기 비중입니다. 7개 이상이면 상위 5개와 기타를 표시하며 전체 목록에서 나머지 수치를 확인할 수 있습니다." /></CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="min-h-24 space-y-2"><RubberSegment label="맵 유형" labelPosition="top" options={MAP_TYPES} value={mapType} onChange={setMapType} /><p className="text-[11px] text-muted-foreground">{statsPeriodLabel(period)} · {maps.reduce((sum, row) => sum + row.value, 0)}경기</p></div>
        <StatsDonut key={`${statsPeriodKey(period)}:${mapType}`} rows={maps} label="맵별 경기" unit="경기" showImages={DONUT_IMAGE_PREVIEW} />
      </CardContent></Card>
      <Card size="sm" className="min-w-0"><CardHeader><CardTitle><StatTitle title="영웅 밴" help="최종 밴 건수의 비중입니다. 한 경기에서 여러 영웅이 밴될 수 있으므로 합계는 경기 수와 다릅니다. 역할 필터 선택 시 해당 역할 내 비중입니다." /></CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="min-h-24 space-y-2"><RubberSegment label="영웅 역할" labelPosition="top" options={[{ id: "all", label: "전체" }, { id: "tank", label: "돌격" }, { id: "dps", label: "공격" }, { id: "support", label: "지원" }]} value={banRole} onChange={setBanRole} />
        <p className="text-[11px] text-muted-foreground">밴 사용 {stats.banEnabledMatches}경기 · 밴 없음 {stats.noBanMatches}경기</p></div>
        <StatsDonut key={`${statsPeriodKey(period)}:${banRole}`} rows={bans} label="영웅 밴" unit="건" showImages={DONUT_IMAGE_PREVIEW} />
      </CardContent></Card>
      <Card size="sm" className="min-w-0"><CardHeader><CardTitle><StatTitle title="선호 맵" help="완료 경기의 맵 선정 투표에서 각 후보가 받은 표의 비중입니다. 최종 선정 횟수나 맵 밴 횟수와는 다릅니다." /></CardTitle></CardHeader><CardContent className="space-y-4"><div className="min-h-24 space-y-2 text-xs text-muted-foreground"><p>맵 선정 투표 · {statsPeriodLabel(period)}</p><p>멤버들이 선택한 맵의 득표 비중</p></div><StatsDonut key={statsPeriodKey(period)} rows={preferredMaps} label="선호 맵" unit="표" showImages={DONUT_IMAGE_PREVIEW} /></CardContent></Card>
    </div>
  </div>;
}
