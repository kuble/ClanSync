"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./preview.module.css";

export type PreviewSlide = { id: string; label: string; title: string; description: string };

function FullPageFrame({ slide }: { slide: PreviewSlide }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1280));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className={styles.fullPageFrame}>
    <div inert aria-hidden="true"><iframe title={`${slide.label} 전체 페이지 예시`} src={`/dev/landing-preview/screen/${slide.id}`} width={1280} height={1160} tabIndex={-1} style={{ transform: `scale(${scale})` }} /></div>
  </div>;
}

export function ProductPreview({ slides }: { slides: PreviewSlide[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const current = slides[active];
  const select = (index: number) => setActive((index + slides.length) % slides.length);
  return (
    <section id="formation-preview" className={styles.preview} tabIndex={-1} aria-label="클랜 페이지 미리보기" aria-roledescription="캐러셀">
      <div className={styles.product}>
        <div className={styles.productHeader}>
          <div><span className={styles.context}>오버워치 / {current.label}</span><h2>{current.title}</h2></div>
          <span className={styles.status}>{active + 1} / {slides.length}</span>
        </div>
        {slides.map((slide, index) => (
          <div key={slide.id} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0} className={styles.screen}>{active === index && <FullPageFrame key={slide.id} slide={slide} />}</div>
        ))}
        <div className={styles.carouselControls}>
          <button type="button" onClick={() => select(active - 1)} aria-label="이전 클랜 화면" className={styles.arrow}><ChevronLeft size={19} aria-hidden="true" /></button>
          <div role="tablist" aria-label="미리볼 클랜 페이지" className={styles.dots}>
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
                aria-label={`${index + 1}. ${slide.label}`} title={slide.label} className={styles.dot}
                ref={(node) => { dots.current[index] = node; }} onClick={() => select(index)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + slides.length) % slides.length;
                  select(next);
                  dots.current[next]?.focus();
                }}><span /></button>
            ))}
          </div>
          <button type="button" onClick={() => select(active + 1)} aria-label="다음 클랜 화면" className={styles.arrow}><ChevronRight size={19} aria-hidden="true" /></button>
        </div>
      </div>
      <div className={styles.previewCaption}>
        <p aria-live="polite" aria-atomic="true"><strong>{current.label}</strong> {current.description}</p>
        <div className={styles.previewMeta}><span>실제 UI로 구성한 전체 페이지 예시 · 읽기 전용</span><a href={`/dev/landing-preview/screen/${current.id}`} target="_blank" rel="noopener noreferrer">전체 크기로 보기 ↗</a></div>
      </div>
    </section>
  );
}
