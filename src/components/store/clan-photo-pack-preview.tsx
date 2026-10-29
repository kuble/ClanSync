"use client";

import { useState } from "react";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import { MemoryStickerEditor } from "@/components/main-clan/memory-sticker-editor";
import { MemoryCosmeticPicker } from "@/components/main-clan/memory-cosmetic-picker";
import { DEFAULT_STICKER_PLACEMENT, MAX_PHOTO_STICKERS, type PhotoStickerInstance } from "@/lib/clan/photo-sticker";
import styles from "./clan-photo-pack-preview.module.css";

function SamplePhoto() {
  return <div className={styles.sample} role="img" aria-label="배치 미리보기용 샘플 이미지"><span className={styles.sun}/><span className={styles.mountains}/><span className={styles.sampleLabel}>OUR MOMENTS</span></div>;
}

export function ClanPhotoPackPreview({ kind }: { kind: "frames" | "stickers" }) {
  const [frame, setFrame] = useState("film");
  const [stickers, setStickers] = useState<PhotoStickerInstance[]>([{ id: "00000000-0000-0000-0000-000000000001", sticker: "gg", placement: { ...DEFAULT_STICKER_PLACEMENT } }]);
  const [selectedId, setSelectedId] = useState<string | null>(stickers[0].id);
  const picker = <MemoryCosmeticPicker src={null} frame={frame} stickers={stickers} access={{ frames: true, stickers: true, emojiSlots: 0 }} previewKind={kind} onFrame={setFrame} onClear={() => { setStickers([]); setSelectedId(null); }} onAdd={sticker => {
    if (stickers.length >= MAX_PHOTO_STICKERS) return;
    const item: PhotoStickerInstance = { id: crypto.randomUUID(), sticker, placement: { ...DEFAULT_STICKER_PLACEMENT, x: 40 + stickers.length % 4 * 10, y: 40 + stickers.length % 4 * 8 } };
    setStickers(current => [...current, item]); setSelectedId(item.id);
  }}/>;
  return <section className={styles.body} aria-label={kind === "stickers" ? "스티커 팩 체험" : "프레임 팩 체험"}>
    {kind === "stickers" ? <MemoryStickerEditor src={null} caption="함께한 순간을 내 취향대로" stickers={stickers} selectedId={selectedId} onSelect={setSelectedId} placeholder={<SamplePhoto/>} onChange={setStickers}>{picker}</MemoryStickerEditor>
      : <div className={styles.frames}><MemoryPhoto src={null} caption="우리 클랜의 오늘" frame={frame} placeholder={<SamplePhoto/>}/><div className="mt-4">{picker}</div></div>}
  </section>;
}
