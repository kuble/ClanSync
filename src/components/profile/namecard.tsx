import Image from "next/image";
import type { ReactNode } from "react";
import type { NamecardAppearance, NamecardCategory } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";

export function Namecard({ displayName, title, compact = false, fill = false, previewPart, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; fill?: boolean; previewPart?: NamecardCategory; children?: ReactNode }) {
  return <span className={styles.card} data-namecard="true" data-preview-part={previewPart} data-compact={compact} data-fill={fill || undefined} data-portrait="default" data-frame="default" data-namebar="default">
    {(!previewPart || previewPart === "emblem" || previewPart === "portrait") && <span className={styles.emblem} data-symbol="default" aria-hidden="true"><span className={styles.portrait}>
      {previewPart !== "portrait" && <Image className={styles.symbolArt} data-symbol-art="shield" src="/namecards/v1/shield.webp" width={72} height={72} alt="" />}
    </span></span>}
    {(!previewPart || previewPart === "sub") && <span className={styles.identity}>{!previewPart && <strong title={displayName}>{displayName}</strong>}<small>{title || "칭호 없음"}</small></span>}
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
