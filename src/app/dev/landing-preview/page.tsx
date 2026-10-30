import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ClanBalanceRosterEditor } from "@/components/main-clan/clan-balance-roster-editor";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "랜딩 중앙형 시안 · ClanSync",
  robots: { index: false, follow: false },
};

// Local examples only: the read-only editor never loads or changes a QA roster.
const pool = ["여울", "노을", "루나", "하루", "소다", "모카", "구름", "별빛", "라임", "우주", "단비", "나무"].map((nickname, index) => ({
  user_id: `landing-example-${index + 1}`, nickname,
}));
const roster: BalanceRoster = {
  team1: { tank: pool[0].user_id, dmg: [pool[1].user_id, pool[2].user_id], sup: [pool[3].user_id, pool[4].user_id] },
  team2: { tank: pool[5].user_id, dmg: [pool[6].user_id, pool[7].user_id], sup: [pool[8].user_id, pool[9].user_id] },
};
const scores = Object.fromEntries(pool.map(({ user_id }, index) => [user_id, { m: [3, 2, 1, 2, 1, 2, 3, 1, 1, 2, 1, 2][index], a: null }]));

export default function LandingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <EntryBrand />
        <nav aria-label="계정 메뉴" className={styles.nav}>
          <ThemeToggle />
          <Link href="/sign-in" className={styles.login}>로그인</Link>
          <Link href="/sign-up" className={styles.smallButton}>시작하기 <ArrowRight size={14} aria-hidden="true" /></Link>
        </nav>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <p className={styles.eyebrow}>우리 클랜을 위한 내전 운영</p>
          <h1 id="landing-title">팀 편성이 한결 편해지는<br /><span>우리 클랜의 내전 도구.</span></h1>
          <p className={styles.description}>참가자 모집부터 팀 편성과 조정까지, 한곳에서 진행할 수 있습니다.<br className={styles.desktopBreak} /> ClanSync가 편성을 돕고, 운영진이 원하는 구성으로 마무리합니다.</p>
          <div className={styles.actions}>
            <Link href="/sign-up" className={styles.primary}>무료로 시작하기 <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#formation-preview" className={styles.secondary}>편성 화면 살펴보기 <ArrowDown size={15} aria-hidden="true" /></a>
          </div>
        </section>
        <figure id="formation-preview" className={styles.preview} tabIndex={-1}>
          <div className={styles.product}>
            <div className={styles.productHeader}>
              <div><span className={styles.context}>오버워치 / 내전</span><h2>우리 클랜의 금요일 내전</h2></div>
              <span className={styles.status}>팀 편성</span>
            </div>
            <div className={styles.board}>
              <ClanBalanceRosterEditor
                gameSlug="overwatch" clanId="landing-example" sessionId="landing-example"
                revision={0} initialRoster={roster} pool={pool} canEdit={false}
                scores={scores} showPlayerCardInfo={false} showPlayerSessionSummary={false}
              />
            </div>
          </div>
          <figcaption><span>내전 편성 화면</span><span>실제 서비스 UI · 예시 명단 · 읽기 전용</span></figcaption>
        </figure>
      </main>
      <footer className={styles.footer}>ClanSync <span>중앙형 랜딩 · 첫 화면 시안</span></footer>
    </div>
  );
}
