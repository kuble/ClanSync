"use client";
import { useTranslator } from "#use-translator";
import { StatHelp } from "@/components/main-clan/stat-help";
import Link from "next/link";
import { useId, useState } from "react";
import { BadgeCheck, ChevronDown, CircleDashed } from "lucide-react";
import { GameLogo } from "@/components/ui/game-logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { getGameAuthConfig } from "@/lib/game-auth/game-auth-config";
import { ProfileClanMemberships } from "./profile-clan-memberships";
import { ProfileRolePreferences } from "./profile-role-preferences";
import type { ProfileMembership } from "./profile-identity";
import styles from "./profile.module.css";

export type DecorationGame = { gameId: string; slug: string; nameKo: string; accountId?: string; isVerified?: boolean; linked?: boolean; isActive?: boolean };
type Props = {
  games: DecorationGame[]; userId: string; verifiedGameIds: string[];
  memberships: ProfileMembership[];
  preferences: { game_id: string; ranking: string[] }[];
};

export function ProfileGameDecorations(props: Props) {
  const tx = useTranslator();
  return <section className={styles.accountSection} aria-labelledby="games-title"><div className={styles.sectionHeader}><div><h2 aria-label={tx("게임별 관리")} id="games-title" className={styles.sectionHeading}><StatHelp title={tx("게임별 관리")}>{tx("게임을 열어 계정과 클랜, 플레이 설정을 관리하십시오.")}</StatHelp></h2></div></div>
    <div className={styles.gameList}>{props.games.map((game) => <GameAccount key={game.gameId} {...props} game={game} />)}</div>
  </section>;
}

function GameAccount({ game, userId, verifiedGameIds, memberships, preferences }: Props & { game: DecorationGame }) {
  const tx = useTranslator();
  const [open, setOpen] = useState(false);
  const id = useId();
  const verified = verifiedGameIds.includes(game.gameId);
  const available = game.isActive !== false && Boolean(getGameAuthConfig(game.slug)?.oauthReady);
  const clans = memberships.filter((item) => item.gameSlug === game.slug);
  return <section className={styles.gameAccount} aria-label={tx("{0} 관리", game.nameKo)}>
    <div className={styles.gameHeader}><button type="button" aria-label={tx("{0} 게임 정보", game.nameKo)} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><GameLogo slug={game.slug} name={game.nameKo} /><span>{tx(game.nameKo)}</span>{verified ? <BadgeCheck size={16} className="text-primary" role="img" aria-label={tx("{0} 계정 인증됨", game.nameKo)} /> : <CircleDashed size={16} role="img" aria-label={`${game.nameKo} ${game.accountId ? "계정 미인증" : "게임 ID 미등록"}`} className="text-muted-foreground" />}<ChevronDown size={16} className={styles.gameChevron} data-open={open} /></button>{available ? <Link href={`/games/${game.slug}/auth?reauth=1&next=/profile`} aria-label={`${game.nameKo} ${game.accountId ? "게임 ID 수정" : "게임 ID 입력"}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{verified ? tx("계정 변경") : tx("계정 연결")}</Link> : <span className={styles.label}>{tx("연동 준비 중")}</span>}</div>
    <div id={id} hidden={!open} className={styles.gameContent}>
      {!game.linked && <p className={styles.sectionText}>{available ? tx("게임 계정을 연결하면 관련 정보를 관리할 수 있습니다.") : tx("계정 연동이 제공되면 이곳에서 안내합니다.")}</p>}
      {game.linked && <ProfileRolePreferences games={[game]} preferences={preferences.filter((item) => item.game_id === game.gameId)} />}
      {clans.length ? <ProfileClanMemberships rows={clans} userId={userId} /> : game.linked ? <Link href={`/games/${game.slug}/clan`} className={styles.gameDiscover}>{tx("함께할 클랜 찾기")}</Link> : null}
    </div>
  </section>;
}
