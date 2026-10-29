import type { CSSProperties, ReactNode } from "react";
import type { NamecardAppearance, NamecardCategory } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";
import { namecardBackground } from "@/lib/profile/backgrounds";
import { namecardFrame } from "@/lib/profile/frames";
import { SymbolArtwork } from "./symbol-artwork";
import { NamecardFrameArtwork } from "./namecard-frame-artwork";

export function Namecard({ displayName, title, emblem, namebar, frame, portrait, backgroundPalette, symbolPalette, compact = false, fill = false, previewPart, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; fill?: boolean; previewPart?: NamecardCategory; children?: ReactNode }) {
  const background = namecardBackground(namebar, backgroundPalette);
  return <span className={styles.card} data-namecard="true" data-preview-part={previewPart} data-compact={compact} data-fill={fill || undefined} data-portrait={namecardFrame(portrait,"portrait")?.id ?? "default"} data-frame={namecardFrame(frame)?.id ?? "default"} data-namebar={background?.id ?? "default"} data-background-palette={background?.paletteId} style={background ? { backgroundColor: background.palette.background, "--background-pattern": background.palette.pattern, "--background-mask": `url("${background.mask}")` } as CSSProperties : undefined}>
    {background && <span className={styles.backgroundPattern} aria-hidden="true" />}
    <NamecardFrameArtwork code={frame} />
    {(!previewPart || previewPart === "emblem" || previewPart === "portrait") && <span className={styles.emblem} data-symbol="default" aria-hidden="true"><span className={styles.portrait}>
      <NamecardFrameArtwork code={portrait} category="portrait" />
      {previewPart !== "portrait" && <span className={styles.symbolArt}><SymbolArtwork emblem={emblem} paletteId={symbolPalette} /></span>}
    </span></span>}
    {(!previewPart || previewPart === "sub") && <span className={styles.identity}>{!previewPart && <strong title={displayName}>{displayName}</strong>}<small>{title || "칭호 없음"}</small></span>}
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
