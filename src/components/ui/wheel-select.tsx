"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";

/** Compact scroll-snap selector. Wheel, touch, click and keyboard select the same value. */
export function WheelSelect({ label, options, value, onChange }: {
  label: string; options: readonly { id: string; label: string }[]; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const wheel = useRef({ delta: 0, direction: 0, lastEvent: 0, lastStep: -Infinity });
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const rowHeight = 20;
  useLayoutEffect(() => {
    const element = root.current;
    if (element && Math.round(element.scrollTop / rowHeight) !== index) element.scrollTop = index * rowHeight;
  }, [index]);
  const choose = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(options.length - 1, next));
    if (options[bounded] && bounded !== index) onChange(options[bounded].id);
    root.current?.scrollTo({ top: bounded * rowHeight });
  }, [index, onChange, options]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? rowHeight : event.deltaMode === 2 ? element.clientHeight : 1);
      const now = performance.now();
      const gesture = wheel.current;
      if (now - gesture.lastEvent > 180 || Math.sign(delta) !== gesture.direction) gesture.delta = 0;
      gesture.lastEvent = now;
      gesture.direction = Math.sign(delta);
      // Native scrolling can skip many short rows in one notch. Accumulate small
      // trackpad movements, take one step, then discard the immediate momentum.
      if (now - gesture.lastStep < 260) return;
      gesture.delta += delta;
      if (Math.abs(gesture.delta) < 60) return;
      gesture.delta = 0;
      gesture.lastStep = now;
      choose(index + gesture.direction);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [choose, index]);
  return <div className="w-24 shrink-0 space-y-2">
    <span id={`${id}-label`} className="block text-[11px] text-muted-foreground">{label}</span>
    <div className="relative overflow-hidden rounded-lg border bg-muted/20">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-[7px] h-6 rounded-md border-y border-primary/25 bg-primary/15" />
      <div ref={root} role="listbox" aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-${index}`} tabIndex={0}
        className="relative h-[38px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-[9px] text-center outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => { const next = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / rowHeight))); if (next !== index && options[next]) onChange(options[next].id); }}
        onKeyDown={(event) => {
          const next = event.key === "ArrowDown" ? index + 1 : event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
          if (next !== null) { event.preventDefault(); choose(next); }
        }}>
        {options.map((option, i) => <div key={option.id} id={`${id}-${i}`} role="option" aria-selected={i === index} onClick={() => choose(i)}
          className={`flex h-5 snap-center cursor-pointer items-center justify-center px-2 text-xs tabular-nums ${i === index ? "font-bold text-foreground" : "text-muted-foreground/50"}`}>{option.label}</div>)}
      </div>
    </div>
  </div>;
}
