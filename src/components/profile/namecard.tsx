import Image from "next/image";
import type { ReactNode } from "react";
import type { NamecardAppearance, NamecardCategory } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";
import { namecardSymbol } from "@/lib/profile/symbols";

export function Namecard({ displayName, title, emblem, compact = false, fill = false, previewPart, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; fill?: boolean; previewPart?: NamecardCategory; children?: ReactNode }) {
  const symbol = namecardSymbol(emblem);
  return <span className={styles.card} data-namecard="true" data-preview-part={previewPart} data-compact={compact} data-fill={fill || undefined} data-portrait="default" data-frame="default" data-namebar="default">
    {(!previewPart || previewPart === "emblem" || previewPart === "portrait") && <span className={styles.emblem} data-symbol="default" aria-hidden="true"><span className={styles.portrait}>
      {previewPart !== "portrait" && <Image className={styles.symbolArt} data-symbol-art={symbol.id} src={symbol.src} width={72} height={72} alt="" />}
    </span></span>}
    {(!previewPart || previewPart === "sub") && <span className={styles.identity}>{!previewPart && <strong title={displayName}>{displayName}</strong>}<small>{title || "칭호 없음"}</small></span>}
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
