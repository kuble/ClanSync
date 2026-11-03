"use client";

import { useTranslator } from "#use-translator";
import { useId, useState } from "react";
import { CircleSlash2, LockKeyhole, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHOTO_FRAMES, PHOTO_PACKS, PHOTO_STICKERS, type ClanCosmeticAccess } from "@/lib/clan/cosmetics";
import { MAX_PHOTO_STICKERS, type PhotoStickerInstance } from "@/lib/clan/photo-sticker";
import { MemoryPhoto } from "./memory-photo";
import { PhotoSticker } from "./photo-sticker";
import styles from "./memory-cosmetic-picker.module.css";

type Kind = "frames" | "stickers";
export function MemoryCosmeticPicker({ src, frame, stickers, access, onFrame, onAdd, onClear, previewKind }: {
  src: string | null; frame: string; stickers: PhotoStickerInstance[]; access: ClanCosmeticAccess;
  onFrame: (value: string) => void; onAdd: (value: PhotoStickerInstance["sticker"]) => void; onClear: () => void; previewKind?: Kind;
}) {
  const tx = useTranslator();
  const id = useId();
  const [kind, setKind] = useState<Kind>(previewKind ?? "frames");
  const [packs, setPacks] = useState<Record<Kind, string>>({ frames: PHOTO_FRAMES.find(option => option.id === frame)?.pack ?? "basic", stickers: stickers.length ? "clan_photo_stickers" : "basic" });
  const kinds = previewKind ? [previewKind] : ["frames", "stickers"] as const;
  return <Tabs value={kind} onValueChange={value => setKind(value as Kind)} className={styles.picker}>
    <div className={styles.heading}><TabsList aria-label={tx("사진 꾸미기 종류")}>{kinds.map(value => <TabsTrigger key={value} value={value}>{value === "frames" ? tx("프레임") : tx("스티커")}</TabsTrigger>)}</TabsList>{previewKind !== "frames" && <span className={styles.count}>{tx("스티커")} {stickers.length}/{MAX_PHOTO_STICKERS}</span>}</div>
    {kinds.map(type => <TabsContent key={type} value={type}>
      <Tabs value={previewKind ? `clan_photo_${type}` : packs[type]} onValueChange={value => setPacks(current => ({ ...current, [type]: String(value) }))}>
        <div className={styles.packScroll}><TabsList variant="line" aria-label={type === "frames" ? tx("프레임 팩") : tx("스티커 팩")}>
          {PHOTO_PACKS.filter(pack => (pack.kind === "both" || pack.kind === type) && (!previewKind || pack.id !== "basic")).map(pack => <TabsTrigger key={pack.id} value={pack.id}>{pack.label}</TabsTrigger>)}
        </TabsList></div>
        {PHOTO_PACKS.filter(pack => pack.kind === "both" || pack.kind === type).map(pack => <TabsContent key={pack.id} value={pack.id} className={styles.elements}>
          <div className={styles.options} role="group" aria-label={type === "frames" ? tx("프레임 요소") : tx("스티커 요소")}>
            {(type === "frames" ? PHOTO_FRAMES : PHOTO_STICKERS).filter(option => option.pack === pack.id).map(option => {
              const locked = pack.id !== "basic" && !access[type];
              const count = stickers.filter(item => item.sticker === option.id).length;
              const art = <><span className={type === "frames" ? styles.frame : styles.sticker} aria-hidden>{type === "frames" ? <MemoryPhoto src={src} caption="" frame={option.id}/> : option.id === "none" ? <CircleSlash2 className="size-7 text-muted-foreground"/> : <PhotoSticker sticker={option.id}/>}</span><span>{tx(option.label)}</span>{locked ? <LockKeyhole className={styles.badge} aria-hidden/> : type === "stickers" && option.id !== "none" && <span className={styles.badge} aria-hidden>{count || <Plus className="size-3"/>}</span>}</>;
              return type === "frames" ? <label key={option.id} className={styles.option} title={locked ? tx("{0} · 구매 필요", option.label) : tx(option.label)}><input type="radio" name={`${id}-frame`} aria-label={tx(option.label)} checked={frame === option.id} disabled={locked} onChange={() => onFrame(option.id)}/>{art}</label>
                : <button key={option.id} type="button" className={styles.option} aria-label={option.id === "none" ? tx("스티커 모두 제거") : tx("{0} 추가", option.label)} title={locked ? tx("{0} · 구매 필요", option.label) : option.id === "none" ? tx("스티커 모두 제거") : tx("{0} 추가", option.label)} disabled={locked || (option.id !== "none" && stickers.length >= MAX_PHOTO_STICKERS) || (option.id === "none" && !stickers.length)} onClick={() => option.id === "none" ? onClear() : onAdd(option.id as PhotoStickerInstance["sticker"])}>{art}</button>;
            })}
          </div>
        </TabsContent>)}
      </Tabs>
    </TabsContent>)}
  </Tabs>;
}
