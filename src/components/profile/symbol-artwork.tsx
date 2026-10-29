import Image from "next/image";
import { namecardSymbol } from "@/lib/profile/symbols";
import styles from "./symbol-artwork.module.css";

export function SymbolArtwork({ emblem, paletteId, size = 72, className = "", alt = "" }: { emblem?: string | null; paletteId?: string | null; size?: number; className?: string; alt?: string }) {
  const symbol = namecardSymbol(emblem, paletteId);
  if (symbol.color) return <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined} className={`${styles.color} ${className}`} data-symbol-art={symbol.id} data-symbol-palette={symbol.paletteId} style={{ backgroundColor: symbol.color, maskImage: `url("${symbol.src}")` }} />;
  return <Image className={`${styles.default} ${className}`} data-symbol-art={symbol.id} data-symbol-palette="default" src={symbol.src} width={size} height={size} alt={alt} />;
}
