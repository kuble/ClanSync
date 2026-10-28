"use client";
import { useRef, useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { squareCrop, type SquareCrop } from "@/lib/images/square-crop";
import { Button } from "./button";

export function SquareImageCropper({ src, pending, zoomLabel, children }: {
  src: string; pending: boolean; zoomLabel: string;
  children: (state: { crop: SquareCrop; ready: boolean; controls: ReactNode; preview: (size: number) => ReactNode }) => ReactNode;
}) {
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 }), [ready, setReady] = useState(false), [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const crop = squareCrop(dimensions.width, dimensions.height, zoom, pan);
  const imageStyle = { width: `${dimensions.width / crop.size * 100}%`, height: `${dimensions.height / crop.size * 100}%`, maxWidth: "none", left: `${-crop.x / crop.size * 100}%`, top: `${-crop.y / crop.size * 100}%` };
  const preview = (size: number) => <span className="relative inline-block shrink-0 overflow-hidden" style={{ width: size, height: size }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- local file preview */}
    <img src={src} alt="" draggable={false} className="pointer-events-none absolute" style={imageStyle}/>
  </span>;
  const controls = <fieldset disabled={pending} className="min-w-0 space-y-4 bg-muted/30 p-5">
    <div className="relative mx-auto aspect-square w-full max-w-[min(20rem,max(6rem,calc(100dvh-12rem)))] touch-none overflow-hidden border-2 border-foreground/60 bg-[repeating-conic-gradient(var(--muted)_0%_25%,var(--background)_0%_50%)] bg-[length:20px_20px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary" tabIndex={pending ? -1 : 0} role="group" aria-label="이미지 자르기 영역" aria-disabled={pending || !ready}
      onKeyDown={event => {
        if (pending || !ready) return;
        const direction = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
        if (direction) { event.preventDefault(); setPan({ x: crop.x - (dimensions.width - crop.size) / 2 + direction[0] * crop.size * .04, y: crop.y - (dimensions.height - crop.size) / 2 + direction[1] * crop.size * .04 }); }
      }}
      onPointerDown={event => { if (pending || !ready) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, pan: { x: crop.x - (dimensions.width - crop.size) / 2, y: crop.y - (dimensions.height - crop.size) / 2 } }; }}
      onPointerMove={event => { if (!drag.current || pending) return; const scale = crop.size / event.currentTarget.clientWidth; setPan({ x: drag.current.pan.x - (event.clientX - drag.current.x) * scale, y: drag.current.pan.y - (event.clientY - drag.current.y) * scale }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local file preview */}
      <img src={src} alt="자르기 미리보기" draggable={false} className="pointer-events-none absolute select-none" style={imageStyle} onLoad={event => { setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setReady(true); setError(false); }} onError={() => { setReady(false); setError(true); }}/>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">이미지를 읽지 못했습니다. 다른 이미지를 선택해 주세요.</p>}
    <p className="text-center text-xs text-muted-foreground">드래그 또는 방향키로 위치 조절</p>
    <div className="mx-auto flex max-w-80 items-center gap-3"><Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden/><input aria-label={zoomLabel} type="range" min={1} max={4} step={.05} value={zoom} disabled={pending || !ready} onChange={event => setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-[var(--primary)]"/><Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden/><Button type="button" variant="ghost" size="icon-sm" aria-label="자르기 초기화" disabled={pending || !ready} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="size-4" aria-hidden/></Button></div>
  </fieldset>;
  return children({ crop, ready, controls, preview });
}
