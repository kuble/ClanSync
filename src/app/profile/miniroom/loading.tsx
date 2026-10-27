import Link from "next/link";
import { AccountShell } from "@/components/onboarding/account-shell";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "@/components/profile/housing.module.css";

export default function MiniroomLoading() {
  return <AccountShell context="기존 미니룸"><main className="mx-auto max-w-5xl p-6" aria-busy="true">
    <span role="status" className="sr-only">미니룸을 불러오는 중…</span>
    <Link href="/profile" className="text-sm underline">프로필로 돌아가기</Link><h1 className="my-4 text-xl font-semibold">기존 미니룸 보관함</h1><p className="mb-6 text-sm text-muted-foreground">기존 가구와 배치는 그대로 보관되어 있습니다.</p>
    <section className={styles.housing} aria-hidden="true"><div className={styles.scene}><Skeleton className="h-full w-full rounded-none" /></div></section>
  </main></AccountShell>;
}
