"use client";

import { useId, useRef, type PointerEvent, type ReactNode } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_STICKER_PLACEMENT, stickerPlacementStyle, stickerMirrorStyle, type PhotoStickerPlacement } from "@/lib/clan/photo-sticker";
import { MemoryPhoto } from "./memory-photo";
import { PhotoSticker } from "./photo-sticker";
import styles from "./memory-sticker-editor.module.css";

type Mode = "move" | "resize" | "rotate";
const corners = [{ name: "왼쪽 위", x: 0, y: 0 }, { name: "오른쪽 위", x: 100, y: 0 }, { name: "왼쪽 아래", x: 0, y: 100 }, { name: "오른쪽 아래", x: 100, y: 100 }];
const bound = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;
const angle = (value: number) => Math.round((((value + 180) % 360 + 360) % 360 - 180) * 10) / 10;

export function MemoryStickerEditor({ src, caption = "", frame = "classic", sticker, placement = DEFAULT_STICKER_PLACEMENT, placeholder, onChange }: {
  src: string | null; caption?: string; frame?: string; sticker: string; placement?: PhotoStickerPlacement;
  placeholder?: ReactNode; onChange: (value: PhotoStickerPlacement) => void;
}) {
  const hint = useId(), box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Mode; pointer: number; x: number; y: number; width: number; height: number; cx: number; cy: number; distance: number; angle: number; initial: PhotoStickerPlacement; current: PhotoStickerPlacement } | null>(null);
  const active = sticker !== "none";

  function begin(event: PointerEvent<HTMLButtonElement>, mode: Mode) {
    if (event.button !== 0 || !event.isPrimary || drag.current || !box.current) return;
    const rect = box.current.parentElement!.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    const cx = rect.left + placement.x / 100 * rect.width, cy = rect.top + placement.y / 100 * rect.height;
    drag.current = { mode, pointer: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, cx, cy, distance: Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy)), angle: Math.atan2(event.clientY - cy, event.clientX - cx), initial: placement, current: placement };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId || !box.current) return;
    const next = { ...state.initial };
    if (state.mode === "move") {
      next.x = bound(state.initial.x + (event.clientX - state.x) / state.width * 100, 0, 100);
      next.y = bound(state.initial.y + (event.clientY - state.y) / state.height * 100, 0, 100);
    } else if (state.mode === "resize") {
      next.scale = bound((state.initial.scale ?? 1) * Math.hypot(event.clientX - state.cx, event.clientY - state.cy) / state.distance, 0.5, 3);
    } else {
      next.rotation = angle(state.initial.rotation + (Math.atan2(event.clientY - state.cy, event.clientX - state.cx) - state.angle) * 180 / Math.PI);
    }
    state.current = next;
    // Keep pointer movement local to the selection; update the form on release.
    Object.assign(box.current.style, stickerPlacementStyle(next));
  }
  function finish(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    if (commit) onChange(state.current);
    else if (box.current) Object.assign(box.current.style, stickerPlacementStyle(state.initial));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const pointer = { onPointerMove: move, onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event, true), onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finish(event, false), onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finish(event, false) };

  return <div className={styles.editor}>
    <MemoryPhoto src={src} caption={caption} frame={frame} sticker={sticker} placeholder={placeholder} stickerOverlay={active ?
      <div ref={box} className={styles.box} data-sticker-placement style={stickerPlacementStyle(placement)}>
        <button type="button" className={styles.body} aria-label="스티커 위치 조절" aria-describedby={hint} {...pointer} onPointerDown={event => begin(event, "move")} onKeyDown={event => {
          const step = event.shiftKey ? 10 : 1;
          const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
          const value = delta[event.key]; if (!value) return;
          event.preventDefault(); onChange({ ...placement, x: bound(placement.x + value[0], 0, 100), y: bound(placement.y + value[1], 0, 100) });
        }}><span className={styles.art} style={stickerMirrorStyle(placement)}><PhotoSticker sticker={sticker}/></span></button>
        {corners.map(corner => <button key={corner.name} type="button" className={styles.corner} aria-label={`스티커 크기 조절 ${corner.name}`} style={{ left: `${corner.x}%`, top: `${corner.y}%`, cursor: corner.x === corner.y ? "nwse-resize" : "nesw-resize" }} {...pointer} onPointerDown={event => begin(event, "resize")} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) return;
          event.preventDefault(); onChange({ ...placement, scale: bound((placement.scale ?? 1) + (["ArrowRight", "ArrowUp"].includes(event.key) ? 0.05 : -0.05), 0.5, 3) });
        }}/>) }
        <button type="button" className={styles.rotate} aria-label="스티커 회전" title="회전" {...pointer} onPointerDown={event => begin(event, "rotate")} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) return;
          event.preventDefault(); onChange({ ...placement, rotation: angle(placement.rotation + (["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1) * (event.shiftKey ? 15 : 5)) });
        }}><RotateCw className="size-3.5" aria-hidden/></button>
      </div> : null}/>
    {active && <div className={styles.tools} role="group" aria-label="스티커 도구">
      <Button type="button" size="icon" variant="ghost" aria-label="좌우 반전" title="좌우 반전" aria-pressed={placement.flipX} onClick={() => onChange({ ...placement, flipX: !placement.flipX })}><FlipHorizontal2 className="size-4" aria-hidden/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="상하 반전" title="상하 반전" aria-pressed={placement.flipY} onClick={() => onChange({ ...placement, flipY: !placement.flipY })}><FlipVertical2 className="size-4" aria-hidden/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="초기화" title="초기화" onClick={() => onChange({ ...DEFAULT_STICKER_PLACEMENT })}><RotateCcw className="size-4" aria-hidden/></Button>
    </div>}
    <span id={hint} className="sr-only">방향키로 이동합니다. 모서리 핸들의 방향키로 크기를, 회전 핸들의 방향키로 각도를 조절합니다.</span>
  </div>;
}
