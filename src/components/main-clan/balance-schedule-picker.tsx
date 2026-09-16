"use client";

import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const KST = 9 * 60 * 60 * 1000;
const ROW = 36;
const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const numbers = (count: number) => Array.from({ length: count }, (_, i) => ({ value: String(i).padStart(2, "0"), label: String(i).padStart(2, "0") }));
const hours = numbers(24);
const minutes = numbers(60);

export function kstInput(iso: string | number) {
  return new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 19);
}

export function nextWeeklyDate(weekday: number, time: string, now: number) {
  const today = new Date(now + KST);
  const days = (weekday - today.getUTCDay() + 7) % 7;
  const date = new Date(today.getTime() + days * DAY).toISOString().slice(0, 10);
  const candidate = Date.parse(`${date}T${time}+09:00`);
  return kstInput(candidate > now ? candidate : candidate + 7 * DAY);
}

function Wheel({ label, options, value, onChange, disabled }: {
  label: string; options: readonly { value: string; label: string }[]; value: string;
  onChange: (value: string) => void; disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  useEffect(() => {
    const element = ref.current;
    if (element && Math.round(element.scrollTop / ROW) !== index) element.scrollTop = index * ROW;
  }, [index]);
  function select(next: number) {
    if (disabled) return;
    const bounded = Math.max(0, Math.min(options.length - 1, next));
    onChange(options[bounded].value);
    ref.current?.scrollTo({ top: bounded * ROW });
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    event.currentTarget.style.scrollSnapType = "y mandatory";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (moved) select(Math.round(event.currentTarget.scrollTop / ROW));
  }
  return <div className="min-w-0">
    <p className="mb-2 text-center text-xs text-muted-foreground">{label}</p>
    <div className="relative rounded-lg bg-muted/30">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[72px] h-9 rounded-md border-y border-primary/30 bg-primary/10" />
      <div ref={ref} role="listbox" aria-label={label} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
        aria-activedescendant={`schedule-${label}-${index}`}
        className={cn("relative h-[180px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-[72px] text-center outline-none select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-ring", disabled && "pointer-events-none opacity-50")}
        onKeyDown={(event) => {
          const next = event.key === "ArrowDown" ? index + 1 : event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
          if (next !== null) { event.preventDefault(); select(next); }
        }}
        onScroll={(event) => {
          if (disabled) return;
          const next = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / ROW)));
          if (next !== index) onChange(options[next].value);
        }}
        onPointerDown={(event) => {
          if (disabled || event.pointerType !== "mouse" || event.button !== 0) return;
          drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, moved: false };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const delta = drag.current.y - event.clientY;
          if (Math.abs(delta) > 3) {
            drag.current.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.style.scrollSnapType = "none";
            event.currentTarget.scrollTop = drag.current.top + delta;
          }
        }} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={(event) => { if (!drag.current?.moved) finish(event); }}>
        {options.map((option, i) => <div key={option.value} id={`schedule-${label}-${i}`} role="option" aria-selected={i === index}
          onClick={() => select(i)} className={cn("relative flex h-9 shrink-0 snap-center cursor-pointer items-center justify-center whitespace-nowrap text-xs tabular-nums", i === index ? "font-semibold text-foreground" : "text-muted-foreground/60")}>{option.label}</div>)}
      </div>
    </div>
  </div>;
}

export function BalanceSchedulePicker({ value, onChange, serverNow, weekly = false, disabled = false }: {
  value: string; onChange: (value: string) => void; serverNow: number; weekly?: boolean; disabled?: boolean;
}) {
  const [date, time] = value.split("T");
  const [hour, minute, second = "00"] = time.split(":");
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const anchor = kstInput(serverNow).slice(0, 10);
  const dates = useMemo(() => {
    const start = Date.parse(`${anchor}T00:00:00Z`);
    return Array.from({ length: 731 }, (_, i) => {
      const day = new Date(start + i * DAY);
      const iso = day.toISOString().slice(0, 10);
      return { value: iso, label: `${day.getUTCMonth() + 1}.${day.getUTCDate()} (${weekdays[day.getUTCDay()].slice(0, 1)})` };
    });
  }, [anchor]);
  const dateOptions = dates.some((option) => option.value === date) ? dates : [...dates, { value: date, label: date }].sort((a, b) => a.value.localeCompare(b.value));
  function changeTime(h: string, m: string, s: string) {
    const nextTime = `${h}:${m}:${s}`;
    onChange(weekly ? nextWeeklyDate(weekday, nextTime, serverNow) : `${date}T${nextTime}`);
  }
  return <fieldset className="space-y-2" disabled={disabled}>
    <legend className="text-xs font-semibold">{weekly ? "매주 요일·시각" : "예약 날짜·시각"} (한국 시간)</legend>
    <div className="grid grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] gap-2">
      <Wheel label={weekly ? "요일" : "날짜"} options={weekly ? weekdays.map((label, i) => ({ value: String(i), label })) : dateOptions} value={weekly ? String(weekday) : date} disabled={disabled}
        onChange={(next) => onChange(weekly ? nextWeeklyDate(Number(next), time, serverNow) : `${next}T${time}`)} />
      <Wheel label="시" options={hours} value={hour} disabled={disabled} onChange={(next) => changeTime(next, minute, second)} />
      <Wheel label="분" options={minutes} value={minute} disabled={disabled} onChange={(next) => changeTime(hour, next, second)} />
      <Wheel label="초" options={minutes} value={second} disabled={disabled} onChange={(next) => changeTime(hour, minute, next)} />
    </div>
    <p className="text-[11px] text-muted-foreground">{weekly ? "요일과 시각을 고르면 가장 가까운 다음 일정부터 매주 열립니다." : "위아래로 드래그하거나 스크롤해 선택하세요."}</p>
    <p className="text-xs tabular-nums text-muted-foreground">{weekly ? "첫 예약 · " : ""}{date} {hour}:{minute}:{second}</p>
  </fieldset>;
}
