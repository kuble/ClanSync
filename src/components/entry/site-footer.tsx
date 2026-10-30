import Link from "next/link";
import { EntryBrand } from "./entry-brand";
import styles from "./site-footer.module.css";

export const SITE_LINKS = [
  { href: "/notices", label: "공지사항" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/contact", label: "문의하기" },
] as const;

export function SiteFooter() {
  return <footer id="site-footer" className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.top}>
        <EntryBrand />
        <nav aria-label="하단 메뉴" className={styles.links}>
          {SITE_LINKS.map(({ href, label }) => <Link key={href} href={href} className={href === "/privacy" ? styles.privacy : undefined}>{label}</Link>)}
        </nav>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} ClanSync</p>
        <p>Blizzard Entertainment와 공식 제휴 관계가 아닙니다.</p>
      </div>
    </div>
  </footer>;
}
