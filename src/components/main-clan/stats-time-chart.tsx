"use client";

import { useEffect, useId, useRef, useState } from "react";

type Point = { at: string; value: number | null };
type Line = { label: string; color: string; points: Point[] };
const dateLabel = (at: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));

/** Time-proportional x-axis. Missing snapshots break the line rather than imply a score. */
export function StatsTimeChart({ label, lines, unit, empty = "기록이 없습니다." }: { label: string; lines: Line[]; unit: string; empty?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const description = useId();
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const timestamps = [...new Set(lines.flatMap((line) => line.points.map((point) => Date.parse(point.at))))].sort((a, b) => a - b);
  const values = lines.flatMap((line) => line.points.flatMap((point) => point.value === null ? [] : [point.value]));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 2;
  const low = min === max ? min - 1 : min - span * 0.1;
  const high = min === max ? max + 1 : max + span * 0.1;
  const left = 48, right = width - 18, top = 16, bottom = 174;
  const first = timestamps[0] ?? 0, last = timestamps.at(-1) ?? 0;
  const x = (time: number) => first === last ? (left + right) / 2 : left + (time - first) / (last - first) * (right - left);
  const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);
  const selected = active === null ? null : timestamps[Math.min(active, timestamps.length - 1)];
  const selectedLines = selected === null ? [] : lines.map((line) => ({ ...line, point: line.points.find((point) => Date.parse(point.at) === selected) }));
  const ticks = first === last ? [first] : Array.from({ length: width < 420 ? 3 : 5 }, (_, index) => index);
  const dateTicks = first === last ? ticks : ticks.map((_, index) => first + (last - first) * index / (ticks.length - 1));
  return <div ref={root} className="relative w-full min-w-0">
    {!values.length ? <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p> : <>
      {lines.length > 1 && <div className="mb-2 flex gap-4 text-xs">{lines.map((line) => <span key={line.label} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: line.color }} />{line.label}</span>)}</div>}
      <svg viewBox={`0 0 ${width} 208`} className="h-52 w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary" role="img" tabIndex={0}
        aria-label={`${label}. 좌우 방향키로 날짜별 값 확인`} aria-describedby={selected === null ? undefined : description}
        onPointerMove={(event) => {
          const px = (event.clientX - event.currentTarget.getBoundingClientRect().left) * width / event.currentTarget.getBoundingClientRect().width;
          setActive(timestamps.reduce((best, time, index) => Math.abs(x(time) - px) < Math.abs(x(timestamps[best]) - px) ? index : best, 0));
        }} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
          else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(event.key === "Home" ? 0 : event.key === "End" ? timestamps.length - 1 : Math.max(0, Math.min(timestamps.length - 1, (active ?? 0) + (event.key === "ArrowRight" ? 1 : -1))));
          }
        }}>
        {[low, (low + high) / 2, high].map((value) => <g key={value}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity=".1" /><text x={left - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{Math.round(value * 10) / 10}</text></g>)}
        <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity=".25" strokeDasharray="3 4" />
        {lines.map((line) => {
          let nextMove = true;
          const path = [...line.points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((point) => {
            if (point.value === null) { nextMove = true; return ""; }
            const command = nextMove ? "M" : "L"; nextMove = false;
            return `${command}${x(Date.parse(point.at))},${y(point.value)}`;
          }).join(" ");
          return <g key={line.label}><path d={path} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" />{line.points.filter((p) => p.value !== null).length === 1 && line.points.filter((p) => p.value !== null).map((p) => <circle key={p.at} cx={x(Date.parse(p.at))} cy={y(p.value!)} r="3" fill={line.color} />)}</g>;
        })}
        {dateTicks.map((time, index) => <text key={time} x={x(time)} y="199" textAnchor={index === 0 ? "start" : index === dateTicks.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{dateLabel(new Date(time).toISOString())}</text>)}
        {selected !== null && <g><line x1={x(selected)} x2={x(selected)} y1={top} y2={bottom} stroke="currentColor" strokeOpacity=".3" />{selectedLines.map((line) => line.point?.value != null && <circle key={line.label} cx={x(selected)} cy={y(line.point.value)} r="4" fill={line.color} stroke="var(--card)" strokeWidth="2" />)}</g>}
      </svg>
      {selected !== null && <div id={description} role="status" aria-label={`${label} 선택 값`} className="pointer-events-none absolute top-3 z-10 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md" style={{ left: Math.max(0, Math.min(width - 172, x(selected) - 80)) }}>
        <div className="mb-1 text-muted-foreground">{dateLabel(new Date(selected).toISOString())}</div>
        {selectedLines.map((line) => <div key={line.label} className="flex justify-between gap-4"><span>{line.label}</span><strong>{line.point?.value == null ? "기록 없음" : `${line.point.value}${unit}`}</strong></div>)}
      </div>}
    </>}
  </div>;
}

/** A cumulative timeline split at zero, with the same pointer and keyboard access as score history. */
export function StatsSignedTrendChart({ label, points, unit, empty = "기록이 없습니다." }: {
  label: string; points: { at: string; value: number }[]; unit: string; empty?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const description = useId();
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const sorted = [...points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const values = sorted.map((point) => point.value);
  const allZero = values.every((value) => value === 0);
  const extent = Math.max(1, ...values.map(Math.abs));
  const left = 48, right = width - 18, top = 16, bottom = 178;
  const first = Date.parse(sorted[0]?.at ?? "") || 0;
  const last = Date.parse(sorted.at(-1)?.at ?? "") || 0;
  const x = (time: number) => first === last ? (left + right) / 2 : left + (time - first) / (last - first) * (right - left);
  const y = (value: number) => (top + bottom) / 2 - value / extent * (bottom - top) * .43;
  const zero = y(0);
  const path = sorted.map((point, index) => `${index ? "L" : "M"}${x(Date.parse(point.at))},${y(point.value)}`).join(" ");
  const area = sorted.length > 1 ? `${path} L${x(last)},${zero} L${x(first)},${zero}Z` : "";
  const selected = active === null ? null : sorted[Math.min(active, sorted.length - 1)];
  const tickCount = width < 420 ? 3 : 5;
  const ticks = first === last ? [first] : Array.from({ length: tickCount }, (_, index) => first + (last - first) * index / (tickCount - 1));
  return <div ref={root} className="relative w-full min-w-0">
    {!sorted.length ? <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p> : <>
      <svg viewBox={`0 0 ${width} 208`} className="h-52 w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary" role="img" tabIndex={0}
        aria-label={`${label}. 0${unit} 기준. 좌우 방향키로 날짜별 값 확인`} aria-describedby={selected ? description : undefined}
        onPointerMove={(event) => {
          const px = (event.clientX - event.currentTarget.getBoundingClientRect().left) * width / event.currentTarget.getBoundingClientRect().width;
          setActive(sorted.reduce((best, point, index) => Math.abs(x(Date.parse(point.at)) - px) < Math.abs(x(Date.parse(sorted[best].at)) - px) ? index : best, 0));
        }} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
          else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(event.key === "Home" ? 0 : event.key === "End" ? sorted.length - 1 : Math.max(0, Math.min(sorted.length - 1, (active ?? 0) + (event.key === "ArrowRight" ? 1 : -1))));
          }
        }}>
        <defs><clipPath id={`${clipId}-positive`}><rect x={left} y={top} width={right - left} height={zero - top} /></clipPath><clipPath id={`${clipId}-negative`}><rect x={left} y={zero} width={right - left} height={bottom - zero} /></clipPath></defs>
        {[-extent, 0, extent].map((value) => <g key={value}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity={value === 0 ? .35 : .1} strokeDasharray={value === 0 ? "4 4" : undefined} /><text x={left - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{value > 0 ? "+" : ""}{value}</text></g>)}
        {allZero ? <path d={path} fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinejoin="round" /> : <>
          {area && <><path d={area} fill="var(--color-emerald-400)" fillOpacity=".14" clipPath={`url(#${clipId}-positive)`} /><path d={area} fill="var(--color-rose-400)" fillOpacity=".14" clipPath={`url(#${clipId}-negative)`} /></>}
          <path d={path} fill="none" stroke="var(--color-emerald-400)" strokeWidth="2.5" strokeLinejoin="round" clipPath={`url(#${clipId}-positive)`} />
          <path d={path} fill="none" stroke="var(--color-rose-400)" strokeWidth="2.5" strokeLinejoin="round" clipPath={`url(#${clipId}-negative)`} />
        </>}
        {sorted.length === 1 && <circle cx={x(first)} cy={y(sorted[0].value)} r="3" fill={allZero ? "var(--muted-foreground)" : sorted[0].value < 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)"} />}
        {ticks.map((time, index) => <text key={time} x={x(time)} y="201" textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{dateLabel(new Date(time).toISOString())}</text>)}
        {selected && <g><line x1={x(Date.parse(selected.at))} x2={x(Date.parse(selected.at))} y1={top} y2={bottom} stroke="currentColor" strokeOpacity=".3" /><circle cx={x(Date.parse(selected.at))} cy={y(selected.value)} r="4" fill={selected.value < 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)"} stroke="var(--card)" strokeWidth="2" /></g>}
      </svg>
      {selected && <div id={description} role="status" aria-label={`${label} 선택 값`} className="pointer-events-none absolute top-3 z-10 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md" style={{ left: Math.max(0, Math.min(width - 172, x(Date.parse(selected.at)) - 80)) }}><div className="text-muted-foreground">{dateLabel(selected.at)}</div><strong className="tabular-nums">{selected.value > 0 ? "+" : ""}{selected.value.toLocaleString()}{unit}</strong></div>}
    </>}
  </div>;
}
