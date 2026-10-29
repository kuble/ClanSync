import { Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./memory-photo.module.css";

export function PhotoSticker({ sticker }: { sticker: string }) {
  return <span className={cn(styles.sticker, styles[sticker])} aria-label={sticker === "sparkle" ? "반짝 스티커" : sticker === "heart" ? "하트 스티커" : "GG 스티커"}>
    {sticker === "sparkle" ? <Sparkles aria-hidden /> : sticker === "heart" ? <Heart aria-hidden /> : "GG"}
  </span>;
}
