"use client";

import { useTranslator } from "#use-translator";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { SITE_LINKS } from "@/lib/site-links";
import { EntryBrand } from "./entry-brand";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const tx = useTranslator();
  const params = useParams();
  const pathname = usePathname();
  if (params.clanId) return null;
  const links = <nav aria-label={tx("하단 메뉴")} className={styles.links}>
    {SITE_LINKS.map(({ href, label }) => <Link key={href} href={href} className={href === "/privacy" ? styles.privacy : undefined}>{tx(label)}</Link>)}
  </nav>;
  if (pathname !== "/" && pathname !== "/dev/landing-preview") {
    return <footer id="site-footer" className={`${styles.footer} ${styles.compact}`}>
      <div className={styles.compactRow}><small>© ClanSync</small>{links}</div>
    </footer>;
  }
  return <footer id="site-footer" className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.top}>
        <EntryBrand />
        {links}
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} ClanSync</p>
        <p>{tx("Blizzard Entertainment와 공식 제휴 관계가 아닙니다.")}</p>
      </div>
    </div>
  </footer>;
}
