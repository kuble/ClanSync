import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ClanBalanceRosterEditor } from "@/components/main-clan/clan-balance-roster-editor";
import { RecordsPreview } from "./records-preview";
import { FormationModesPreview } from "./formation-modes-preview";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import styles from "./preview.module.css";
import { ClanActivityPreview } from "./clan-activity-preview";

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
const records: ClanArchiveMatch[] = ["부산", "왕의 길", "리장 타워"].map((mapLabel, index) => ({
  id: `landing-match-${index}`, seriesId: "landing-series", sessionNumber: 12, operatorName: "여울",
  sessionOpenedAt: "2026-10-30T11:00:00+09:00", matchType: "intra", mapLabel,
  playedAt: `2026-10-30T${12 + index}:00:00+09:00`, occurredAt: `2026-10-30T${12 + index}:00:00+09:00`,
  source: "balance", outcome: index === 1 ? "team2" : "team1", winnerTeam: index === 1 ? 2 : 1,
  players: pool.slice(0, 10).map(({ user_id, nickname }, player) => ({
    userId: user_id, nickname, team: player < 5 ? 1 : 2,
    role: player % 5 === 0 ? "tank" : player % 5 < 3 ? "dmg" : "sup", m: scores[user_id].m, a: null,
  })),
}));

export default function LandingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <EntryBrand />
        <nav aria-label="서비스 소개" className={styles.sectionNav}>
          <a href="#features">내전 기능</a>
          <a href="#records">기록과 통계</a>
          <a href="#clan-activity">클랜 활동</a>
        </nav>
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
          <p className={styles.description}>참가자 모집부터 팀 편성까지, 한곳에서.<br className={styles.desktopBreak} /> ClanSync가 편성을 돕고, 운영진이 마무리합니다.</p>
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
        <section id="features" className={styles.workflow} aria-labelledby="workflow-title">
          <div className={styles.sectionIntro}>
            <h2 id="workflow-title">팀을 나누고, 규칙을 정하고,<br /><span>함께 즐기는 내전.</span></h2>
            <p>편성부터 영웅 밴과 승부 예측까지, 한 흐름으로 준비해요.</p>
          </div>
          <FormationModesPreview />
          <p className={styles.previewNote}>실제 서비스 UI 일부 · 가상 데이터 · 읽기 전용</p>
        </section>
        <section id="records" className={styles.recordsSection} aria-labelledby="records-title">
          <div className={styles.recordsInner}>
            <div className={styles.sectionIntro}>
              <h2 id="records-title">경기가 끝나도,<br /><span>우리 클랜의 기록은 이어집니다.</span></h2>
              <p>클랜의 흐름부터 그날의 경기, 나의 성적까지 돌아보세요.</p>
            </div>
            <RecordsPreview records={records} />
            <p className={styles.previewNote}>실제 서비스 UI 일부 · 가상 데이터 · 읽기 전용</p>
          </div>
        </section>
        <ClanActivityPreview />
        <section id="games" className={styles.information} aria-labelledby="information-title">
          <h2 id="information-title">시작하기 전,<br />궁금한 점을 모았습니다.</h2>
          <dl>
            <div><dt>어떤 게임을 지원하나요?</dt><dd>현재는 오버워치를 지원해요. 앞으로 더 다양한 게임으로 지원 범위를 넓혀갈 예정이에요.</dd></div>
            <div><dt>회원가입은 무료인가요?</dt><dd>회원가입은 무료입니다. 기능에 따라 Free와 Premium으로 구분됩니다.</dd></div>
            <div><dt>Premium은 언제 이용할 수 있나요?</dt><dd>구독 결제는 준비 중입니다. 출시 시 요금과 이용 조건을 안내합니다.</dd></div>
          </dl>
        </section>
        <section className={styles.closing} aria-labelledby="closing-title">
          <h2 id="closing-title">다음 내전은,<br />조금 더 편하게 준비해 보세요.</h2>
          <p>함께할 다음 경기를 ClanSync에서.</p>
          <Link href="/sign-up" className={styles.primary}>무료로 시작하기 <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={styles.footer}><span>© 2026 ClanSync</span><nav aria-label="하단 메뉴"><a href="#features">지원 기능</a><a href="#clan-activity">클랜 활동</a><a href="#games">이용 안내</a><Link href="/sign-in">로그인</Link></nav><span>Blizzard Entertainment와 공식 제휴 관계가 아닙니다.</span></footer>
    </div>
  );
}
