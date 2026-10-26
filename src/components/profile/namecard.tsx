import { Crown, Flame, Gamepad2, Shield, Star, Zap, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { NamecardAppearance } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";

const SYMBOLS: Record<string, LucideIcon> = { "symbol-crown": Crown, "symbol-flame": Flame, "symbol-bolt": Zap, "symbol-star": Star, "symbol-gamepad": Gamepad2 };

export function Namecard({ displayName, title, frame, emblem, compact = false, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; children?: ReactNode }) {
  const SymbolIcon = SYMBOLS[emblem ?? ""] ?? Shield;
  return <span className={styles.card} data-namecard="true" data-compact={compact} data-frame={frame?.startsWith("pf_entrance_store:") ? "entrance" : "default"}>
    <span className={styles.emblem} data-symbol={emblem} aria-hidden="true"><SymbolIcon size={compact ? 16 : 28} strokeWidth={1.6} /></span>
    <span className={styles.identity}><strong title={displayName}>{displayName}</strong><small>{title || "칭호 없음"}</small></span>
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
