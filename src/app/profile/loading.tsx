import { AccountShell } from "@/components/onboarding/account-shell";
import { ProfilePanels } from "@/components/profile/profile-panels";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "@/components/profile/profile.module.css";

export default function ProfileLoading() {
  return (
    <AccountShell context="프로필"><main className={styles.page} aria-busy="true">
      <span className="sr-only" role="status">프로필을 불러오는 중…</span>
      <ProfilePanels overview={<div className={styles.profileHero}><div className={styles.playerIdentity} aria-hidden="true">
        <div className={styles.identityMain}><h2 className={styles.identityHeading}>게임 프로필</h2><div className="space-y-3 rounded-xl border p-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-20 w-full" /><Skeleton className="h-13 w-full" /></div><div className="grid grid-cols-3 gap-3 border-t pt-5">{[0, 1, 2].map(index => <div className="space-y-2" key={index}><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-16" /></div>)}</div></div>
        <div className={styles.identityAside}><section className={styles.identityIntro}><h2 className={styles.identityHeading}>한 줄 소개</h2><Skeleton className="mt-2 min-h-22 w-full flex-1 rounded-xl" /></section><section className={styles.playerEmblems}><h2>대표 엠블럼</h2><Skeleton className="h-36 w-full max-w-[420px]" /></section></div>
      </div></div>} account={<div className={styles.accountLayout} aria-hidden="true"><Skeleton className="h-60 w-full" /><Skeleton className="h-96 w-full" /></div>} />
    </main></AccountShell>
  );
}
