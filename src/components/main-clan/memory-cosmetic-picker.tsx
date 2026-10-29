"use client";

import { useId } from "react";
import { CircleSlash2, LockKeyhole } from "lucide-react";
import { PHOTO_FRAMES, PHOTO_STICKERS, type ClanCosmeticAccess } from "@/lib/clan/cosmetics";
import { MemoryPhoto } from "./memory-photo";
import { PhotoSticker } from "./photo-sticker";
import styles from "./memory-cosmetic-picker.module.css";

export function MemoryCosmeticPicker({ src, frame, sticker, access, onFrame, onSticker }: { src: string | null; frame: string; sticker: string; access: ClanCosmeticAccess; onFrame: (value: string) => void; onSticker: (value: string) => void }) {
  const id = useId();
  return <div className={styles.picker}>{(["frames", "stickers"] as const).map(kind => <fieldset key={kind}>
    <legend>{kind === "frames" ? "프레임" : "스티커"}</legend>
    <div className={styles.options}>{(kind === "frames" ? PHOTO_FRAMES : PHOTO_STICKERS).map(option => {
      const locked = option.id !== "classic" && option.id !== "none" && !access[kind];
      return <label key={option.id} className={styles.option} title={locked ? `${option.label} · 구매 필요` : option.label}>
        <input type="radio" name={`${id}-${kind}`} aria-label={option.label} checked={(kind === "frames" ? frame : sticker) === option.id} disabled={locked} onChange={() => kind === "frames" ? onFrame(option.id) : onSticker(option.id)}/>
        <span className={kind === "frames" ? styles.frame : styles.sticker} aria-hidden>{kind === "frames" ? <MemoryPhoto src={src} caption="" frame={option.id}/> : option.id === "none" ? <CircleSlash2 className="size-7 text-muted-foreground"/> : <PhotoSticker sticker={option.id}/>}</span>
        <span>{option.label}</span>{locked && <LockKeyhole className={styles.lock} aria-hidden/>}
      </label>;
    })}</div>
  </fieldset>)}</div>;
}
