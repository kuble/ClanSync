import { AccountShell } from "@/components/onboarding/account-shell";
import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "@/components/profile/profile.module.css";
import styles from "@/components/store/personal-store.module.css";

export default function StoreLoading() {
  return <AccountShell context="개인 상점"><main className={pageStyles.page} aria-busy="true">
    <span className="sr-only" role="status">상점 디자인을 불러오는 중…</span>
    <div className={styles.shop}>
      <h1 className="sr-only">네임카드 상점</h1>
      <div className={styles.previewRow}>
      <section className={styles.current}><Skeleton className="h-[86px] w-full rounded-xl" /><div className={styles.previewControls}><Skeleton className="h-8 w-16" /></div></section>
      <div className={styles.wallet}><div><span>내 코인</span><Skeleton className="h-8 w-16" /></div></div>
      </div>
      <div className={styles.catalog} aria-hidden="true"><div className={styles.filters}><Skeleton className="h-10 w-full max-w-md" /><div className={styles.tools}><Skeleton className="h-10 w-80 max-w-full" /></div></div><div className={styles.results}><Skeleton className="h-4 w-32" /></div><div className={styles.grid} data-layout="label">{Array.from({ length: 3 }, (_, i) => <div className={styles.product} key={i}><div className={styles.productHeading}><Skeleton className="h-5 w-32" /></div><div className={styles.preview}><Skeleton className="h-[86px] w-full rounded-xl" /></div><div className={styles.productFooter}><Skeleton className="h-4 w-16" /><Skeleton className="h-8 w-14" /></div></div>)}</div></div>
    </div>
  </main></AccountShell>;
}
