"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./preview.module.css";

const sections = [
  { id: "features", label: "내전 기능" },
  { id: "records", label: "기록과 통계" },
  { id: "clan-activity", label: "클랜 활동" },
];

export function LandingSectionNav() {
  const nav = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const header = nav.current?.closest("header");
    const targets = sections.map(({ id }) => document.getElementById(id))
      .filter((target): target is HTMLElement => target !== null);
    if (!header) return;

    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      const visible = new Set<string>();
      // Read just below the anchor offset to avoid fractional scroll rounding.
      const top = Math.min(header.getBoundingClientRect().height + 25, Math.max(0, window.innerHeight - 1));
      const bottom = Math.max(0, window.innerHeight - top - 1);
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveId(targets.filter((target) => visible.has(target.id)).at(-1)?.id ?? null);
      }, { rootMargin: `-${top}px 0px -${bottom}px 0px` });
      targets.forEach((target) => observer.observe(target));
    };

    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, []);

  return <nav ref={nav} aria-label="서비스 소개" className={styles.sectionNav}>
    {sections.map(({ id, label }) => <a key={id} href={`#${id}`}
      aria-current={activeId === id ? "location" : undefined}>{label}</a>)}
  </nav>;
}
