"use client";

import { useState } from "react";
import { StatsScrollArea } from "./stats-scroll-area";

const COLORS = ["var(--primary)", "#d6ac62", "#9a92ce", "#db8296", "#79b6bb", "var(--muted-foreground)"];

/** Limit the visual to six slices; the full counts remain available below it. */
export function StatsDonut({ rows, label, unit }: { rows: { name: string; value: number }[]; label: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const ordered = [...rows].filter((row) => row.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "ko"));
  const slices = ordered.length > 6 ? [...ordered.slice(0, 5), { name: "기타", value: ordered.slice(5).reduce((sum, row) => sum + row.value, 0) }] : ordered;
  const total = ordered.reduce((sum, row) => sum + row.value, 0);
  const selected = active === null ? null : slices[active];
  if (!total) return <p className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">선택한 조건의 기록이 없습니다.</p>;
  return <div className="space-y-4">
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={`${label}, 총 ${total}${unit}. 아래 범례에서 항목별 수치를 확인할 수 있습니다.`}>
        {slices.map((slice, i) => {
          const start = slices.slice(0, i).reduce((sum, row) => sum + row.value, 0) / total * 100;
          return <circle key={slice.name} cx="90" cy="90" r="70" fill="none" stroke={COLORS[i]} strokeWidth={active === i ? 23 : 19} pathLength="100" strokeDasharray={`${Math.max(0.1, slice.value / total * 100 - (slices.length > 1 ? 0.7 : 0))} 100`} strokeDashoffset={-start} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} className="transition-[stroke-width] motion-reduce:transition-none"><title>{slice.name}: {slice.value}{unit} ({(slice.value / total * 100).toFixed(1)}%)</title></circle>;
        })}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-8 flex flex-col items-center justify-center text-center"><span className="max-w-full truncate text-xs text-muted-foreground">{selected?.name ?? "합계"}</span><strong className="mt-1 text-2xl tabular-nums">{(selected?.value ?? total).toLocaleString()}<span className="ml-1 text-xs font-normal">{unit}</span></strong></div>
    </div>
    <ul className="space-y-1" aria-label={`${label} 비중`}>
      {slices.map((slice, i) => <li key={slice.name}><button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary"><span className="size-2 shrink-0 rounded-sm" style={{ background: COLORS[i] }} /><span className="min-w-0 flex-1 truncate">{slice.name}</span><span className="tabular-nums text-muted-foreground">{(slice.value / total * 100).toFixed(1)}%</span><strong className="min-w-12 text-right tabular-nums">{slice.value}{unit}</strong></button></li>)}
    </ul>
    {ordered.length > 6 && <details className="border-t pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">전체 {ordered.length}개 항목 보기</summary><StatsScrollArea label={`${label} 전체 목록`} className="mt-3 max-h-64"><ul className="space-y-2">{ordered.map((row) => <li key={row.name} className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate">{row.name}</span><strong className="shrink-0 tabular-nums">{row.value}{unit} · {(row.value / total * 100).toFixed(1)}%</strong></li>)}</ul></StatsScrollArea></details>}
  </div>;
}
