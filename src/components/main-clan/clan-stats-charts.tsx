"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Fills the nearest relative/isolate slot behind its content, without adding a row. */
export function StatsGauge({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
  return <span role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={Math.round(percent * 10) / 10} aria-valuetext={total > 0 ? label : "기록 없음"}
    className="pointer-events-none absolute inset-0 -z-10 m-0! overflow-hidden rounded-[inherit]">
    <span className="block h-full bg-primary/15 motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${percent}%` }} />
  </span>;
}

export function StatsTrend({ points, unit, label }: {
  points: { key: string; label: string; value: number }[]; unit: string; label: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const description = useId();
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, Math.ceil(Math.max(0, ...points.map((point) => point.value)) * 1.15));
  const left = 40, right = width - 18, bottom = 252, top = 20;
  const x = (index: number) => points.length === 1 ? (left + right) / 2 : left + index / Math.max(1, points.length - 1) * (right - left);
  const y = (value: number) => bottom - value / max * (bottom - top);
  const index = active === null ? null : Math.min(active, points.length - 1);
  const selected = index === null ? null : points[index];
  const tickEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(width / 65))));
  return <div ref={root} className="relative min-w-0 self-center">
    {!points.length ? <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">집계할 내전 기록이 없습니다.</p> : <>
      <svg viewBox={`0 0 ${width} 288`} className="h-72 w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary" role="img" tabIndex={0}
        aria-label={`${label} 그래프. 좌우 방향키로 기간별 값 확인`} aria-describedby={selected ? description : undefined}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const px = (event.clientX - rect.left) * width / rect.width;
          setActive(points.reduce((best, _, i) => Math.abs(x(i) - px) < Math.abs(x(best) - px) ? i : best, 0));
        }} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
          else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, (active ?? 0) + (event.key === "ArrowRight" ? 1 : -1))));
          }
        }}>
        {[0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i).map((value) => <g key={value}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity=".1" /><text x={left - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{value}</text></g>)}
        <polyline fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} />
        {points.map((point, i) => <g key={point.key}><circle cx={x(i)} cy={y(point.value)} r={index === i ? 5 : 3} fill="var(--primary)" />{(i % tickEvery === 0 || i === points.length - 1) && <text x={x(i)} y="278" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">{point.label}</text>}</g>)}
        {index !== null && <line x1={x(index)} x2={x(index)} y1={top} y2={bottom} stroke="currentColor" strokeOpacity=".2" strokeDasharray="3 4" />}
      </svg>
      {selected && index !== null && <div id={description} role="status" aria-label="참여 추이 선택 값" className="pointer-events-none absolute top-1 z-10 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md" style={{ left: Math.max(0, Math.min(width - 160, x(index) - 70)) }}><p className="text-muted-foreground">{selected.key.replaceAll("-", ". ")}</p><p className="mt-1">{label} <strong>{selected.value.toLocaleString()}{unit}</strong></p></div>}
    </>}
  </div>;
}
