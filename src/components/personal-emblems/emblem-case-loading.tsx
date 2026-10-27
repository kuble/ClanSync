import { AccountShell } from "@/components/onboarding/account-shell";
import { Skeleton } from "@/components/ui/skeleton";
import caseStyles from "@/components/main-clan/clan-collection.module.css";
import styles from "./personal-emblem-case.module.css";

export function EmblemCaseLoading() {
  return <AccountShell context="엠블럼"><main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-7" aria-busy="true">
    <span role="status" className="sr-only">엠블럼을 불러오는 중…</span>
    <div className={styles.pageLayout} aria-hidden="true">
      <header className={styles.pageHeader}><div className={styles.pageHeading}><h2 className="text-xl font-semibold">엠블럼 케이스</h2></div><Skeleton className="ml-auto h-[82px] w-[158px]" /></header>
      <div className={styles.toolbar}><div className={styles.toolbarFilters}><Skeleton className="h-9 w-full max-w-xs" /><Skeleton className="h-9 w-full max-w-xs" /></div><div className={styles.feedback} /></div>
      <div className={`${caseStyles.case} ${styles.pageCase} ${styles.collectionFrame}`}><div className={`${caseStyles.caseGrid} ${styles.pageGrid}`}>{[0, 1, 2].map(index => <Skeleton key={index} className="aspect-square w-full" />)}</div></div>
    </div>
  </main></AccountShell>;
}
