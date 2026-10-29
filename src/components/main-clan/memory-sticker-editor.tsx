"use client";

import { useId, useRef, type PointerEvent, type ReactNode } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_STICKER_PLACEMENT, stickerPlacementStyle, type PhotoStickerPlacement } from "@/lib/clan/photo-sticker";
import { MemoryPhoto } from "./memory-photo";
import { PhotoSticker } from "./photo-sticker";
import styles from "./memory-sticker-editor.module.css";

export function MemoryStickerEditor({ src, caption = "", frame = "classic", sticker, placement = DEFAULT_STICKER_PLACEMENT, placeholder, onChange }: {
  src: string | null; caption?: string; frame?: string; sticker: string; placement?: PhotoStickerPlacement;
  placeholder?: ReactNode; onChange: (value: PhotoStickerPlacement) => void;
}) {
  const hint = useId();
  const drag = useRef<{ pointer: number; x: number; y: number; width: number; height: number; initial: PhotoStickerPlacement; current: PhotoStickerPlacement } | null>(null);
  const active = sticker !== "none";
  const bound = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

  function finish(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    if (commit) onChange(state.current);
    else Object.assign(event.currentTarget.style, stickerPlacementStyle(state.initial));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div className={styles.editor}>
    <div className={styles.canvas}>
      <MemoryPhoto src={src} caption={caption} frame={frame} sticker={sticker} placeholder={placeholder} stickerOverlay={active ?
        <button type="button" className={styles.handle} aria-label="스티커 위치 조절" aria-describedby={hint} data-sticker-placement style={stickerPlacementStyle(placement)}
          onPointerDown={event => {
            if (event.button !== 0 || !event.isPrimary) return;
            const rect = event.currentTarget.parentElement!.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, initial: placement, current: placement };
          }}
          onPointerMove={event => {
            const state = drag.current;
            if (!state || state.pointer !== event.pointerId) return;
            state.current = { ...state.initial, x: bound(state.initial.x + (event.clientX - state.x) / state.width * 100), y: bound(state.initial.y + (event.clientY - state.y) / state.height * 100) };
            // Move only the sticker during a drag; persist form state on release.
            Object.assign(event.currentTarget.style, stickerPlacementStyle(state.current));
          }}
          onPointerUp={event => finish(event, true)} onPointerCancel={event => finish(event, false)} onLostPointerCapture={event => finish(event, false)}
          onKeyDown={event => {
            const step = event.shiftKey ? 10 : 1;
            const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            const move = delta[event.key];
            if (!move) return;
            event.preventDefault(); onChange({ ...placement, x: bound(placement.x + move[0]), y: bound(placement.y + move[1]) });
          }}><PhotoSticker sticker={sticker}/></button> : null}/>
      <p id={hint} className={styles.hint}>{active ? "사진 위에서 드래그하거나 방향키로 스티커를 옮겨 보세요." : "스티커를 선택하면 위치와 방향을 조절할 수 있어요."}</p>
    </div>
    <fieldset className={styles.controls} disabled={!active} aria-label="스티커 배치">
      <div className={styles.controlHeading}><span>배치 조절</span><Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...DEFAULT_STICKER_PLACEMENT })}><RotateCcw className="size-3.5" aria-hidden/>초기화</Button></div>
      {([ ["x", "가로 위치"], ["y", "세로 위치"], ["rotation", "회전"] ] as const).map(([key, label]) => <label key={key} className={styles.slider}>
        <span>{label}<output>{placement[key]}{key === "rotation" ? "°" : "%"}</output></span>
        <input type="range" aria-label={`스티커 ${label}`} min={key === "rotation" ? -180 : 0} max={key === "rotation" ? 180 : 100} step={key === "rotation" ? 1 : 0.1} value={placement[key]} onChange={event => onChange({ ...placement, [key]: Number(event.target.value) })}/>
      </label>)}
      <div className={styles.flipButtons}><Button type="button" variant="outline" aria-pressed={placement.flipX} onClick={() => onChange({ ...placement, flipX: !placement.flipX })}><FlipHorizontal2 className="size-4" aria-hidden/>좌우 반전</Button><Button type="button" variant="outline" aria-pressed={placement.flipY} onClick={() => onChange({ ...placement, flipY: !placement.flipY })}><FlipVertical2 className="size-4" aria-hidden/>상하 반전</Button></div>
    </fieldset>
  </div>;
}
