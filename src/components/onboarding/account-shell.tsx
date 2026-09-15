import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Gamepad2, UserRound } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import styles from "./onboarding.module.css";

export function AccountShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.navbar}><div className={styles.navbarInner}>
      <EntryBrand />
      <nav aria-label="계정 메뉴"><Link href="/games"><Gamepad2 size={16} aria-hidden="true" />게임 선택</Link><Link href="/profile"><UserRound size={16} aria-hidden="true" />프로필</Link></nav>
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
