"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fade only edges with more content; short lists and reached ends remain clear. */
export function StatsScrollArea({ label, children, className = "max-h-72" }: { label: string; children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const measure = () => {
    const el = root.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((old) => old.top === top && old.bottom === bottom ? old : { top, bottom });
  };
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} role="region" aria-label={label} tabIndex={0} onScroll={measure}
    data-more-above={edges.top} data-more-below={edges.bottom}
    className={`min-w-0 overflow-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-primary ${className}`}
    style={{ maskImage: `linear-gradient(to bottom, ${edges.top ? "rgb(0 0 0 / .25)" : "black"}, black 24px, black calc(100% - 24px), ${edges.bottom ? "rgb(0 0 0 / .25)" : "black"})` }}>
    <div ref={content} className="space-y-3 p-1">{children}</div>
  </div>;
}
