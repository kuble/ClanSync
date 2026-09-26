"use client";

import { RubberSegment } from "@/components/ui/rubber-segment";
import { WheelSelect } from "@/components/ui/wheel-select";
import type { StatsPeriod } from "@/lib/clan/stats/intra-overview";

export function StatsPeriodFilter({ value, onChange, years, withDay = false, maxMonth = 12 }: {
  value: StatsPeriod; onChange: (value: StatsPeriod) => void; years: string[]; withDay?: boolean; maxMonth?: number;
}) {
  const days = new Date(Date.UTC(Number(value.year), Number(value.month), 0)).getUTCDate();
  return <div className="flex max-w-full flex-wrap items-start gap-3">
    <RubberSegment label="기간" labelPosition="top" value={value.mode} options={[{ id: "all", label: "전체" }, { id: "year", label: "연도별" }, { id: "month", label: "월별" }]} onChange={(mode) => onChange({ ...value, mode, day: "all" })} />
    {value.mode !== "all" && <WheelSelect label="연도" value={value.year} options={years.map((id) => ({ id, label: `${id}년` }))} onChange={(year) => onChange({ ...value, year, day: "all" })} />}
    {value.mode === "month" && <>
      <WheelSelect label="월" value={value.month} options={Array.from({ length: maxMonth }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: `${i + 1}월` }))} onChange={(month) => onChange({ ...value, month, day: "all" })} />
      {withDay && <WheelSelect label="일자" value={value.day} options={[{ id: "all", label: "전체 날짜" }, ...Array.from({ length: days }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: `${i + 1}일` }))]} onChange={(day) => onChange({ ...value, day })} />}
    </>}
  </div>;
}
