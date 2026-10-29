import { Upload } from "lucide-react";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import { clanProductKind } from "@/lib/clan/cosmetics";
export function ClanProductPreview({ slug }: { slug: string }) {
  const kind = clanProductKind(slug);
  return kind === "emojis" ? <div className="flex w-full flex-col items-center justify-center gap-3 py-3"><Upload className="size-6 text-primary" aria-hidden /><div className="grid grid-cols-5 gap-1.5" aria-hidden>{Array.from({ length: 10 }, (_, index) => <span key={index} className="grid size-6 place-items-center rounded border border-dashed border-primary/35 text-primary/60">+</span>)}</div><span className="text-[11px] text-muted-foreground">클랜 이미지로 채우는 10슬롯</span></div>
    : <div className="flex w-full items-center justify-center gap-3 p-3" aria-label={kind === "frames" ? "필름·테이프 프레임 미리보기" : "사진 스티커 미리보기"}><div className="w-24"><MemoryPhoto src={null} caption="" frame={kind === "frames" ? "film" : "classic"} sticker={kind === "stickers" ? "gg" : "none"}/></div><div className="w-24"><MemoryPhoto src={null} caption="" frame={kind === "frames" ? "tape" : "classic"} sticker={kind === "stickers" ? "heart" : "none"}/></div></div>;
}
