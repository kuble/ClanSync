"use client";

import Link from "next/link";
import { useState } from "react";
import { Gamepad2, Shield } from "lucide-react";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";
import { ProfileIntro } from "./profile-intro";
import styles from "./profile.module.css";

export type ProfileMembership = { clanId: string; clanName: string; gameSlug: string; gameName: string; role: string };

export function ProfileIdentity({ userId, nickname, intro, memberships, gameNames }: {
  userId: string; nickname: string; intro: string; memberships: ProfileMembership[]; gameNames: string[];
}) {
  const [clanId, setClanId] = useState(memberships[0]?.clanId ?? "");
  const membership = memberships.find((item) => item.clanId === clanId) ?? memberships[0];
  return <section className={styles.playerIdentity} aria-label="플레이어 소개">
    <div className={styles.playerName}>
      <span className={styles.playerAvatar} aria-hidden="true">{Array.from(nickname)[0] || "P"}</span>
      <div><h1>{nickname}</h1><p><Gamepad2 size={14} aria-hidden="true" />{gameNames.length ? gameNames.join(" · ") : "함께할 게임을 찾아보세요"}</p></div>
    </div>
    <ProfileIntro initialIntro={intro} />
    {membership ? <>
      <div className={styles.playerClan}>
        <div className={styles.playerSectionLabel}><Shield size={14} aria-hidden="true" /><span>함께하는 클랜</span></div>
        {memberships.length > 1 && <select aria-label="프로필 클랜 선택" value={membership.clanId} onChange={(event) => setClanId(event.target.value)}>{memberships.map((item) => <option key={item.clanId} value={item.clanId}>{item.clanName} · {item.gameName}</option>)}</select>}
        <Link href={`/games/${membership.gameSlug}/clan/${membership.clanId}`} className={styles.playerClanLink}>{membership.clanName}</Link>
        <p>{membership.gameName} · {membership.role === "leader" ? "클랜장" : membership.role === "officer" ? "운영진" : "멤버"}</p>
      </div>
      <section className={styles.playerEmblems} aria-label="내 엠블럼">
        <h2>대표 엠블럼</h2>
        <PersonalEmblemCaseLauncher key={membership.clanId} variant="profile" gameSlug={membership.gameSlug} clanId={membership.clanId} userId={userId} nickname={nickname} />
      </section>
    </> : <div className={styles.playerClan}><p>클랜에서 함께한 기록이 이곳에 쌓입니다.</p><Link href="/games" className={styles.playerClanLink}>클랜 찾아보기</Link></div>}
  </section>;
}
