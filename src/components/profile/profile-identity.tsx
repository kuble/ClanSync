"use client";

import Link from "next/link";
import { useState } from "react";
import { Gamepad2, Shield } from "lucide-react";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import styles from "./profile.module.css";

export type ProfileMembership = { clanId: string; clanName: string; gameSlug: string; gameName: string; role: string };

export function ProfileIdentity({ userId, nickname, intro, memberships, games, readOnly = false }: {
  userId: string; nickname: string; intro: string; memberships: (ProfileMembership & { showEmblems?: boolean })[]; games: { slug: string; nameKo: string }[]; readOnly?: boolean;
}) {
  const [clanId, setClanId] = useState(memberships[0]?.clanId ?? "");
  const membership = memberships.find((item) => item.clanId === clanId) ?? memberships[0];
  return <section className={styles.playerIdentity} aria-label="플레이어 소개">
    <div className={styles.playerName}>
      <span className={styles.playerAvatar} aria-hidden="true">{Array.from(nickname)[0] || "P"}</span>
      <div><h1>{nickname}</h1><p className={styles.identityGames}>{games.length ? games.map((game) => <span key={game.slug}>{game.slug === "overwatch" ? <span className={styles.overwatchLogo} role="img" aria-label="오버워치 로고" /> : <Gamepad2 size={14} aria-hidden="true" />}{game.nameKo}</span>) : !readOnly ? "함께할 게임을 찾아보세요" : null}</p></div>
    </div>
    {readOnly ? intro && <p className={styles.visitorIntro}>{intro}</p> : <ProfileIntro initialIntro={intro} />}
    {membership ? <>
      <div className={styles.playerClan}>
        <div className={styles.playerSectionLabel}><Shield size={14} aria-hidden="true" /><span>함께하는 클랜</span></div>
        {memberships.length > 1 && <select aria-label="프로필 클랜 선택" value={membership.clanId} onChange={(event) => setClanId(event.target.value)}>{memberships.map((item) => <option key={item.clanId} value={item.clanId}>{item.clanName} · {item.gameName}</option>)}</select>}
        <Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>
        <p>{membership.gameName} · {membership.role === "leader" ? "클랜장" : membership.role === "officer" ? "운영진" : "멤버"}</p>
      </div>
      {(!readOnly || membership.showEmblems) && <section className={styles.playerEmblems} aria-label="대표 엠블럼">
        <h2>대표 엠블럼</h2>
        <PersonalEmblemCaseLauncher key={membership.clanId} variant="profile" gameSlug={membership.gameSlug} clanId={membership.clanId} userId={userId} nickname={nickname} />
      </section>}
    </> : !readOnly ? <div className={styles.playerClan}><p>클랜에서 함께한 기록이 이곳에 쌓입니다.</p><Link href="/games" className={styles.playerClanLink}>클랜 찾아보기</Link></div> : null}
  </section>;
}
