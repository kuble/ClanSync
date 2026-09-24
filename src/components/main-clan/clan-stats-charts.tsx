"use client";

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
  onSelect: (key: string) => void;
  unit: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const x = (index: number) => 36 + index / Math.max(1, points.length - 1) * 548;
  const y = (value: number) => 126 - value / max * 110;
  return <div className="space-y-2">
    <svg viewBox="0 0 600 144" className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="월별 내전 추이 꺾은선 그래프. 아래 월 버튼에서 수치를 확인하고 경기 기록을 좁힐 수 있습니다.">
      {[0, Math.ceil(max / 2), max].filter((value, index, values) => values.indexOf(value) === index).map((value) => <g key={value}>
        <line x1="36" x2="584" y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity="0.12" />
        <text x="28" y={y(value) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{value}</text>
      </g>)}
      <polyline fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")} />
      {points.map((point, index) => <circle key={point.key} cx={x(index)} cy={y(point.value)} r={selected === point.key ? 4 : 2.5} fill="var(--primary)"><title>{point.key}: {point.value}{unit}</title></circle>)}
    </svg>
    <div className="grid grid-cols-12 gap-0.5 pl-6">
      {points.map((point) => <button key={point.key} type="button" onClick={() => onSelect(point.key)} aria-pressed={selected === point.key}
        aria-label={`${point.key} ${point.value}${unit}; 경기 기록 필터`}
        className={`min-w-0 rounded-md py-2 text-center text-[10px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary ${selected === point.key ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
        <span className="block">{Number(point.key.slice(5))}월</span><strong className="block tabular-nums text-foreground">{point.value}</strong>
      </button>)}
    </div>
  </div>;
}
