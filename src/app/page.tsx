import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EntryBrand } from "@/components/entry/entry-brand";
import { LandingPreview } from "@/components/entry/landing-preview";
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
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}><span className="sr-only">ClanSync — </span><span>Archive Your History,</span><em>Stay in Sync</em></h1>
            <p className={styles.heroSubtitle}>추억을 기록하고 클랜을 체계적으로 관리하세요.</p>
            <div className={styles.heroActions}>
              <Link href="/sign-in" className={styles.secondaryButton}>로그인</Link>
              <Link href="/sign-up" className={styles.button}>가입하기 <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <LandingPreview />
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
