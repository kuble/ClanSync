import type { ReactNode } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeaderBreadcrumbs } from "@/components/ui/header-breadcrumbs";
import { AccountGameMenu } from "./account-game-menu";
import styles from "./onboarding.module.css";

export function AccountShell({ children, context, profileHref = "/profile" }: { children: ReactNode; context?: string; profileHref?: string }) {
  const accountContext = context === "프로필" || context === "엠블럼" || context === "개인 상점";
  return <div className={styles.shell}>
    <header className={styles.navbar} data-account-context={accountContext}><div className={styles.navbarInner}>
      {accountContext ? <HeaderBreadcrumbs items={context === "엠블럼" ? [{ label: "프로필", href: profileHref }, { label: context }] : [{ label: context }]} /> : <div className={styles.brandContext}><EntryBrand />{context && <span className={styles.contextLabel}>{context}</span>}</div>}
      <nav aria-label="계정 메뉴"><AccountGameMenu />{context !== "프로필" && <Link href="/profile" aria-label="프로필" title="프로필"><UserRound size={16} aria-hidden="true" /><span className={styles.navLabel}>프로필</span></Link>}<ThemeToggle /></nav>
    </div></header>
    {children}
  </div>;
}
