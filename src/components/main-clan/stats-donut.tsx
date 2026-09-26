"use client";

import { useState } from "react";
import Image from "next/image";
import { StatsScrollArea } from "./stats-scroll-area";

const COLORS = ["var(--primary)", "#d6ac62", "#9a92ce", "#db8296", "#79b6bb", "var(--muted-foreground)"];
type DonutRow = { name: string; value: number; image?: string };

function DonutImage({ src, size, className = "" }: { src: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Reuse existing small map artwork and official hero portraits directly.
  return <Image src={src} alt="" fill sizes={`${size}px`} unoptimized onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** Limit the visual to six slices; the full counts remain available below it. */
export function StatsDonut({ rows, label, unit, showImages = false }: { rows: DonutRow[]; label: string; unit: string; showImages?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const ordered = [...rows].filter((row) => row.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "ko"));
  const slices: DonutRow[] = ordered.length > 6 ? [...ordered.slice(0, 5), { name: "기타", value: ordered.slice(5).reduce((sum, row) => sum + row.value, 0) }] : ordered;
  const total = ordered.reduce((sum, row) => sum + row.value, 0);
  const selected = active === null ? null : slices[active];
  const featured = selected ?? (showImages ? ordered[0] : null);
  const highlighted = active ?? (showImages ? 0 : null);
  if (!total) return <p className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">선택한 조건의 기록이 없습니다.</p>;
  return <div className="space-y-4">
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={`${label}, 총 ${total}${unit}. 아래 범례에서 항목별 수치를 확인할 수 있습니다.`}>
        {slices.map((slice, i) => {
          const start = slices.slice(0, i).reduce((sum, row) => sum + row.value, 0) / total * 100;
          return <circle key={slice.name} cx="90" cy="90" r="70" fill="none" stroke={COLORS[i]} strokeWidth={highlighted === i ? 23 : 19} pathLength="100" strokeDasharray={`${Math.max(0.1, slice.value / total * 100 - (slices.length > 1 ? 0.7 : 0))} 100`} strokeDashoffset={-start} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} className="transition-[stroke-width] motion-reduce:transition-none"><title>{slice.name}: {slice.value}{unit} ({(slice.value / total * 100).toFixed(1)}%)</title></circle>;
        })}
      </svg>
      {showImages && featured?.image ? <div aria-hidden="true" className="pointer-events-none absolute inset-8 isolate overflow-hidden rounded-full bg-zinc-950 text-white ring-1 ring-white/10">
        <DonutImage key={featured.image} src={featured.image} size={112} className="animate-in fade-in duration-200 motion-reduce:animate-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/90" />
        <div className="absolute inset-x-2 bottom-3 text-center [text-shadow:0_1px_4px_rgb(0_0_0/0.8)]">
          <span className="block truncate text-[11px] font-semibold">{featured.name}</span>
          <strong className="mt-0.5 block text-xl leading-none tabular-nums">{featured.value.toLocaleString()}<span className="ml-0.5 text-[10px] font-medium text-white/80">{unit}</span></strong>
        </div>
      </div> : <div aria-hidden="true" className="pointer-events-none absolute inset-8 flex flex-col items-center justify-center text-center"><span className="max-w-full truncate text-xs text-muted-foreground">{featured?.name ?? "합계"}</span><strong className="mt-1 text-2xl tabular-nums">{(featured?.value ?? total).toLocaleString()}<span className="ml-1 text-xs font-normal">{unit}</span></strong></div>}
    </div>
    {showImages && <p className="-mt-2 text-center text-[11px] text-muted-foreground">전체 <strong className="ml-1 font-medium tabular-nums text-foreground">{total.toLocaleString()}{unit}</strong></p>}
    <ul className="space-y-1" aria-label={`${label} 비중`}>
      {slices.map((slice, i) => <li key={slice.name}><button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} className={`flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${showImages && highlighted === i ? "bg-muted/40" : ""}`}>
        {showImages ? <span aria-hidden="true" className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10">
          {slice.image ? <DonutImage key={slice.image} src={slice.image} size={28} /> : <span className="grid grid-cols-2 gap-0.5 opacity-70">{[0, 1, 2, 3].map((cell) => <span key={cell} className="size-1 rounded-[1px]" style={{ background: COLORS[i] }} />)}</span>}
          <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: COLORS[i] }} />
        </span> : <span className="size-2 shrink-0 rounded-sm" style={{ background: COLORS[i] }} />}
        <span className="min-w-0 flex-1 truncate">{slice.name}</span><span className="tabular-nums text-muted-foreground">{(slice.value / total * 100).toFixed(1)}%</span><strong className="min-w-12 text-right tabular-nums">{slice.value}{unit}</strong></button></li>)}
    </ul>
    {ordered.length > 6 && <details className="border-t pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">전체 {ordered.length}개 항목 보기</summary><StatsScrollArea label={`${label} 전체 목록`} className="mt-3 max-h-64"><ul className="space-y-2">{ordered.map((row) => <li key={row.name} className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate">{row.name}</span><strong className="shrink-0 tabular-nums">{row.value}{unit} · {(row.value / total * 100).toFixed(1)}%</strong></li>)}</ul></StatsScrollArea></details>}
  </div>;
}
