"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./preview.module.css";

type Slide = { id: string; label: string; content: ReactNode };

export function PreviewPagination({ label, slides }: { label: string; slides: Slide[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (index: number) => setActive((index + slides.length) % slides.length);

  return <div className={styles.pagination} role="region" aria-label={label}>
    <div className={styles.slideStack}>
      {slides.map((slide, index) => <div
        key={slide.id} id={`${id}-panel-${index}`} role="tabpanel"
        aria-labelledby={`${id}-tab-${index}`} tabIndex={0}
        aria-hidden={index !== active} inert={index !== active}
        className={styles.slide} data-active={index === active}
      >{slide.content}</div>)}
    </div>
    <div className={styles.paginationControls}>
      <button type="button" aria-label={`${label} 이전 페이지`} onClick={() => select(active - 1)}><ChevronLeft size={18} aria-hidden /></button>
      <div role="tablist" aria-label={`${label} 페이지 선택`}>
        {slides.map((slide, index) => <button
          key={slide.id} ref={(node) => { tabs.current[index] = node; }}
          type="button" role="tab" id={`${id}-tab-${index}`}
          aria-label={slide.label} aria-selected={index === active}
          aria-controls={`${id}-panel-${index}`} tabIndex={index === active ? 0 : -1}
          title={slide.label} onClick={() => select(index)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % slides.length;
            else if (event.key === "ArrowLeft") next = (index - 1 + slides.length) % slides.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = slides.length - 1;
            else return;
            event.preventDefault();
            select(next);
            tabs.current[next]?.focus();
          }}
        ><span aria-hidden /></button>)}
      </div>
      <button type="button" aria-label={`${label} 다음 페이지`} onClick={() => select(active + 1)}><ChevronRight size={18} aria-hidden /></button>
    </div>
    <p className={styles.paginationLabel} aria-live="polite" aria-atomic="true">{slides[active].label}<span>{active + 1} / {slides.length}</span></p>
  </div>;
}
