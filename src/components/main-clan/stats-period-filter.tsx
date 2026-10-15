"use client";

import { RubberSegment } from "@/components/ui/rubber-segment";
import { PeriodSelect } from "@/components/ui/period-select";
import type { StatsPeriod } from "@/lib/clan/stats/intra-overview";

export function StatsPeriodFilter({ value, onChange, years, withDay = false, maxMonth = 12 }: {
  value: StatsPeriod; onChange: (value: StatsPeriod) => void; years: string[]; withDay?: boolean; maxMonth?: number;
}) {
  const days = new Date(Date.UTC(Number(value.year), Number(value.month), 0)).getUTCDate();
  const modes = [{ id: "all", label: "전체" }, { id: "year", label: "연도별" }, { id: "month", label: "월별" }] as const;
  const selectMode = (mode: StatsPeriod["mode"]) => onChange({ ...value, mode, day: "all" });
  return <div className="flex min-w-0 max-w-full flex-1 items-center gap-1.5 sm:flex-wrap sm:gap-2">
    <div className="shrink-0 sm:hidden"><PeriodSelect label="기간" value={value.mode} options={modes} onChange={(mode) => selectMode(mode as StatsPeriod["mode"])} /></div>
    <div className="hidden sm:block"><RubberSegment label="기간" labelPosition="hidden" value={value.mode} options={modes} onChange={selectMode} /></div>
    {value.mode !== "all" && <div className="flex shrink-0 items-center gap-1.5 sm:max-w-full sm:flex-wrap sm:gap-2">
      <PeriodSelect label="연도" value={value.year} options={years.map((id) => ({ id, label: `${id}년` }))} onChange={(year) => onChange({ ...value, year, day: "all" })} />
      {value.mode === "month" && <>
        <PeriodSelect label="월" value={value.month} options={Array.from({ length: maxMonth }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: `${i + 1}월` }))} onChange={(month) => onChange({ ...value, month, day: "all" })} />
        {withDay && <PeriodSelect label="일자" value={value.day} options={[{ id: "all", label: "전체 날짜" }, ...Array.from({ length: days }, (_, i) => ({ id: String(i + 1).padStart(2, "0"), label: `${i + 1}일` }))]} onChange={(day) => onChange({ ...value, day })} />}
      </>}
    </div>}
  </div>;
}
