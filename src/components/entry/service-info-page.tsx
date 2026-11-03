import { useTranslator } from "#use-translator";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { EntryBrand } from "./entry-brand";
import { SITE_LINKS } from "@/lib/site-links";
import { SiteFooter } from "./site-footer";
import styles from "./service-info.module.css";

export function ServiceInfoPage({ current, title, description, draft = false, children }: {
  current: typeof SITE_LINKS[number]["href"];
  title: string;
  description: string;
  draft?: boolean;
  children: ReactNode;
}) {
  const tx = useTranslator();
  return <div className={styles.page}>
    <header className={styles.header}>
      <EntryBrand />
      <div className={styles.headerTools}><Link href="/?from=logo"><ArrowLeft size={14} aria-hidden="true" />{tx("홈으로")}</Link><ThemeToggle /></div>
    </header>
    <main className={styles.main}>
      <nav className={styles.navigation} aria-label={tx("서비스 안내 메뉴")}>
        {SITE_LINKS.map(({ href, label }) => <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>{tx(label)}</Link>)}
      </nav>
      <div className={styles.intro}><h1>{title}</h1><p>{description}</p></div>
      {draft && <aside className={styles.draft} aria-label={tx("문서 상태")}><strong>{tx("검토용 초안")}</strong><p>{tx("정식 시행 전 검토 중인 문서입니다. 운영자 정보와 세부 기준을 확정한 뒤 시행일과 함께 안내합니다.")}</p></aside>}
      <article className={styles.body} aria-label={title}>{children}</article>
    </main>
    <SiteFooter />
  </div>;
}
