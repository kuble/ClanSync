"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./rubber-segment.module.css";

/** Segmented filter with an elastic thumb, inspired by React Bits Rubber Segment. */
export function RubberSegment<T extends string>({ options, value, onChange, label, labelPosition = "inline" }: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  labelPosition?: "inline" | "top";
}) {
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((option) => option.id === value));

  useLayoutEffect(() => {
    const selected = buttons.current[index];
    const indicator = thumb.current;
    if (!selected || !indicator) return;
    const update = () => {
      indicator.style.left = `${selected.offsetLeft}px`;
      indicator.style.width = `${selected.offsetWidth}px`;
      indicator.style.opacity = "1";
    };
    update();
    const observer = new ResizeObserver(update);
    if (track.current) observer.observe(track.current);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [index, options.length]);

  const choose = (next: number) => {
    const target = Math.max(0, Math.min(options.length - 1, next));
    const button = buttons.current[target];
    button?.focus();
    if (button && viewport.current) {
      const view = viewport.current;
      if (button.offsetLeft < view.scrollLeft) view.scrollTo({ left: button.offsetLeft, behavior: "smooth" });
      else if (button.offsetLeft + button.offsetWidth > view.scrollLeft + view.clientWidth)
        view.scrollTo({ left: button.offsetLeft + button.offsetWidth - view.clientWidth, behavior: "smooth" });
    }
    if (options[target] && target !== index) onChange(options[target].id);
  };

  return <div className={`flex min-w-0 max-w-full gap-2 ${labelPosition === "top" ? "flex-col items-start" : "items-center"}`}>
    <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
    <div ref={viewport} className="min-w-0 max-w-full overflow-x-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div ref={track} role="radiogroup" aria-label={label} className="relative flex w-max items-center rounded-lg border bg-muted/30 p-[3px]">
        <span ref={thumb} aria-hidden className={`${styles.thumb} pointer-events-none absolute inset-y-[3px] z-0 rounded-[7px] bg-primary/80 opacity-0 shadow-sm`}>
          <span key={value} className={`${styles.pulse} block size-full rounded-[inherit]`} />
        </span>
        {options.map((option, i) => <button key={option.id} ref={(node) => { buttons.current[i] = node; }} type="button" role="radio"
          aria-checked={i === index} tabIndex={i === index ? 0 : -1}
          onClick={() => choose(i)}
          onKeyDown={(event) => {
            const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
              : ["ArrowRight", "ArrowDown"].includes(event.key) ? i + 1
                : ["ArrowLeft", "ArrowUp"].includes(event.key) ? i - 1 : null;
            if (next !== null) { event.preventDefault(); choose(next); }
          }}
          className={`relative z-10 min-h-8 min-w-12 whitespace-nowrap rounded-md px-3 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${i === index ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {option.label}
        </button>)}
      </div>
    </div>
  </div>;
}
