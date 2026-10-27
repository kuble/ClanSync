import { Crown, Flame, Gamepad2, Shield, Star, Zap, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { NAMECARD_THEMES, type NamecardAppearance } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";

const SYMBOLS: Record<string, LucideIcon> = { "symbol-crown": Crown, "symbol-flame": Flame, "symbol-bolt": Zap, "symbol-star": Star, "symbol-gamepad": Gamepad2 };

export function Namecard({ displayName, title, frame, namebar, emblem, portrait, compact = false, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; children?: ReactNode }) {
  const SymbolIcon = SYMBOLS[emblem ?? ""] ?? Shield;
  const art = NAMECARD_THEMES.find(theme => namebar === `theme-${theme.id}-namebar`);
  const portraitTheme = NAMECARD_THEMES.find(theme => portrait === `theme-${theme.id}-portrait`);
  const themedFrame = NAMECARD_THEMES.some(theme => frame === `theme-${theme.id}-frame`);
  return <span className={styles.card} data-namecard="true" data-compact={compact} data-art={art?.id} data-portrait={portraitTheme?.id ?? "default"} data-frame={themedFrame || frame?.startsWith("starter-frame-") ? frame : frame?.startsWith("pf_entrance_store:") ? "entrance" : "default"} data-namebar={art || namebar?.startsWith("starter-namebar-") ? namebar : "default"} style={art ? { "--namecard-art": `url("${art.artwork}")` } as CSSProperties : undefined}>
    <span className={styles.emblem} data-symbol={emblem ?? "default"} aria-hidden="true"><span className={styles.portrait}><SymbolIcon size={compact ? 16 : 28} strokeWidth={1.6} /></span></span>
    <span className={styles.identity}><strong title={displayName}>{displayName}</strong><small>{title || "칭호 없음"}</small></span>
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
