"use client";
import { StatHelp } from "@/components/main-clan/stat-help";
import Link from "next/link";
import { useId, useState } from "react";
import { BadgeCheck, ChevronDown, CircleDashed } from "lucide-react";
import { GameLogo } from "@/components/ui/game-logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { getGameAuthConfig } from "@/lib/game-auth/game-auth-config";
import { ProfileGameAltAccounts, type AltAccountRow } from "./profile-game-alt-accounts";
import { ProfileClanMemberships } from "./profile-clan-memberships";
import { ProfileRolePreferences } from "./profile-role-preferences";
import type { ProfileMembership } from "./profile-identity";
import styles from "./profile.module.css";

export type DecorationGame = { gameId: string; slug: string; nameKo: string; accountId?: string; linked?: boolean; isActive?: boolean };
type Props = {
  games: DecorationGame[]; userId: string; verifiedGameIds: string[];
  memberships: ProfileMembership[];
  preferences: { game_id: string; ranking: string[] }[];
  altAccountsByGame: Record<string, { rows: AltAccountRow[]; disclosureLines: string[] }>;
};

export function ProfileGameDecorations(props: Props) {
  return <section className={styles.accountSection} aria-labelledby="games-title"><div className={styles.sectionHeader}><div><h2 aria-label="게임별 관리" id="games-title" className={styles.sectionHeading}><StatHelp title="게임별 관리">게임을 열어 계정과 클랜, 플레이 설정을 관리하세요.</StatHelp></h2></div></div>
    <div className={styles.gameList}>{props.games.map((game) => <GameAccount key={game.gameId} {...props} game={game} />)}</div>
  </section>;
}

function GameAccount({ game, userId, verifiedGameIds, memberships, preferences, altAccountsByGame }: Props & { game: DecorationGame }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const verified = verifiedGameIds.includes(game.gameId);
  const available = game.isActive !== false && Boolean(getGameAuthConfig(game.slug)?.oauthReady);
  const accountLabel = game.slug === "overwatch" ? "배틀태그" : game.slug === "valorant" || game.slug === "lol" ? "라이엇 ID" : "게임 계정";
  const clans = memberships.filter((item) => item.gameSlug === game.slug);
  return <section className={styles.gameAccount} aria-label={`${game.nameKo} 관리`}>
    <div className={styles.gameHeader}><button type="button" aria-label={`${game.nameKo} 게임 정보`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><GameLogo slug={game.slug} name={game.nameKo} /><span>{game.nameKo}</span>{verified ? <BadgeCheck size={16} className="text-primary" role="img" aria-label={`${game.nameKo} 계정 연동됨`} /> : <CircleDashed size={16} role="img" aria-label={`${game.nameKo} 계정 미연동`} className="text-muted-foreground" />}<ChevronDown size={16} className={styles.gameChevron} data-open={open} /></button>{available ? <Link href={`/games/${game.slug}/auth?next=/profile`} aria-label={`${game.nameKo} ${verified ? "계정 변경" : "계정 연결"}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{verified ? "계정 변경" : "계정 연결"}</Link> : <span className={styles.label}>연동 준비 중</span>}</div>
    <div id={id} hidden={!open} className={styles.gameContent}>
      {game.linked ? <div className={styles.gameCallout} aria-label={`${game.nameKo} 계정`}><div className={styles.mainAccount}><h3>{accountLabel}</h3><p>{game.accountId || `${accountLabel} 미등록`}</p></div>{verified && <ProfileGameAltAccounts gameId={game.gameId} gameSlug={game.slug} disclosureLines={altAccountsByGame[game.gameId]?.disclosureLines ?? []} initialRows={altAccountsByGame[game.gameId]?.rows ?? []} />}</div> : <p className={styles.sectionText}>{available ? "게임 계정을 연결하면 관련 정보를 관리할 수 있습니다." : "계정 연동이 제공되면 이곳에서 안내합니다."}</p>}
      {game.linked && <ProfileRolePreferences games={[game]} preferences={preferences.filter((item) => item.game_id === game.gameId)} />}
      {clans.length ? <ProfileClanMemberships rows={clans} userId={userId} /> : game.linked ? <Link href={`/games/${game.slug}/clan`} className={styles.gameDiscover}>함께할 클랜 찾기</Link> : null}
    </div>
  </section>;
}
