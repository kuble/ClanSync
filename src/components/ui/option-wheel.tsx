"use client";

import { useEffect, useId, useRef } from "react";

/** Compact, controlled adaptation of React Bits Option Wheel.
 * https://reactbits.dev/components/option-wheel — license: docs/licenses/react-bits.md.
 * Flat, faded options with wheel/drag/keyboard input; no animation loop or audio.
 */
export function OptionWheel<T extends string>({ options, value, onChange, label }: {
  options: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const lastWheel = useRef(0);
  const drag = useRef<{ y: number; index: number } | null>(null);
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const choose = (next: number) => { const option = options[Math.max(0, Math.min(options.length - 1, next))]; if (option && option.id !== value) onChange(option.id); };
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < 3) return;
      event.preventDefault();
      if (Date.now() - lastWheel.current < 160) return;
      lastWheel.current = Date.now();
      const option = options[Math.max(0, Math.min(options.length - 1, index + Math.sign(event.deltaY)))];
      if (option && option.id !== value) onChange(option.id);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [index, onChange, options, value]);
  return <div className="inline-flex max-w-full items-center gap-2">
    <span id={`${id}-label`} className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
    <div className="flex items-center rounded-lg border bg-muted/15">
      <div ref={root} role="listbox" tabIndex={0} aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-${index}`}
        className="relative h-14 w-32 touch-none select-none overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
        onKeyDown={(event) => { const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : ["ArrowDown", "ArrowRight"].includes(event.key) ? index + 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? index - 1 : null; if (next !== null) { event.preventDefault(); choose(next); } }}
        onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { y: event.clientY, index }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={(event) => { const start = drag.current; drag.current = null; if (start && Math.abs(start.y - event.clientY) > 8) choose(start.index + Math.round((start.y - event.clientY) / 22)); else { const offset = Math.round((event.clientY - event.currentTarget.getBoundingClientRect().top - 28) / 22); choose(index + offset); } }}
        onPointerCancel={() => { drag.current = null; }}>
        <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 h-6 -translate-y-1/2 rounded bg-primary/10" />
        {options.map((option, i) => { const d = i - index; return <div id={`${id}-${i}`} key={option.id} role="option" aria-selected={i === index}
          className="pointer-events-none absolute inset-x-2 top-1/2 truncate text-center text-xs motion-safe:transition-[transform,opacity] motion-safe:duration-150"
          style={{ transform: `translateY(calc(${d * 22}px - 50%))`, opacity: Math.abs(d) > 1 ? 0 : d === 0 ? 1 : 0.16, fontWeight: d === 0 ? 600 : 400 }}>{option.label}</div>; })}
      </div>
    </div>
  </div>;
}
