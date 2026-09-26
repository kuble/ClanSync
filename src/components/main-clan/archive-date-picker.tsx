"use client";

import { useEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

export function ArchiveDatePicker({ value, onChange, dates, periodKey = "all" }: {
  value: string; onChange: (day: string) => void; dates: string[]; periodKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value);
  const grid = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef(false);
  const date = parseDay(cursor), year = date.getFullYear(), month = date.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const cellCount = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, i) => new Date(year, month, i - offset + 1));
  const records = new Set(dates);
  const withinPeriod = (key: string) => periodKey === "all" || key.startsWith(periodKey);
  const years = [...new Set([value.slice(0, 4), ...dates.map((key) => key.slice(0, 4))])].sort().reverse();

  useEffect(() => {
    if (focusAfterMove.current) grid.current?.querySelector<HTMLButtonElement>(`[data-archive-date="${cursor}"]`)?.focus();
    focusAfterMove.current = false;
  }, [cursor]);

  function moveMonth(amount: number, focus = false) {
    const next = new Date(year, month + amount, 1);
    next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    if (!withinPeriod(dateKey(next))) return;
    focusAfterMove.current = focus;
    setCursor(dateKey(next));
  }

  return <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) setCursor(value); }}>
    <Popover.Trigger render={<Button variant="outline" className="h-9 gap-2 px-3 text-sm" />} aria-label={`경기 기록 날짜 선택, ${parseDay(value).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}`}>
      <CalendarDays className="size-4 text-primary" aria-hidden="true" />
      {parseDay(value).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
      <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
      <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl outline-none" initialFocus={() => grid.current?.querySelector<HTMLButtonElement>(`[data-archive-date="${cursor}"]`)}>
        <Popover.Title className="sr-only">경기 기록 달력</Popover.Title>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="이전 달" disabled={!withinPeriod(dateKey(new Date(year, month - 1, 1)))} onClick={() => moveMonth(-1)}><ChevronLeft className="size-4" /></Button>
          <div className="flex items-center gap-1">
            <select aria-label="달력 연도" value={year} disabled={periodKey !== "all"} onChange={(event) => setCursor(dateKey(new Date(Number(event.target.value), month, 1)))} className="rounded-md bg-transparent px-1 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">{[...new Set([String(year), ...years])].sort().reverse().map((y) => <option key={y} value={y} className="bg-popover">{y}년</option>)}</select>
            <select aria-label="달력 월" value={month} disabled={periodKey.length > 4 && periodKey !== "all"} onChange={(event) => setCursor(dateKey(new Date(year, Number(event.target.value), 1)))} className="rounded-md bg-transparent px-1 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">{Array.from({ length: 12 }, (_, m) => <option key={m} value={m} className="bg-popover">{m + 1}월</option>)}</select>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="다음 달" disabled={!withinPeriod(dateKey(new Date(year, month + 1, 1)))} onClick={() => moveMonth(1)}><ChevronRight className="size-4" /></Button>
        </div>
        <div ref={grid} role="grid" aria-label={`${year}년 ${month + 1}월 경기 기록 날짜`}>
          <div role="row" className="mb-1 grid grid-cols-7 text-center text-[10px] text-muted-foreground">{weekdays.map((label) => <span key={label} role="columnheader" className="py-1">{label}</span>)}</div>
          {Array.from({ length: cellCount / 7 }, (_, week) => <div role="row" key={week} className="grid grid-cols-7">{days.slice(week * 7, week * 7 + 7).map((day) => {
            const key = dateKey(day);
            return <div role="gridcell" key={key} aria-selected={value === key}><button type="button" data-archive-date={key} disabled={!withinPeriod(key)} tabIndex={cursor === key ? 0 : -1}
              aria-label={`${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일${records.has(key) ? " 경기 기록 있음" : ""}`}
              onClick={() => { onChange(key); setOpen(false); }}
              onKeyDown={(event) => {
                if (event.key === "PageUp" || event.key === "PageDown") { event.preventDefault(); moveMonth(event.key === "PageUp" ? -1 : 1, true); return; }
                const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -((day.getDay() + 6) % 7), End: 6 - ((day.getDay() + 6) % 7) }[event.key];
                if (delta === undefined) return;
                event.preventDefault();
                const next = new Date(day); next.setDate(day.getDate() + delta);
                if (withinPeriod(dateKey(next))) { focusAfterMove.current = true; setCursor(dateKey(next)); }
              }}
              className={cn("flex h-10 w-full flex-col items-center justify-center gap-1 rounded-lg text-xs tabular-nums hover:bg-muted disabled:pointer-events-none disabled:opacity-20 focus-visible:outline-2 focus-visible:outline-ring", day.getMonth() !== month && "text-muted-foreground/40", key === value && "bg-primary text-primary-foreground hover:bg-primary/90")}>
              {day.getDate()}<span aria-hidden="true" className={cn("size-1 rounded-full", records.has(key) ? key === value ? "bg-primary-foreground" : "bg-primary" : "bg-transparent")} />
            </button></div>;
          })}</div>)}
        </div>
        <Popover.Description className="mt-3 border-t pt-3 text-[10px] text-muted-foreground">점이 있는 날짜에 경기 기록이 있습니다. 한국 시간 기준입니다.</Popover.Description>
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}
