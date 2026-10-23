"use client";

import Link from "next/link";
import { Shield, UserRound } from "lucide-react";
import { GameLogo } from "@/components/ui/game-logo";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import styles from "./profile.module.css";

export type ProfileMembership = { clanId: string; clanName: string; gameSlug: string; gameName: string; role: string; accountId?: string | null };

export function ProfileIdentity({ userId, intro, memberships, games, readOnly = false }: {
  userId: string; intro: string; memberships: (ProfileMembership & { showEmblems?: boolean })[]; games: { slug: string; nameKo: string }[]; readOnly?: boolean;
}) {
  return <section className={styles.playerIdentity} aria-label="플레이어 소개">
    <div className={styles.playerName}>
      <span className={styles.playerAvatar} aria-hidden="true"><UserRound size={30} strokeWidth={1.6} /></span>
      <div><h1 className="sr-only">플레이어 프로필</h1><p className={styles.identityGames}>{games.length ? games.map((game) => <span key={game.slug}><GameLogo slug={game.slug} name={game.nameKo} />{game.nameKo}</span>) : !readOnly ? "함께할 게임을 찾아보세요" : null}</p></div>
    </div>
    {readOnly ? intro && <p className={styles.visitorIntro}>{intro}</p> : <ProfileIntro initialIntro={intro} />}
    {memberships.length ? <div className={styles.clanProfiles}>
      <div className={styles.playerSectionLabel}><Shield size={14} aria-hidden="true" /><span>함께하는 클랜</span></div>
      {memberships.map((membership) => <article key={membership.clanId} className={styles.clanProfile} aria-label={`${membership.clanName} 클랜 프로필`}>
        <div className={styles.clanProfileGame}><GameLogo slug={membership.gameSlug} name={membership.gameName} /><span>{membership.gameName}</span><small>{membership.role === "leader" ? "클랜장" : membership.role === "officer" ? "운영진" : "멤버"}</small></div>
        <Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>
        <p className={styles.clanAccountId}><span>{membership.gameSlug === "overwatch" ? "배틀태그" : ["valorant", "lol"].includes(membership.gameSlug) ? "라이엇 ID" : "게임 ID"}</span><strong>{membership.accountId || "게임 계정 미연동"}</strong></p>
        {(!readOnly || membership.showEmblems) && <section className={styles.playerEmblems} aria-label="대표 엠블럼">
        <h2>대표 엠블럼</h2>
        <PersonalEmblemCaseLauncher variant="profile" gameSlug={membership.gameSlug} clanId={membership.clanId} userId={userId} nickname={membership.accountId || "플레이어"} />
        </section>}
      </article>)}
    </div> : !readOnly ? <div className={styles.playerClan}><p>클랜에서 함께한 기록이 이곳에 쌓입니다.</p><Link href="/games" className={styles.playerClanLink}>클랜 찾아보기</Link></div> : null}
  </section>;
}
