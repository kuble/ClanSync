"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import { MemoryStickerEditor } from "@/components/main-clan/memory-sticker-editor";
import { PhotoSticker } from "@/components/main-clan/photo-sticker";
import { PHOTO_FRAMES, PHOTO_STICKERS } from "@/lib/clan/cosmetics";
import { DEFAULT_STICKER_PLACEMENT } from "@/lib/clan/photo-sticker";
import styles from "./clan-photo-pack-preview.module.css";

function SamplePhoto() {
  return <div className={styles.sample} role="img" aria-label="배치 미리보기용 샘플 이미지"><span className={styles.sun}/><span className={styles.mountains}/><span className={styles.sampleLabel}>OUR MOMENTS</span></div>;
}

export function ClanPhotoPackPreview({ kind }: { kind: "frames" | "stickers" }) {
  const [frame, setFrame] = useState("film");
  const [sticker, setSticker] = useState("gg");
  const [placement, setPlacement] = useState(DEFAULT_STICKER_PLACEMENT);
  return <section className={styles.body} aria-label={kind === "stickers" ? "스티커 팩 체험" : "프레임 팩 체험"}>
    <div className={styles.selection} role="group" aria-label={kind === "stickers" ? "미리보기 스티커" : "미리보기 프레임"}>
      {(kind === "stickers" ? PHOTO_STICKERS.filter(option => option.id !== "none") : PHOTO_FRAMES).map(option => <Button key={option.id} type="button" variant="outline" aria-pressed={(kind === "stickers" ? sticker : frame) === option.id} onClick={() => kind === "stickers" ? setSticker(option.id) : setFrame(option.id)}>
        {kind === "stickers" && <span className={styles.selectionIcon} aria-hidden><PhotoSticker sticker={option.id}/></span>}{option.label}
      </Button>)}
    </div>
    {kind === "stickers" ? <MemoryStickerEditor src={null} caption="함께한 순간을 내 취향대로" sticker={sticker} placement={placement} placeholder={<SamplePhoto/>} onChange={setPlacement}/>
      : <div className={styles.frames}><MemoryPhoto src={null} caption="우리 클랜의 오늘" frame={frame} placeholder={<SamplePhoto/>}/><div><span className={styles.eyebrow}>선택한 프레임</span><h3>{PHOTO_FRAMES.find(option => option.id === frame)?.label}</h3><p>{frame === "film" ? "필름 가장자리로 사진에 아날로그 분위기를 더해요." : frame === "tape" ? "따뜻한 종이와 테이프로 추억을 붙여 놓아요." : "사진에 집중할 수 있는 담백한 기본 프레임이에요."}</p></div></div>}
  </section>;
}
