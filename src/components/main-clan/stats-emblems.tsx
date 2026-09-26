"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Trophy, CalendarCheck, Swords, Flame, Crosshair, UserRound, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatTooltip } from "./stat-help";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";

type Hof = ClanStatsPageModel["hof"];
const DESIGNS = {
  "승률": { Icon: Trophy, shape: "M32 3 56 13 52 43 32 61 12 43 8 13Z" },
  "최다 출석": { Icon: CalendarCheck, shape: "M16 5H48L59 16V48L48 59H16L5 48V16Z" },
  "최다 출전": { Icon: Swords, shape: "M32 2 61 32 32 62 3 32Z" },
  "최장 연승": { Icon: Flame, shape: "M32 2 41 14 56 9 53 26 63 36 48 44 45 59 32 53 19 59 16 44 1 36 11 26 8 9 23 14Z" },
  "예측 적중": { Icon: Crosshair, shape: "M32 3A29 29 0 1 1 31.99 3Z" },
};

function collectEmblems(hof: Hof, userId: string, period: "month" | "year") {
  return Object.entries(period === "month" ? hof.historyMonths : hof.historyYears)
    .sort(([a], [b]) => b.localeCompare(a)).flatMap(([date, block]) => {
      if (block.undisclosed) return [];
      return ([ ["승률", block.winRate], ["최다 출석", block.participation], ["최다 출전", block.cumulative], ["최장 연승", block.streaks], ["예측 적중", block.predictionCorrect] ] as const).flatMap(([category, rows]) => {
        const rank = rows.findIndex((row) => row.userId === userId) + 1;
        return rank > 0 && rank <= 3 ? [{ key: `${period}-${date}-${category}`, date, period, category, rank }] : [];
      });
    });
}
type Emblem = ReturnType<typeof collectEmblems>[number];
const emblemLabel = (emblem: Emblem) => `${emblem.date} ${emblem.period === "month" ? "월간" : "연간"} · ${emblem.category} ${emblem.rank}위`;

function EmblemGlyph({ emblem, compact = false }: { emblem: Emblem; compact?: boolean }) {
  const { Icon, shape } = DESIGNS[emblem.category];
  return <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center ${compact ? "size-12" : "size-20"} ${emblem.rank === 1 ? "text-amber-400" : emblem.rank === 2 ? "text-slate-300" : "text-orange-400"}`}>
    <svg viewBox="0 0 64 64" className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)]"><path d={shape} fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.5" />{emblem.period === "year" && <path d={shape} transform="translate(6.4 6.4) scale(.8)" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />}</svg>
    <Icon className={`relative -mt-1 ${compact ? "size-4" : "size-7"}`} strokeWidth={1.7} />
    <span className={`absolute rounded-full border border-current/30 bg-card px-1 text-[9px] font-black leading-3 ${compact ? "bottom-0.5" : "bottom-2"}`}>{emblem.rank}</span>
  </span>;
}

function EmblemCollection({ hof, userId }: { hof: Hof; userId: string }) {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const emblems = collectEmblems(hof, userId, period);
  return <div className="space-y-3">
    <RubberSegment label="수상 기간" options={[{ id: "month", label: "월간" }, { id: "year", label: "연간" }]} value={period} onChange={setPeriod} />
    {emblems.length ? <StatsScrollArea key={period} label="엠블럼 목록" className="max-h-64"><div className="flex flex-wrap gap-1" aria-label="수상 엠블럼">{emblems.map((emblem) =>
      <StatTooltip key={emblem.key} label={emblemLabel(emblem) + " 엠블럼"} description={emblemLabel(emblem)} className="rounded-xl focus-visible:outline-2 focus-visible:outline-primary"><EmblemGlyph emblem={emblem} /></StatTooltip>
    )}</div></StatsScrollArea> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">마감된 {period === "month" ? "월간" : "연간"} 기록의 상위 3위 엠블럼이 없습니다.</p>}
  </div>;
}

export function StatsPlayerBanner({ hof, userId, nickname, onBack }: { hof: Hof; userId: string; nickname: string; onBack: () => void }) {
  const emblems = [...collectEmblems(hof, userId, "month"), ...collectEmblems(hof, userId, "year")]
    .sort((a, b) => b.date.localeCompare(a.date) || a.rank - b.rank);
  const featured = emblems.slice(0, 3);
  return <section aria-label="플레이어 배너" className="relative isolate flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card px-5 py-5 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-linear-to-r from-primary/15 via-primary/5 to-transparent" />
    <div className="flex min-w-0 items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><UserRound className="size-6" aria-hidden="true" /></span>
      <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">개인 기록</p><h3 className="truncate text-lg font-bold" aria-label={`개인 기록 · ${nickname}`}>{nickname}</h3></div>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <Popover.Root>
        <Popover.Trigger openOnHover delay={150} closeDelay={180} aria-label={`${nickname} 엠블럼 컬렉션 열기`} className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/25 px-2 py-1.5 text-muted-foreground hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary">
          <span className="sr-only">대표 엠블럼: {featured.map(emblemLabel).join(", ") || "수상 기록 없음"}</span>
          {Array.from({ length: 3 }, (_, index) => featured[index] ? <EmblemGlyph key={featured[index].key} emblem={featured[index]} compact /> : <span key={index} aria-hidden="true" className="m-1 grid size-10 place-items-center rounded-full border border-dashed border-muted-foreground/20"><Trophy className="size-4 opacity-30" /></span>)}
          <ChevronDown className="ml-1 size-3.5" aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal><Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl outline-none">
            <div className="mb-1 flex items-center justify-between gap-3"><Popover.Title className="text-sm font-bold">엠블럼 컬렉션</Popover.Title><Popover.Close aria-label="엠블럼 컬렉션 닫기" className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></Popover.Close></div>
            <Popover.Description className="mb-4 text-xs leading-relaxed text-muted-foreground">{nickname}의 월간·연간 상위 3위 기록입니다. 대표 엠블럼은 최근 수상순, 같은 기간은 순위순으로 3개 표시합니다.</Popover.Description>
            <EmblemCollection hof={hof} userId={userId} />
          </Popover.Popup>
        </Popover.Positioner></Popover.Portal>
      </Popover.Root>
      <Button type="button" variant="outline" size="sm" onClick={onBack}>멤버 다시 선택</Button>
    </div>
  </section>;
}
