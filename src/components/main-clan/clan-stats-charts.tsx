"use client";

import { useState } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";

/** Fills the nearest relative/isolate slot behind its content, without adding a row. */
export function StatsGauge({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
  return <span role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={Math.round(percent * 10) / 10} aria-valuetext={total > 0 ? label : "기록 없음"}
    className="pointer-events-none absolute inset-0 -z-10 m-0! overflow-hidden rounded-[inherit]">
    <span className="block h-full bg-primary/15 motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${percent}%` }} />
  </span>;
}

export function StatsTrend({ points, selected, onSelect, unit }: {
  points: { key: string; value: number }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  unit: string;
}) {
  const [displayYear, setDisplayYear] = useState(points.at(-1)?.key.slice(0, 4) ?? "");
  const activeYear = selected?.slice(0, 4) ?? displayYear;
  const years = [...new Set(points.map((point) => point.key.slice(0, 4)))].reverse();
  const visibleMonths = points.filter((point) => point.key.startsWith(activeYear));
  const max = Math.max(1, ...points.map((point) => point.value));
  const x = (index: number) => 36 + index / Math.max(1, points.length - 1) * 548;
  const y = (value: number) => 150 - value / max * 110;
  return <div className="space-y-2">
    <svg viewBox="0 0 600 180" className="aspect-[10/3] w-full" role="img" aria-label="월별 내전 추이 꺾은선 그래프. 아래 월 필터에서 수치를 확인하고 경기 기록을 좁힐 수 있습니다.">
      {[0, Math.ceil(max / 2), max].filter((value, index, values) => values.indexOf(value) === index).map((value) => <g key={value}>
        <line x1="36" x2="584" y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity="0.12" />
        <text x="28" y={y(value) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{value}</text>
      </g>)}
      <polyline fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")} />
      {points.map((point, index) => <circle key={point.key} cx={x(index)} cy={y(point.value)} r={selected === point.key ? 4 : 2.5} fill="var(--primary)"><title>{point.key}: {point.value}{unit}</title></circle>)}
    </svg>
    <div className="flex flex-wrap items-center gap-2">
      <RubberSegment label="연도" options={years.map((year) => ({ id: year, label: `${year}년` }))} value={activeYear}
        onChange={(year) => { setDisplayYear(year); onSelect(points.filter((point) => point.key.startsWith(year)).at(-1)?.key ?? null); }} />
      <RubberSegment label={`경기 기록 월 · ${unit}`} options={[{ id: "all", label: "전체" }, ...visibleMonths.map((point) => ({ id: point.key, label: `${Number(point.key.slice(5))}월 ${point.value}` }))]}
        value={selected ?? "all"} onChange={(key) => onSelect(key === "all" ? null : key)} />
    </div>
  </div>;
}
