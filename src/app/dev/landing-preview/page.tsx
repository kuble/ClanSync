import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, Check, Users, Shuffle, History } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ClanBalanceRosterEditor } from "@/components/main-clan/clan-balance-roster-editor";
import { BalanceTeamSummary } from "@/components/main-clan/balance-team-summary";
import { ClanStatsArchive } from "@/components/main-clan/clan-stats-archive";
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
            <h2 id="workflow-title">내전 한 번을 열기까지,<br />챙길 일을 한곳에 모았습니다.</h2>
            <p>참가자를 모으고, 팀을 나누고,<br className={styles.desktopBreak} /> 경기 결과를 남겨보세요.</p>
          </div>
          <div className={styles.preparation}>
            <div className={styles.featureCopy}>
              <Users size={25} aria-hidden="true" />
              <h3>오늘 함께할 멤버를<br />한눈에.</h3>
              <p>출전·대기 명단을 정리해 다음 경기를 준비해 보세요.</p>
              <ul><li><Check size={16} aria-hidden="true" />참가자 검색</li><li><Check size={16} aria-hidden="true" />출전·대기 명단 관리</li></ul>
            </div>
            <figure className={styles.peopleExample}>
              <div className={styles.exampleHeading}><strong>오늘 함께할 멤버</strong><span>12명</span></div>
              <ul className={styles.peopleList}>{pool.map((person, index) => <li key={person.user_id}>
                <span className={styles.personSymbol} aria-hidden="true">{person.nickname.slice(0, 1)}</span>
                <span>{person.nickname}</span><small className={index < 10 ? styles.assigned : styles.waiting}>{index < 10 ? "출전" : "대기"}</small>
              </li>)}</ul>
              <figcaption>출전 10명 · 대기 2명<span>예시 명단</span></figcaption>
            </figure>
          </div>
          <div className={styles.adjustment}>
            <div className={styles.featureCopy}>
              <Shuffle size={25} aria-hidden="true" />
              <h3>팀을 나누고,<br />우리 클랜에 맞게 조정합니다.</h3>
              <p>평가 점수를 비교하고, 같은 역할끼리 교환해 보세요.</p>
            </div>
            <figure className={styles.comparison}>
              <div className={styles.exampleHeading}><strong>양 팀의 평가 점수</strong><span>팀 비교</span></div>
              <div className={styles.comparisonBoard}><BalanceTeamSummary roster={roster} scores={scores} mode="m" premium={false} enabled={false} /></div>
              <div className={styles.teamRoles}>{[1, 2].map((team) => <div key={team}><strong>{team}팀</strong><p>탱커 1 · 딜러 2 · 힐러 2</p></div>)}</div>
              <figcaption>점수는 편성을 돕는 참고 기준입니다.<span>예시 점수</span></figcaption>
            </figure>
          </div>
        </section>
        <section className={styles.recordsSection} aria-labelledby="records-title">
          <div className={styles.recordsInner}>
            <div className={styles.sectionIntro}>
              <History size={26} aria-hidden="true" />
              <h2 id="records-title">경기가 끝나도,<br />우리 클랜의 기록은 이어집니다.</h2>
              <p>팀 구성과 승패부터<br className={styles.desktopBreak} /> 멤버별 성적까지 한눈에.</p>
            </div>
            <div className={styles.archive}>
              <ClanStatsArchive archive={{ datesKst: ["2026-10-30"], sampleByDate: { "2026-10-30": records } }} />
            </div>
            <p className={styles.exampleNote}>예시 기록 · 경기 넘김과 멤버별 정렬을 체험해 보세요.</p>
          </div>
        </section>
        <ClanActivityPreview />
        <section id="games" className={styles.information} aria-labelledby="information-title">
          <h2 id="information-title">시작하기 전,<br />궁금한 점을 모았습니다.</h2>
          <dl>
            <div><dt>어떤 게임을 위한 도구인가요?</dt><dd>오버워치 중심의 클랜 운영 도구입니다. 지원 기능은 게임별로 다릅니다.</dd></div>
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
