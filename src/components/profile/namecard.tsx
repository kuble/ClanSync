import { Crown, Flame, Gamepad2, Star, Zap, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { NAMECARD_THEMES, type NamecardAppearance } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";

const SYMBOLS: Record<string, LucideIcon> = { "symbol-crown": Crown, "symbol-flame": Flame, "symbol-bolt": Zap, "symbol-star": Star, "symbol-gamepad": Gamepad2 };
// Transparent atlas cells have unequal margins; center the visible rims rather than the cells.
const PORTRAIT_BOUNDS = { arcade: "46 10 675 675", tactical: "748 8.5 676 676", nebula: "1438 -1.5 700 700" };

export function Namecard({ displayName, title, frame, namebar, emblem, portrait, compact = false, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; children?: ReactNode }) {
  const SymbolIcon = SYMBOLS[emblem ?? ""];
  const art = NAMECARD_THEMES.find(theme => namebar === `theme-${theme.id}-namebar`);
  const portraitTheme = NAMECARD_THEMES.find(theme => portrait === `theme-${theme.id}-portrait`);
  const themedFrame = NAMECARD_THEMES.some(theme => frame === `theme-${theme.id}-frame`);
  return <span className={styles.card} data-namecard="true" data-compact={compact} data-art={art?.id} data-portrait={portraitTheme?.id ?? "default"} data-frame={themedFrame || frame?.startsWith("starter-frame-") ? frame : frame?.startsWith("pf_entrance_store:") ? "entrance" : "default"} data-namebar={art || namebar?.startsWith("starter-namebar-") ? namebar : "default"} style={art ? { "--namecard-art": `url("${art.artwork}")` } as CSSProperties : undefined}>
    <span className={styles.emblem} data-symbol={emblem ?? "default"} aria-hidden="true"><span className={styles.portrait}>
      {SymbolIcon ? <SymbolIcon className={styles.symbol} size={compact ? 16 : 28} strokeWidth={1.6} /> : <Image className={styles.symbolArt} data-symbol-art="shield" src="/namecards/v1/shield.webp" width={72} height={72} alt="" />}
      {portraitTheme && <svg className={styles.portraitFrame} data-portrait-frame={portraitTheme.id} viewBox={PORTRAIT_BOUNDS[portraitTheme.id]} aria-hidden="true"><image href="/namecards/v1/portraits.webp" width="2172" height="724" /></svg>}
    </span></span>
    <span className={styles.identity}><strong title={displayName}>{displayName}</strong><small>{title || "칭호 없음"}</small></span>
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
