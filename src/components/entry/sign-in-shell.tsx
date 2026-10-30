import type { ReactNode } from "react";
import { EntryBrand } from "./entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MemoryPhoto } from "@/components/main-clan/memory-photo";
import styles from "./sign-in.module.css";

export function SignInShell({ children }: { children: ReactNode }) {
  return <div className={styles.page}>
    <header className={styles.header}><EntryBrand /><ThemeToggle /></header>
    <main className={styles.content}>
      <section className={styles.card} aria-labelledby="sign-in-title">{children}</section>
      <aside className={styles.story} aria-label="ClanSync 소개">
        <h2>우리 클랜의 다음 경기,<br /><span>여기서 이어가세요.</span></h2>
        <p>팀을 나누고, 경기를 기록하고,<br />다음에 만날 시간을 정해보세요.</p>
        <figure className={styles.album}>
          <div className={styles.photos}>
            <MemoryPhoto src="/images/overwatch/maps/busan.webp" caption="금요일 내전 · 부산" eager />
            <MemoryPhoto src="/images/overwatch/maps/kings-row.webp" caption="다음엔 왕의 길에서" eager />
          </div>
          <figcaption>함께한 순간을 모으는 클랜 앨범 · 예시 화면</figcaption>
        </figure>
      </aside>
    </main>
    <footer className={styles.footer}>© {new Date().getFullYear()} ClanSync</footer>
  </div>;
}
