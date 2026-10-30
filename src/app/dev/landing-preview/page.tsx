import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, Users, MessagesSquare, ChartNoAxesCombined } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PreviewScreens } from "./preview-screens";
import styles from "./preview.module.css";

export const metadata: Metadata = { title: "랜딩 중앙형 시안 · ClanSync", robots: { index: false, follow: false } };

export default function LandingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <div className={styles.page}>
    <header className={styles.header}>
      <EntryBrand />
      <nav aria-label="계정 메뉴" className={styles.nav}><ThemeToggle /><Link href="/sign-in" className={styles.login}>로그인</Link><Link href="/sign-up" className={styles.smallButton}>시작하기 <ArrowRight size={14} aria-hidden="true" /></Link></nav>
    </header>
    <main>
      <section className={styles.hero} aria-labelledby="landing-title">
        <p className={styles.eyebrow}>우리 클랜을 위한 내전 운영</p>
        <h1 id="landing-title">팀 편성이 한결 편해지는<br /><span>우리 클랜의 내전 도구.</span></h1>
        <p className={styles.description}>참가자 모집부터 팀 편성과 조정까지, 한곳에서.<br className={styles.desktopBreak} /> ClanSync가 편성을 돕고, 운영진이 원하는 구성으로 마무리합니다.</p>
        <div className={styles.actions}><Link href="/sign-up" className={styles.primary}>무료로 시작하기 <ArrowRight size={17} aria-hidden="true" /></Link><a href="#formation-preview" className={styles.secondary}>서비스 화면 살펴보기 <ArrowDown size={15} aria-hidden="true" /></a></div>
      </section>
      <PreviewScreens />
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">내전 준비부터 클랜의 일상까지.</h2>
        <div className={styles.featureList}>
          <div><Users size={24} aria-hidden="true" /><h3>함께할 팀을 만들고</h3><p>참가자 모집과 팀 편성, 운영진의 마지막 조정까지 한곳에서 이어집니다.</p></div>
          <div id="clan-activity"><MessagesSquare size={24} aria-hidden="true" /><h3>우리만의 공간을 채우고</h3><p>일정·투표·Discord 알림으로 모이고, 게시판·사진·클랜 꾸미기로 일상을 나눕니다.</p></div>
          <div><ChartNoAxesCombined size={24} aria-hidden="true" /><h3>함께한 기록을 쌓습니다</h3><p>경기 결과부터 참여 추이·개인 승률·명예의 전당까지, 우리 클랜의 시간을 돌아봅니다.</p></div>
        </div>
      </section>
      <section id="games" className={styles.information} aria-labelledby="information-title">
        <h2 id="information-title">시작하기 전,<br />궁금한 점.</h2>
        <div className={styles.questions}>
          <details><summary>어떤 게임을 위한 도구인가요?</summary><p>오버워치 내전을 중심으로 참가자 모집·팀 편성·경기 기록을 제공합니다. 게임별 제공 기능은 다릅니다.</p></details>
          <details><summary>무료로 사용할 수 있나요?</summary><p>회원가입은 무료이며 기능에 따라 Free와 Premium으로 구분됩니다. Premium 구독 결제는 준비 중으로, 출시 시 요금과 이용 조건을 안내합니다.</p></details>
        </div>
      </section>
      <section className={styles.closing} aria-labelledby="closing-title"><div><h2 id="closing-title">다음 내전은, 조금 더 편하게.</h2><p>우리 클랜의 다음 만남을 ClanSync에서 준비해 보세요.</p></div><Link href="/sign-up" className={styles.primary}>무료로 시작하기 <ArrowRight size={17} aria-hidden="true" /></Link></section>
    </main>
    <footer className={styles.footer}><span>© 2026 ClanSync</span><nav aria-label="하단 메뉴"><a href="#formation-preview">서비스 화면</a><a href="#features">지원 기능</a><a href="#games">이용 안내</a></nav><span>Blizzard Entertainment와 공식 제휴 관계가 아닙니다.</span></footer>
  </div>;
}
