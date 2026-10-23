"use client";

import { useEffect, useRef, useState } from "react";
import { FurnitureArt } from "./housing-furniture-art";

export function FurniturePreview({ code, rotation = 0, className }: {
  code: string;
  rotation?: number;
  className?: string;
}) {
  const container = useRef<HTMLSpanElement>(null);
  const turn = ((Math.trunc(rotation) % 4) + 4) % 4;
  const previewKey = `${code}:${turn}`;
  const [preview, setPreview] = useState<{ key: string; src: string } | null>(null);
  const src = preview?.key === previewKey ? preview.src : null;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let started = false;
    const load = () => {
      if (started || cancelled) return;
      started = true;
      void import("./housing-three-preview")
        .then(({ getFurniturePreview }) => getFurniturePreview(code, turn))
        .then((image) => {
          if (!cancelled) setPreview({ key: previewKey, src: image });
        })
        // The vector illustration remains usable when WebGL is unavailable.
        .catch(() => {});
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer?.disconnect();
        load();
      }
    }, { rootMargin: "100px" });
    if (observer) observer.observe(element);
    else load();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [code, previewKey, turn]);

  return <span ref={container} className={className} aria-hidden="true" data-preview-state={src ? "ready" : "fallback"} style={{ display: "inline-flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
    {src ? (
      // The image is a client-generated transparent PNG, so Next image optimization cannot fetch it.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" draggable={false} width={384} height={384} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    ) : <FurnitureArt code={code} rotation={turn} />}
  </span>;
}
