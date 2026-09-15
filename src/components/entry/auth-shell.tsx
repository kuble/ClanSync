import type { ReactNode } from "react";
import { EntryBrand } from "./entry-brand";
import styles from "./entry.module.css";

export function AuthShell({ children, mode }: { children: ReactNode; mode: "sign-in" | "sign-up" }) {
  return (
    <main className={styles.authShell}>
      <div className={styles.authPanel}>
        <div className={styles.authBrand}><EntryBrand /></div>
        <div className={styles.authForm}>{children}</div>
      </div>
      <aside className={styles.authAside} aria-label="ClanSync 소개">
        <div className={styles.authAsideCopy}>
          <p className={styles.authTag}>STAY IN SYNC</p>
          <p className={styles.authStatement}>
            {mode === "sign-in" ? <>우리 클랜의 일정과 기록,<br />한곳에서 이어가세요.</> : <>함께하는 플레이,<br />함께 쌓아가는 기록.</>}
          </p>
          <p className={styles.authAsideDescription}>클랜 멤버 관리부터 내전 팀 편성, 일정과 스크림까지.<br />ClanSync에서 우리 클랜의 다음 경기를 준비하세요.</p>
          <span className={styles.authSignature}>Archive Your History, Stay in Sync</span>
        </div>
      </aside>
    </main>
  );
}
