import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Gamepad2, ShoppingBag, UserRound } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import styles from "./onboarding.module.css";

export function AccountShell({ children, context }: { children: ReactNode; context?: string }) {
  return <div className={styles.shell}>
    <header className={styles.navbar}><div className={styles.navbarInner}>
      <div className={styles.brandContext}><EntryBrand />{context && <span className={styles.contextLabel}>{context}</span>}</div>
      <nav aria-label="계정 메뉴"><Link href="/games" aria-label="게임 선택" title="게임 선택"><Gamepad2 size={16} aria-hidden="true" /><span className={styles.navLabel}>게임 선택</span></Link><Link href="/store" aria-label="개인 상점" title="개인 상점"><ShoppingBag size={16} aria-hidden="true" /><span className={styles.navLabel}>개인 상점</span></Link><Link href="/profile" aria-label="프로필" title="프로필"><UserRound size={16} aria-hidden="true" /><span className={styles.navLabel}>프로필</span></Link><ThemeToggle /></nav>
    </div></header>
    {children}
  </div>;
}

export function OnboardingSteps({ current }: { current: 2 | 3 }) {
  return <ol className={styles.steps} aria-label="클랜 참여 단계">
    {["게임 선택", "계정 연동", "클랜 참여"].map((label, index) => <li key={label} aria-current={index + 1 === current ? "step" : undefined} data-done={index + 1 < current}>
      <span>{index + 1 < current ? <Check size={13} aria-hidden="true" /> : index + 1}</span><strong>{label}</strong>
    </li>)}
  </ol>;
}
