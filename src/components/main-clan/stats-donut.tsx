"use client";

import { useState } from "react";
import Image from "next/image";
import { StatsScrollArea } from "./stats-scroll-area";

const VISIBLE_LIMIT = 10;
const COLORS = ["var(--primary)", "#d6ac62", "#9a92ce", "#db8296", "#79b6bb", "#719bda", "#cf8660", "#a9b978", "#b279b3", "#b6a18b", "var(--muted-foreground)"];
type DonutRow = { name: string; value: number; image?: string; detail?: string; wins?: number; draws?: number; losses?: number; rate?: number | null };

function share(value: number, total: number) {
  return `${Number((value / total * 100).toFixed(1))}%`;
}

function DonutImage({ src, size, className = "object-cover" }: { src: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Reuse existing small map artwork and official hero portraits directly.
  return <Image src={src} alt="" fill sizes={`${size}px`} unoptimized onError={() => setFailed(true)} className={className} />;
}

/** Use a compact summary by default; personal map results show every map. */
export function StatsDonut({ rows, label, unit, showImages = false, preserveOrder = false, horizontal = false, mapResults = false }: { rows: DonutRow[]; label: string; unit: string; showImages?: boolean; preserveOrder?: boolean; horizontal?: boolean; mapResults?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const ordered = [...rows].filter((row) => row.value > 0);
  if (!preserveOrder) ordered.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "ko"));
  const slices: DonutRow[] = !mapResults && ordered.length > VISIBLE_LIMIT ? [...ordered.slice(0, VISIBLE_LIMIT), { name: "기타", value: ordered.slice(VISIBLE_LIMIT).reduce((sum, row) => sum + row.value, 0) }] : ordered;
  const total = ordered.reduce((sum, row) => sum + row.value, 0);
  const selected = active === null ? null : slices[active];
  const featured = selected ?? (showImages ? ordered[0] : null);
  const highlighted = active ?? (showImages ? 0 : null);
  const color = (index: number) => mapResults ? COLORS[index % (COLORS.length - 1)] : COLORS[index];
  const centerValue = (row: DonutRow) => mapResults ? (row.rate === null || row.rate === undefined ? "기록 없음" : `${row.rate}%`) : row.value.toLocaleString();
  if (!total) return mapResults ? <div className="grid items-start gap-5 sm:grid-cols-[240px_minmax(0,1fr)]">
    <div className="space-y-4"><div className="mx-auto grid size-44 place-items-center rounded-full border-[18px] border-muted text-xs text-muted-foreground">기록 없음</div><p className="-mt-2 text-center text-[11px] text-muted-foreground">전체 <strong className="ml-1 font-medium tabular-nums text-foreground">0{unit}</strong></p></div>
    <p className="flex h-[224px] items-center justify-center text-sm text-muted-foreground">선택한 조건의 기록이 없습니다.</p>
  </div> : <p className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">선택한 조건의 기록이 없습니다.</p>;
  const legend = <ul className="space-y-1" aria-label={`${label} 비중`}>
    {slices.map((slice, i) => <li key={slice.name}><button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} className={`flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${showImages && highlighted === i ? "bg-muted/40" : ""}`}>
      {showImages ? <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: color(i) }} />
        <span className="relative grid size-7 place-items-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10">
          {slice.image ? <DonutImage key={slice.image} src={slice.image} size={28} /> : <span className="grid grid-cols-2 gap-0.5 opacity-70">{[0, 1, 2, 3].map((cell) => <span key={cell} className="size-1 rounded-[1px]" style={{ background: color(i) }} />)}</span>}
        </span>
      </span> : <span className="size-2 shrink-0 rounded-sm" style={{ background: color(i) }} />}
      {mapResults ? <><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{slice.name}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{share(slice.value, total)} ({slice.value}{unit})</span></span><span className="shrink-0 text-right tabular-nums"><span className="block font-semibold">승률 {centerValue(slice)}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{slice.wins}/{slice.draws}/{slice.losses}</span></span></> : <><span className="min-w-0 flex-1 truncate">{slice.name}{slice.detail && <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{slice.detail}</span>}</span><span className="tabular-nums text-muted-foreground">{(slice.value / total * 100).toFixed(1)}%</span><strong className="min-w-12 text-right tabular-nums">{slice.value}{unit}</strong></>}</button></li>)}
  </ul>;
  return <div className={horizontal ? "grid items-start gap-5 sm:grid-cols-[240px_minmax(0,1fr)]" : "space-y-4"}>
    <div className={horizontal ? "space-y-4 sm:sticky sm:top-20" : "space-y-4"}>
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={mapResults ? `${label}, 선택 맵 ${featured?.name ?? "없음"} 승률 ${featured ? centerValue(featured) : "기록 없음"}. 도넛 구간은 출전 경기 비중입니다.` : `${label}, 총 ${total}${unit}. 아래 범례에서 항목별 수치를 확인할 수 있습니다.`}>
        {slices.map((slice, i) => {
          const start = slices.slice(0, i).reduce((sum, row) => sum + row.value, 0) / total * 100;
          return <circle key={slice.name} cx="90" cy="90" r="70" fill="none" stroke={color(i)} strokeWidth={highlighted === i ? 23 : 19} pathLength="100" strokeDasharray={`${Math.max(0.1, slice.value / total * 100 - (slices.length > 1 ? 0.7 : 0))} 100`} strokeDashoffset={-start} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} className="transition-[stroke-width] motion-reduce:transition-none"><title>{slice.name}: {slice.value}{unit} ({share(slice.value, total)}){mapResults && `, 승률 ${centerValue(slice)}`}</title></circle>;
        })}
      </svg>
      {showImages && featured?.image ? <div aria-hidden="true" className="pointer-events-none absolute inset-8 isolate overflow-hidden rounded-full bg-zinc-950 text-white ring-1 ring-white/10">
        <DonutImage key={featured.image} src={featured.image} size={112} className="object-cover animate-in fade-in duration-200 motion-reduce:animate-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/90" />
        <div className="absolute inset-x-2 bottom-3 text-center [text-shadow:0_1px_4px_rgb(0_0_0/0.8)]">
          <span className="block truncate text-[11px] font-semibold">{featured.name}</span>
          <strong className="mt-0.5 block text-xl leading-none tabular-nums">{centerValue(featured)}{!mapResults && <span className="ml-0.5 text-[10px] font-medium text-white/80">{unit}</span>}</strong>
        </div>
      </div> : <div aria-hidden="true" className="pointer-events-none absolute inset-8 flex flex-col items-center justify-center text-center"><span className="max-w-full truncate text-xs text-muted-foreground">{featured?.name ?? "합계"}</span><strong className="mt-1 text-2xl tabular-nums">{featured ? centerValue(featured) : total.toLocaleString()}{!mapResults && <span className="ml-1 text-xs font-normal">{unit}</span>}</strong></div>}
    </div>
    {showImages && <p className="-mt-2 text-center text-[11px] text-muted-foreground">전체 <strong className="ml-1 font-medium tabular-nums text-foreground">{total.toLocaleString()}{unit}</strong></p>}
    </div>
    <div className="min-w-0 space-y-4">
    {mapResults ? <StatsScrollArea label={`${label} 전체 목록`} className="h-[224px] max-h-[224px]">{legend}</StatsScrollArea> : legend}
    {!mapResults && ordered.length > VISIBLE_LIMIT && <details className="border-t pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">전체 {ordered.length}개 항목 보기</summary><StatsScrollArea label={`${label} 전체 목록`} className="mt-3 max-h-64"><ul className="space-y-2">{ordered.map((row) => <li key={row.name} className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate">{row.name}{row.detail && <span className="block text-muted-foreground">{row.detail}</span>}</span><strong className="shrink-0 tabular-nums">{row.value}{unit} · {(row.value / total * 100).toFixed(1)}%</strong></li>)}</ul></StatsScrollArea></details>}
    </div>
  </div>;
}
