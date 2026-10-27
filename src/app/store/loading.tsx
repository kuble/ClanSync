import Link from "next/link";
import { AccountShell } from "@/components/onboarding/account-shell";
import { Skeleton } from "@/components/ui/skeleton";
import pageStyles from "@/components/profile/profile.module.css";
import styles from "@/components/store/personal-store.module.css";

export default function StoreLoading() {
  return <AccountShell context="개인 상점"><main className={pageStyles.page} aria-busy="true">
    <span className="sr-only" role="status">상점 디자인을 불러오는 중…</span>
    <div className={styles.shop}>
      <header className={styles.header}><div><Link href="/profile" className={styles.back}>내 프로필</Link><h1>네임카드 상점</h1><p>디자인을 비교하고, 나만의 조합을 완성하세요.</p></div><div className={styles.wallet}><div><span>내 코인</span><Skeleton className="h-8 w-16" /></div></div></header>
      <section className={styles.current}><Skeleton className="h-[86px] w-full rounded-xl" /><div className={styles.previewControls}><Skeleton className="h-8 w-16" /></div></section>
      <div className={styles.catalog} aria-hidden="true"><div className={styles.filters}><Skeleton className="h-10 w-full max-w-md" /><div className={styles.tools}><Skeleton className="h-10 w-80 max-w-full" /></div></div><div className={styles.results}><Skeleton className="h-4 w-32" /></div><div className={styles.grid} data-layout="mixed">{Array.from({ length: 6 }, (_, i) => <div className={styles.product} key={i}><div className={styles.productHeading}><Skeleton className="h-5 w-32" /></div><div className={styles.preview}><Skeleton className="h-[86px] w-full rounded-xl" /></div><div className={styles.productFooter}><Skeleton className="h-4 w-16" /><Skeleton className="h-8 w-14" /></div></div>)}</div></div>
    </div>
  </main></AccountShell>;
}
