import { Suspense, type ReactNode } from "react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { HeaderActions } from "@/components/ui/header-actions";
import { HeaderBreadcrumbs } from "@/components/ui/header-breadcrumbs";
import { AccountNotifications } from "./account-notifications";
import styles from "./onboarding.module.css";

export function AccountShell({ children, context, profileHref = "/profile" }: { children: ReactNode; context?: string; profileHref?: string }) {
  const accountContext = context === "프로필" || context === "엠블럼" || context === "개인 상점";
  return <div className={styles.shell}>
    <header className={styles.navbar} data-account-context={accountContext}><div className={styles.navbarInner}>
      {accountContext ? <HeaderBreadcrumbs items={context === "엠블럼" ? [{ label: "프로필", href: profileHref }, { label: context }] : [{ label: context }]} /> : <div className={styles.brandContext}><EntryBrand />{context && <span className={styles.contextLabel}>{context}</span>}</div>}
      <HeaderActions notifications={<Suspense fallback={<span className="size-8 sm:size-9" aria-hidden />}><AccountNotifications /></Suspense>} />
    </div></header>
    {children}
  </div>;
}
