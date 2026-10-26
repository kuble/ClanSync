"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { GameLogo } from "@/components/ui/game-logo";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import { ProfileNamecard } from "./profile-namecard";
import { Namecard } from "./namecard";
import type { NamecardAppearance, NamecardResult } from "@/lib/profile/namecard";
import styles from "./profile.module.css";

export type ProfileGameIdentity = { gameSlug: string; gameName: string; accountId?: string | null };
export type ProfileMembership = ProfileGameIdentity & { clanId: string; clanName: string; role: string };
type ProfileSlide = ProfileGameIdentity & Partial<Pick<ProfileMembership, "clanId" | "clanName" | "role">>;

export function ProfileIdentity({ userId, intro, memberships, games = [], namecard, readOnly = false, children }: {
  userId: string; intro: string; memberships: ProfileMembership[]; games?: ProfileGameIdentity[]; namecard?: NamecardResult; readOnly?: boolean; children?: ReactNode;
}) {
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const profiles: ProfileSlide[] = [...memberships, ...games.filter((game) => !memberships.some((membership) => membership.gameSlug === game.gameSlug))];
  const current = Math.min(selected, Math.max(0, profiles.length - 1));
  function showClan(index: number) {
    const card = track.current?.children[index] as HTMLElement | undefined;
    if (card) track.current?.scrollTo({ left: card.offsetLeft, behavior: "instant" });
  }
  const gameProfiles = (appearance?: NamecardAppearance, tools?: ReactNode) => profiles.length ? <div className={styles.clanProfiles} role="region" aria-label="클랜 프로필" aria-roledescription="캐러셀">
      {!namecard && <h2 className={styles.identityHeading}>게임 프로필</h2>}
      {profiles.length > 1 && <nav className={styles.clanNavigation} aria-label="게임별 클랜">
        {profiles.map((membership, index) => <button key={membership.clanId ?? membership.gameSlug} type="button"
          aria-label={membership.gameName + (membership.clanName ? " · " + membership.clanName : "")} aria-controls={trackId}
          aria-current={index === current ? "page" : undefined}
          onClick={() => showClan(index)}><GameLogo slug={membership.gameSlug} name={membership.gameName} className="size-4" /><span>{membership.gameName}</span></button>)}
      </nav>}
      <div id={trackId} ref={track} className={styles.clanTrack} tabIndex={profiles.length > 1 ? 0 : undefined} aria-label="좌우로 넘겨 클랜 보기"
        onScroll={(event) => {
          const container = event.currentTarget;
          const cards = Array.from(container.children) as HTMLElement[];
          const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - container.scrollLeft) < Math.abs(cards[best].offsetLeft - container.scrollLeft) ? index : best, 0);
          setSelected(closest);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const index = event.key === "ArrowRight" ? Math.min(current + 1, profiles.length - 1) : event.key === "ArrowLeft" ? Math.max(current - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? profiles.length - 1 : null;
          if (index !== null) { event.preventDefault(); showClan(index); }
        }}>
      {profiles.map((membership, index) => <article key={membership.clanId ?? membership.gameSlug} className={styles.clanProfile} aria-label={`${membership.clanName ?? membership.gameName} 클랜 프로필`} aria-roledescription="슬라이드" aria-hidden={index !== current} inert={index !== current}>
        {(membership.clanId || (index === current && tools)) && <div className={styles.clanProfileHeading}>
          {membership.clanId && <div className={styles.clanProfileName}><Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>{membership.role && <small>{membership.role === "leader" ? "클랜장" : membership.role === "officer" ? "운영진" : "멤버"}</small>}</div>}
          {index === current && tools}
        </div>}
        <div className={styles.clanAccountId}><span>{membership.gameSlug === "overwatch" ? "배틀태그" : ["valorant", "lol"].includes(membership.gameSlug) ? "라이엇 ID" : "게임 ID"}</span>{appearance ? <Namecard displayName={membership.accountId || "Player"} {...appearance} /> : <strong>{membership.accountId || "게임 계정 미연동"}</strong>}</div>
      </article>)}
      </div>
      <span className="sr-only" role="status" aria-label="현재 클랜" aria-live="polite">{current + 1} / {profiles.length}</span>
    </div> : !readOnly ? <div className={styles.playerClan}>{!namecard && <h2 className={styles.identityHeading}>게임 프로필</h2>}{tools && <div className={styles.clanProfileHeading}>{tools}</div>}{appearance && <Namecard displayName="Player" {...appearance} />}<p>클랜에서 함께한 기록이 이곳에 쌓입니다.</p><Link href="/games" className={styles.playerClanLink}>클랜 찾아보기</Link></div> : null;
  return <section className={styles.playerIdentity} data-read-only={readOnly || undefined} aria-label="플레이어 소개">
    {(profiles.length > 0 || !readOnly) && <div className={styles.identityMain}>
      {namecard && !readOnly ? <ProfileNamecard initial={namecard} displayName={profiles[current]?.accountId || "Player"}>{gameProfiles}</ProfileNamecard> : gameProfiles()}
      {children}
    </div>}
    <div className={styles.identityAside}>
    {(!readOnly || intro) && <section className={styles.identityIntro} aria-label="한 줄 소개"><h2 className={styles.identityHeading}>한 줄 소개</h2>{readOnly ? <p className={styles.visitorIntro}>{intro}</p> : <ProfileIntro initialIntro={intro} />}</section>}
    <section className={styles.playerEmblems} aria-label="대표 엠블럼">
      <h2>대표 엠블럼</h2>
      <PersonalEmblemCaseLauncher variant="profile" userId={userId} nickname="플레이어" />
    </section>
    </div>
  </section>;
}
