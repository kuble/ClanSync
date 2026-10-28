import Image from "next/image";
import type { ReactNode } from "react";
import { Camera, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./memory-photo.module.css";
export function MemoryPhoto({ src, caption, alt, frame = "classic", sticker = "none", footer, eager = false }: { src: string | null; caption: string; alt?: string; frame?: string; sticker?: string; footer?: ReactNode; eager?: boolean }) {
  return <div className={cn(styles.photo, styles[frame])} data-photo-frame={frame} data-photo-sticker={sticker}>
    <div className={styles.image}>{src ? <Image src={src} alt={alt || caption || "추억 사진"} width={600} height={450} unoptimized loading={eager ? "eager" : "lazy"} /> : <Camera className="size-8 text-muted-foreground" aria-hidden />}</div>
    {sticker !== "none" && <span className={cn(styles.sticker, styles[sticker])} aria-label={sticker === "sparkle" ? "반짝 스티커" : sticker === "heart" ? "하트 스티커" : "GG 스티커"}>{sticker === "sparkle" ? <Sparkles aria-hidden /> : sticker === "heart" ? <Heart aria-hidden /> : "GG"}</span>}
    {caption && <p className={styles.caption}>{caption}</p>}{footer && <p className={styles.footer}>{footer}</p>}
  </div>;
}
