import { useTranslator } from "#use-translator";
import Link from "next/link";
import { SITE_LINKS } from "@/lib/site-links";
import { EntryBrand } from "./entry-brand";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const tx = useTranslator();
  return <footer id="site-footer" className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.top}>
        <EntryBrand />
        <nav aria-label={tx("하단 메뉴")} className={styles.links}>
          {SITE_LINKS.map(({ href, label }) => <Link key={href} href={href} className={href === "/privacy" ? styles.privacy : undefined}>{tx(label)}</Link>)}
        </nav>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} ClanSync</p>
        <p>{tx("Blizzard Entertainment와 공식 제휴 관계가 아닙니다.")}</p>
      </div>
    </div>
  </footer>;
}
