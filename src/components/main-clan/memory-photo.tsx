import Image from "next/image";
import { ClanEmojiText } from "./clan-emoji-content";
import type { ReactNode } from "react";
import { Camera } from "lucide-react";
import { stickerPlacementStyle, stickerMirrorStyle, type PhotoStickerPlacement, type PhotoStickerInstance } from "@/lib/clan/photo-sticker";
import { PhotoSticker } from "./photo-sticker";
import { cn } from "@/lib/utils";
import { singleLineText } from "@/lib/clan/emoji-text";
import styles from "./memory-photo.module.css";
export function MemoryPhoto({ src, caption, captionEditor, alt, frame = "classic", sticker = "none", stickerPlacement, stickers, stickerOverlay, placeholder, footer, eager = false }: { src: string | null; caption: string; captionEditor?: ReactNode; alt?: string; frame?: string; sticker?: string; stickerPlacement?: PhotoStickerPlacement; stickers?: PhotoStickerInstance[]; stickerOverlay?: ReactNode; placeholder?: ReactNode; footer?: ReactNode; eager?: boolean }) {
  return <div className={cn(styles.photo, styles[frame])} data-photo-frame={frame} data-photo-sticker={sticker}>
    <div className={cn(styles.image, !src && styles.placeholder)}>{src ? <Image src={src} alt={alt || caption || "추억 사진"} width={600} height={450} unoptimized loading={eager ? "eager" : "lazy"} /> : placeholder ?? <Camera className="size-8 text-muted-foreground" aria-hidden />}
      {stickerOverlay ?? (stickers ? stickers.map(item => <span key={item.id} className={styles.placedSticker} data-sticker-id={item.id} data-sticker-placement style={stickerPlacementStyle(item.placement)}><span className={styles.art} style={stickerMirrorStyle(item.placement)}><PhotoSticker sticker={item.sticker}/></span></span>) : sticker !== "none" && stickerPlacement ? <span className={styles.placedSticker} data-sticker-placement style={stickerPlacementStyle(stickerPlacement)}><span className={styles.art} style={stickerMirrorStyle(stickerPlacement)}><PhotoSticker sticker={sticker}/></span></span> : null)}
    </div>
    {!stickers && sticker !== "none" && !stickerPlacement && !stickerOverlay && <span className={styles.legacySticker}><PhotoSticker sticker={sticker}/></span>}
    {captionEditor ?? (caption && <p className={styles.caption} data-photo-caption><ClanEmojiText text={singleLineText(caption)} large={false}/></p>)}{footer && <p className={styles.footer}>{footer}</p>}
  </div>;
}
