"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { GameLogo } from "@/components/ui/game-logo";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import styles from "./profile.module.css";

export type ProfileMembership = { clanId: string; clanName: string; gameSlug: string; gameName: string; role: string; accountId?: string | null };

export function ProfileIdentity({ userId, intro, memberships, readOnly = false }: {
  userId: string; intro: string; memberships: ProfileMembership[]; readOnly?: boolean;
}) {
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, memberships.length - 1));
  function showClan(index: number) {
    const card = track.current?.children[index] as HTMLElement | undefined;
    if (card) track.current?.scrollTo({ left: card.offsetLeft, behavior: "instant" });
  }
  return <section className={styles.playerIdentity} aria-label="플레이어 소개">
    {memberships.length ? <div className={styles.clanProfiles} role="region" aria-label="클랜 프로필" aria-roledescription="캐러셀">
      <h2 className={styles.identityHeading}>게임 프로필</h2>
      {memberships.length > 1 && <nav className={styles.clanNavigation} aria-label="게임별 클랜">
        {memberships.map((membership, index) => <button key={membership.clanId} type="button"
          aria-label={membership.gameName + " · " + membership.clanName} aria-controls={trackId}
          aria-current={index === current ? "page" : undefined}
          onClick={() => showClan(index)}><GameLogo slug={membership.gameSlug} name={membership.gameName} className="size-4" /><span>{membership.gameName}</span></button>)}
      </nav>}
      <div id={trackId} ref={track} className={styles.clanTrack} tabIndex={memberships.length > 1 ? 0 : undefined} aria-label="좌우로 넘겨 클랜 보기"
        onScroll={(event) => {
          const container = event.currentTarget;
          const cards = Array.from(container.children) as HTMLElement[];
          const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - container.scrollLeft) < Math.abs(cards[best].offsetLeft - container.scrollLeft) ? index : best, 0);
          setSelected(closest);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const index = event.key === "ArrowRight" ? Math.min(current + 1, memberships.length - 1) : event.key === "ArrowLeft" ? Math.max(current - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? memberships.length - 1 : null;
          if (index !== null) { event.preventDefault(); showClan(index); }
        }}>
      {memberships.map((membership, index) => <article key={membership.clanId} className={styles.clanProfile} aria-label={`${membership.clanName} 클랜 프로필`} aria-roledescription="슬라이드" aria-hidden={index !== current} inert={index !== current}>
        <div className={styles.clanProfileGame}><GameLogo slug={membership.gameSlug} name={membership.gameName} /><span>{membership.gameName}</span><small>{membership.role === "leader" ? "클랜장" : membership.role === "officer" ? "운영진" : "멤버"}</small></div>
        <Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>
        <p className={styles.clanAccountId}><span>{membership.gameSlug === "overwatch" ? "배틀태그" : ["valorant", "lol"].includes(membership.gameSlug) ? "라이엇 ID" : "게임 ID"}</span><strong>{membership.accountId || "게임 계정 미연동"}</strong></p>
      </article>)}
      </div>
      <span className="sr-only" role="status" aria-label="현재 클랜" aria-live="polite">{current + 1} / {memberships.length}</span>
    </div> : !readOnly ? <div className={styles.playerClan}><h2 className={styles.identityHeading}>게임 프로필</h2><p>클랜에서 함께한 기록이 이곳에 쌓입니다.</p><Link href="/games" className={styles.playerClanLink}>클랜 찾아보기</Link></div> : null}
    {(!readOnly || intro) && <section className={styles.identityIntro} aria-label="한 줄 소개"><h2 className={styles.identityHeading}>한 줄 소개</h2>{readOnly ? <p className={styles.visitorIntro}>{intro}</p> : <ProfileIntro initialIntro={intro} />}</section>}
    <section className={styles.playerEmblems} aria-label="대표 엠블럼">
      <h2>대표 엠블럼</h2>
      <PersonalEmblemCaseLauncher variant="profile" userId={userId} nickname="플레이어" />
    </section>
  </section>;
}
