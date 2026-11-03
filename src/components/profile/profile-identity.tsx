"use client";

import { useTranslator } from "#use-translator";
import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, ShieldX, UsersRound } from "lucide-react";
import { GameLogo } from "@/components/ui/game-logo";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import { ProfileNamecard } from "./profile-namecard";
import { Namecard } from "./namecard";
import { ProfileAltAccountsEditor } from "./profile-alt-accounts-editor";
import type { NamecardAppearance, NamecardResult } from "@/lib/profile/namecard";
import styles from "./profile.module.css";

export type ProfileGameIdentity = { gameSlug: string; gameName: string; accountId?: string | null; isVerified?: boolean; altAccounts?: string[]; canManageAlts?: boolean };
export type ProfileMembership = ProfileGameIdentity & { clanId: string; clanName: string; role: string };
type ProfileSlide = ProfileGameIdentity & Partial<Pick<ProfileMembership, "clanId" | "clanName" | "role">>;

export function ProfileIdentity({ userId, intro, memberships, games = [], namecard, publicAppearance, readOnly = false, introPlaceholder, emblemCase, children, onAltAccountsChanged }: {
  userId: string; intro: string; memberships: ProfileMembership[]; games?: ProfileGameIdentity[]; namecard?: NamecardResult; publicAppearance?: NamecardAppearance; readOnly?: boolean; introPlaceholder?: ReactNode; emblemCase?: ReactNode; children?: ReactNode; onAltAccountsChanged?: () => void;
}) {
  const tx = useTranslator();
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const profiles: ProfileSlide[] = [...memberships, ...games.filter((game) => !memberships.some((membership) => membership.gameSlug === game.gameSlug))];
  const current = Math.min(selected, Math.max(0, profiles.length - 1));
  function showClan(index: number) {
    const card = track.current?.children[index] as HTMLElement | undefined;
    if (card) track.current?.scrollTo({ left: card.offsetLeft, behavior: "instant" });
  }
  const gameProfiles = (appearance = publicAppearance, tools?: ReactNode) => profiles.length ? <div className={styles.clanProfiles} role="region" aria-label={tx("클랜 프로필")} aria-roledescription="캐러셀">
      {!namecard && <div className={styles.identityHeader}><h2 className={styles.identityHeading}>{tx("게임 프로필")}</h2>{readOnly && <div className={styles.gameVerification} aria-label={tx("{0} 계정 인증 상태", profiles[current].gameName)}>
        {profiles[current].accountId && profiles[current].isVerified ? <BadgeCheck size={14} aria-hidden="true" /> : <ShieldX size={14} aria-hidden="true" />}
        <span>{!profiles[current].accountId ? tx("미등록") : profiles[current].isVerified === undefined ? tx("인증 확인 중") : profiles[current].isVerified ? tx("인증됨") : tx("미인증")}</span>
      </div>}</div>}
      {profiles.length > 1 && <nav className={styles.clanNavigation} aria-label={tx("게임별 클랜")}>
        {profiles.map((membership, index) => <button key={membership.clanId ?? membership.gameSlug} type="button"
          aria-label={membership.gameName + (membership.clanName ? " · " + membership.clanName : "")} aria-controls={trackId}
          aria-current={index === current ? "page" : undefined}
          onClick={() => showClan(index)}><GameLogo slug={membership.gameSlug} name={membership.gameName} className="size-4" /><span>{tx(membership.gameName)}</span></button>)}
      </nav>}
      <div id={trackId} ref={track} className={styles.clanTrack} tabIndex={profiles.length > 1 ? 0 : undefined} aria-label={tx("좌우로 넘겨 클랜 보기")}
        onScroll={(event) => {
          const container = event.currentTarget;
          if (!container.clientWidth) return;
          const cards = Array.from(container.children) as HTMLElement[];
          const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - container.scrollLeft) < Math.abs(cards[best].offsetLeft - container.scrollLeft) ? index : best, 0);
          setSelected(closest);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const index = event.key === "ArrowRight" ? Math.min(current + 1, profiles.length - 1) : event.key === "ArrowLeft" ? Math.max(current - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? profiles.length - 1 : null;
          if (index !== null) { event.preventDefault(); showClan(index); }
        }}>
      {profiles.map((membership, index) => <article key={membership.clanId ?? membership.gameSlug} className={styles.clanProfile} aria-label={tx("{0} 클랜 프로필", membership.clanName ?? membership.gameName)} aria-roledescription="슬라이드" aria-hidden={index !== current} inert={index !== current}>
        {(membership.clanId || (index === current && tools)) && <div className={styles.clanProfileHeading}>
          {membership.clanId && <div className={styles.clanProfileName}><Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>{membership.role && <small>{membership.role === "leader" ? tx("클랜장") : membership.role === "officer" ? tx("운영진") : tx("멤버")}</small>}</div>}
          {index === current && tools}
        </div>}
        <div className={styles.clanAccountId}><Namecard displayName={membership.accountId || "Player"} {...appearance} /></div>
        {(!readOnly || namecard) && <div className={styles.gameVerification} aria-label={tx("{0} 계정 인증 상태", membership.gameName)}>
          {membership.accountId && membership.isVerified ? <BadgeCheck size={14} aria-hidden="true" /> : <ShieldX size={14} aria-hidden="true" />}
          <span>{!membership.accountId ? tx("미등록") : membership.isVerified === undefined ? tx("인증 확인 중") : membership.isVerified ? tx("인증됨") : tx("미인증")}</span>
          {!readOnly && (membership.isVerified === false || (!membership.accountId && membership.isVerified === undefined)) && <Link href={`/games/${membership.gameSlug}/auth?reauth=1&next=/profile`}>{membership.accountId ? tx("게임 ID 수정") : membership.gameSlug === "overwatch" ? tx("배틀태그 입력") : tx("게임 ID 입력")}</Link>}
        </div>}
        <div className={styles.profileAlts} role="region" aria-label={tx("부계정")} tabIndex={0} data-empty={!membership.altAccounts?.length || undefined} data-editable={membership.canManageAlts || undefined}><span><UsersRound size={14} aria-hidden="true" />{tx("부계정")}</span><div>{membership.altAccounts?.length ? membership.altAccounts.map(nickname => <span key={nickname} className={styles.altTag}>{nickname}</span>) : <span className={styles.altEmpty}>{membership.altAccounts === undefined ? tx("불러오는 중…") : readOnly ? tx("공개된 부계정 없음") : tx("등록된 부계정 없음")}</span>}</div>{membership.canManageAlts && <ProfileAltAccountsEditor key={userId + membership.gameSlug} gameSlug={membership.gameSlug} onChanged={onAltAccountsChanged} />}</div>
      </article>)}
      </div>
      <span className="sr-only" role="status" aria-label={tx("현재 클랜")} aria-live="polite">{current + 1} / {profiles.length}</span>
    </div> : <div className={styles.playerClan}>{!namecard && <h2 className={styles.identityHeading}>{tx("게임 프로필")}</h2>}{tools && <div className={styles.clanProfileHeading}>{tools}</div>}<Namecard displayName="Player" {...appearance} /><div className={styles.gameVerification}><ShieldX size={14} aria-hidden="true" /><span>{tx("게임 ID 미등록")}</span>{!readOnly && <Link href="/games">{tx("게임 ID 입력")}</Link>}</div>{!readOnly && <><p>{tx("클랜에서 함께한 기록이 이곳에 쌓입니다.")}</p><Link href="/games" className={styles.playerClanLink}>{tx("클랜 찾아보기")}</Link></>}</div>;
  return <section className={styles.playerIdentity} data-read-only={readOnly || undefined} aria-label={tx("플레이어 소개")}>
    <div className={styles.identityMain}>
      {namecard && !readOnly ? <ProfileNamecard initial={namecard} displayName={profiles[current]?.accountId || "Player"}>{gameProfiles}</ProfileNamecard> : gameProfiles()}
      {children}
    </div>
    <div className={styles.identityAside}>
    <section className={styles.identityIntro} aria-label={tx("한 줄 소개")}><h2 className={styles.identityHeading}>{tx("한 줄 소개")}</h2>{readOnly ? <div className={styles.visitorIntro} data-profile-intro tabIndex={0}>{introPlaceholder ?? (intro || tx("아직 작성한 소개가 없습니다."))}</div> : <ProfileIntro initialIntro={intro} />}</section>
    <section className={styles.playerEmblems} aria-label={tx("대표 엠블럼")}>
      <h2>{tx("대표 엠블럼")}</h2>
      {emblemCase ?? <PersonalEmblemCaseLauncher variant="profile" userId={userId} nickname="플레이어" />}
    </section>
    </div>
  </section>;
}
