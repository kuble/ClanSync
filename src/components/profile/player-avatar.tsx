"use client";
import { cn } from "@/lib/utils";
import { SymbolArtwork } from "./symbol-artwork";
import { NamecardFrameArtwork } from "./namecard-frame-artwork";

export function PlayerAvatar({ emblem, symbolPalette, portrait, portraitPalette, label, size = 32 }: { emblem?: string | null; symbolPalette?: string | null; portrait?: string | null; portraitPalette?: string | null; label: string; size?: number }) {
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10 p-1", size > 32 && "rounded-xl")} style={{ width: size, height: size }}>
    <NamecardFrameArtwork code={portrait} category="portrait" paletteId={portraitPalette} />
    <SymbolArtwork emblem={emblem} paletteId={symbolPalette} alt={`${label} 프로필 심볼`} size={size}/>
  </span>;
}
