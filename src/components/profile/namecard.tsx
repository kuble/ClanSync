import { Shield } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { NamecardAppearance } from "@/lib/profile/namecard";
import styles from "./namecard.module.css";

export function Namecard({ displayName, title, frame, compact = false, profileHref, children }: Partial<NamecardAppearance> & { displayName: string; compact?: boolean; profileHref?: string; children?: ReactNode }) {
  return <span className={styles.card} data-namecard="true" data-compact={compact} data-frame={frame?.startsWith("pf_entrance_store:") ? "entrance" : "default"}>
    <span className={styles.emblem} aria-hidden="true"><Shield size={compact ? 16 : 28} strokeWidth={1.6} /></span>
    <span className={styles.identity}><strong title={displayName}>{displayName}</strong><small>{title || "칭호 없음"}</small></span>
    {profileHref && <Link href={profileHref} prefetch={false} className={styles.profileLink} aria-label={`${displayName} 프로필 보기`} />}
    {children && <span className={styles.accessory}>{children}</span>}
  </span>;
}
