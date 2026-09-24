import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { LandingFeatures } from "@/components/entry/landing-features";
import styles from "@/components/entry/entry.module.css";

export default function RootPage() {
  return (
    <div className={styles.landing}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <EntryBrand href="/" />
          <nav className={styles.navLinks} aria-label="서비스 소개">
            <a href="#features">지원 기능</a>
            <a href="#games">지원 게임</a>
            <a href="#pricing">요금제</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/sign-in" className={styles.ghostButton}>로그인</Link>
            <Link href="/sign-up" className={styles.button}>가입하기</Link>
          </div>
        </div>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <div className={styles.portalTopline}><span>CLANSYNC / ENTRANCE</span><span>THE CLAN PORTAL ↗</span></div>
            <div className={styles.portalMasthead}><span>PORTAL</span><small>BY<br />CLAN<br />SYNC</small></div>
            <div className={styles.portalTicker}><span>✳</span><span>YOUR CLAN, IN SYNC</span><span>▨</span><span>LOBBY / MATCH / ARCHIVE</span><span>↗</span></div>
            <div className={styles.portalScene}>
              <Image src="/images/portal-night-alley.png" alt="푸른 조명 아래 함께 서 있는 두 클랜원" fill priority sizes="(max-width: 880px) 100vw, 540px" />
              <div className={styles.portalSceneContent}>
                <span className={styles.portalEyebrow}>다음 경기가 시작되는 곳</span>
                <h1 id="landing-title" className={styles.heroTitle}><span className="sr-only">ClanSync — </span>함께한 순간을<br />다음 경기로 잇다.</h1>
                <p className={styles.heroSubtitle}>멤버를 모으고 팀을 편성하세요. 경기의 기록까지 한곳에서 이어집니다.</p>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Link href="/sign-up" className={styles.button}>클랜 시작하기 <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/sign-in" className={styles.secondaryButton}>로그인</Link>
            </div>
            <div className={styles.portalMainFooter}><span>CLAN MANAGEMENT</span><span>TEAM FORMATION</span><span>MATCH HISTORY</span></div>
          </div>
          <div className={styles.portalSide}>
            <div className={styles.portalTopline}><span>CLANSYNC / INSIDE</span><span>02 / 02</span></div>
            <div className={styles.portalSideStory}>
              <div className={styles.portalSidePhoto}><Image src="/images/portal-night-alley.png" alt="" fill sizes="(max-width: 880px) 65vw, 330px" /></div>
              <div className={styles.portalSideRail}>
                <div><span>01 / GATHER</span><strong>멤버를<br />모으고</strong></div>
                <div><span>02 / BALANCE</span><strong>팀을<br />나누고</strong></div>
                <div><span>03 / ARCHIVE</span><strong>경기를<br />기록하다</strong></div>
              </div>
            </div>
            <div className={styles.portalPreviewHeading}><span>INSIDE THE PORTAL</span><span>하나로 이어지는 클랜 활동</span></div>
            <div className={styles.portalBrief}>
              <span aria-hidden="true" className={styles.portalOrbit} />
              <div><p>내전 로비부터 경기 통계까지,<br />우리 클랜의 흐름을 한곳에.</p><a href="#features">지원 기능 보기 <ArrowRight size={14} aria-hidden="true" /></a></div>
              <span aria-hidden="true" className={styles.portalTriangle} />
            </div>
          </div>
        </section>
        <LandingFeatures />
        <section id="games" className={styles.section}>
          <h2 className={styles.sectionTitle}>지원 게임</h2>
          <div className={styles.supportedGames}>
            <article className={styles.supportedGame}><span className={styles.gameMonogram} aria-hidden="true">OW</span><div><h3>Overwatch</h3><p>클랜 관리 · 내전 · 스크림</p></div></article>
            <article className={styles.supportedGame}><span className={styles.gameMonogram} aria-hidden="true">VAL</span><div><h3>Valorant</h3><p>지원 예정</p></div></article>
            <article className={styles.supportedGame}><span className={styles.gameMonogram} aria-hidden="true">LOL</span><div><h3>League of Legends</h3><p>지원 예정</p></div></article>
          </div>
        </section>
        <section id="pricing" className={styles.section}>
          <h2 className={styles.sectionTitle}>요금제</h2>
          <div className={styles.pricingGrid}>
            <article className={styles.pricingCard}>
              <h3>Free</h3><p className={styles.price}>₩0</p><p className={styles.pricingNote}>회원가입 무료</p>
              <ul className={styles.pricingList}>
                {["클랜과 멤버 관리", "내전 기록과 통계", "일정과 투표", "스크림 모집과 매칭", "함께할 팀원 찾기"].map((feature) => <li key={feature}><Check size={15} aria-hidden="true" />{feature}</li>)}
              </ul>
            </article>
            <article className={styles.pricingCard}>
              <h3>Premium</h3><p className={styles.premiumPrice}>출시 준비 중</p><p className={styles.pricingNote}>구독 결제는 준비 중입니다. 출시 시 요금과 이용 조건을 안내합니다.</p>
              <ul className={styles.pricingList}>
                {["Free의 모든 기능", "확장된 내전 운영 도구", "밴픽과 이벤트 대진표", "디스코드 연동 설정"].map((feature) => <li key={feature}><Check size={15} aria-hidden="true" />{feature}</li>)}
              </ul>
            </article>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <nav className={styles.footerLinks} aria-label="하단 메뉴"><a href="#features">지원 기능</a><a href="#games">지원 게임</a><Link href="/sign-up">ClanSync 시작하기</Link></nav>
        <p>© {new Date().getFullYear()} ClanSync. All rights reserved.</p>
        <p>ClanSync는 Blizzard Entertainment와 공식 제휴 관계가 아닙니다.</p>
      </footer>
    </div>
  );
}
