"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Trophy } from "lucide-react";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { buildArchiveDayStats, sortArchiveDayStats, type ArchiveDaySortKey } from "@/lib/clan/stats/archive-day-stats";
import { cn } from "@/lib/utils";

const columns: { key: ArchiveDaySortKey; label: string; accessibleLabel?: string }[] = [
  { key: "nickname", label: "이름" },
  { key: "wins", label: "승" }, { key: "draws", label: "무" }, { key: "losses", label: "패" },
  { key: "rate", label: "승률" },
  { key: "currentStreak", label: "현재", accessibleLabel: "당일 현재 연승·연패" },
  { key: "maxWinStreak", label: "연승", accessibleLabel: "당일 최장 연승" },
  { key: "maxLossStreak", label: "연패", accessibleLabel: "당일 최장 연패" },
];

export function ArchiveDayTable({ records }: { records: ClanArchiveMatch[] }) {
  const [sort, setSort] = useState<{ key: ArchiveDaySortKey; direction: "asc" | "desc" }>({ key: "rate", direction: "desc" });
  const totals = useMemo(() => buildArchiveDayStats(records), [records]);
  const rows = sortArchiveDayStats(totals, sort.key, sort.direction);
  const SortIcon = sort.direction === "asc" ? ArrowUp : ArrowDown;
  return <aside className="min-w-0 overflow-hidden rounded-xl border bg-muted/15" aria-label="선택한 날짜 내전 기록">
    <div className="flex flex-wrap items-center justify-between gap-1 border-b px-4 py-3">
      <h5 className="flex items-center gap-2 text-xs font-semibold"><Trophy className="size-4 text-amber-500" aria-hidden="true" />이날의 내전 기록</h5>
      <span className="text-[10px] text-muted-foreground">당일 전체 내전 기준</span>
    </div>
    {rows.length ? <div className="max-h-[440px] overflow-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-ring" role="region" aria-label="당일 기록 표 스크롤" tabIndex={0}>
      <table className="w-full min-w-[430px] table-fixed text-xs tabular-nums" aria-label="당일 내전 기록 정렬 표">
        <colgroup><col className="w-[26%]" /><col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[13%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[12%]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-card text-[10px] text-muted-foreground">
          <tr>{columns.map((column) => <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"} className="border-b p-0 font-medium">
            <button type="button" aria-label={`${column.accessibleLabel ?? column.label} 정렬`} onClick={() => setSort((old) => ({ key: column.key, direction: old.key === column.key ? old.direction === "asc" ? "desc" : "asc" : column.key === "nickname" ? "asc" : "desc" }))}
              className={cn("flex w-full items-center justify-center gap-0.5 py-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring", column.key === "nickname" && "justify-start pl-3", sort.key === column.key && "text-foreground")}>
              <span>{column.key === "currentStreak" || column.key === "maxWinStreak" || column.key === "maxLossStreak" ? <span className="mb-0.5 block font-normal text-muted-foreground">{column.key === "currentStreak" ? "당일" : "최장"}</span> : null}{column.label}</span>{sort.key === column.key && <SortIcon className="size-2.5 shrink-0" aria-hidden="true" />}
            </button>
          </th>)}</tr>
        </thead>
        <tbody className="divide-y">{rows.map((row) => <tr key={row.userId} className="hover:bg-muted/40">
          <th scope="row" className="break-all px-3 py-3 text-left font-medium" title={row.nickname}>{row.nickname}</th>
          <td className="text-center text-sky-600 dark:text-sky-300">{row.wins}</td><td className="text-center text-muted-foreground">{row.draws}</td><td className="text-center text-rose-600 dark:text-rose-300">{row.losses}</td>
          <td className="text-center font-semibold">{row.rate === null ? "—" : `${Math.round(row.rate * 1000) / 10}%`}</td>
          <td className={cn("text-center", row.currentStreak > 0 ? "text-sky-600 dark:text-sky-300" : row.currentStreak < 0 ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground")}>
            {row.currentStreak === 0 ? "—" : `${Math.abs(row.currentStreak)}${row.currentStreak > 0 ? "연승" : "연패"}`}
          </td>
          <td className="text-center">{row.maxWinStreak}</td><td className="text-center">{row.maxLossStreak}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="px-4 py-8 text-center text-xs text-muted-foreground">집계할 내전 결과가 없습니다.</p>}
    <p className="border-t px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">무승부는 승률에서 제외하며 연승·연패를 종료합니다. 무효·미기록은 건너뜁니다. 현재 기록은 마지막 출전 기준이며 오름차순은 연패 → 연승 순입니다.</p>
  </aside>;
}
