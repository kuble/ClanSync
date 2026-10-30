"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { GameLogo } from "@/components/ui/game-logo";
import type { GameCardState } from "@/lib/routing/game-card-router";
import { buildGameCardHref } from "@/lib/routing/game-card-router";
import styles from "@/components/entry/entry.module.css";

function statusLabel(card: GameCardState): { dot: string; text: string } {
  if (card.disabled) return { dot: "bg-zinc-500", text: "출시 예정" };
  if (!card.auth) {
    if (card.clanStatus === "pending") return { dot: "bg-red-500", text: "게임 ID 미등록 · 신청 보류" };
    if (card.clanStatus === "member") return { dot: "bg-amber-400", text: "게임 ID 입력 필요" };
    return { dot: "bg-red-500", text: "게임 ID 미등록" };
  }
  if (card.clanStatus === "none") return { dot: "bg-sky-400", text: "클랜 찾는 중" };
  if (card.clanStatus === "pending" && card.clanName) return { dot: "bg-sky-400", text: `${card.clanName} 가입 신청 중` };
  if (card.clanStatus === "member" && card.clanName) return { dot: "bg-emerald-500", text: `${card.clanName} 가입됨` };
  return { dot: "bg-zinc-500", text: "상태 확인 중" };
}

const searchAliases: Record<string, string> = {
  overwatch: "overwatch 오버워치",
  valorant: "valorant 발로란트",
  lol: "lol league of legends 리그 오브 레전드 롤",
  pubg: "pubg battlegrounds 배틀그라운드 배그",
};

export function GameCardGrid({ cards, basePath = "" }: {
  cards: (GameCardState & { title: string })[];
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCards = cards.filter((card) => `${card.title} ${card.slug} ${searchAliases[card.slug] ?? ""}`.toLocaleLowerCase().includes(normalizedQuery));
  const availableCards = visibleCards.filter((card) => !card.disabled);
  const upcomingCards = visibleCards.filter((card) => card.disabled);

  return (
    <>
      <header className={styles.gameHeader}>
        <div><h1 className={styles.gameHeading}>게임 선택</h1><p className={styles.gameDescription}>게임별 클랜과 가입 상태를 한눈에 확인할 수 있습니다.</p></div>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input className={styles.input} type="search" aria-label="게임 검색" placeholder="게임 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </header>
      {visibleCards.length ? <div className={styles.gameGroups}>
        {availableCards.length > 0 && <section aria-labelledby="available-games-title">
          <h2 id="available-games-title" className={styles.gameGroupTitle}>이용 가능한 게임 <span>{availableCards.length}</span></h2>
          <div className={styles.gameGrid}>
          {availableCards.map((card) => {
            const { dot, text } = statusLabel(card);
            const href = buildGameCardHref(basePath, card);
            const action = !card.auth ? "게임 ID 등록" : card.clanStatus === "member" ? "클랜으로 이동" : card.clanStatus === "pending" ? "신청 확인" : "클랜 찾기";
            const inner = <>
              <span className={styles.gameLogo} aria-hidden="true"><GameLogo slug={card.slug} name={card.title} className="size-7" /></span>
              <div className={styles.gameBody}>
                <h3 className={styles.gameName}>{card.title}</h3>
                <div className={styles.gameStatus}><span className={`${styles.gameDot} ${dot}`} aria-hidden="true" /><span>{text}</span></div>
              </div>
              <span className={styles.gameAction}>{action}<ArrowRight size={17} aria-hidden="true" /></span>
            </>;
            return href === "#" ?
              <div key={card.slug} className={styles.gameCard} aria-disabled="true">{inner}</div> :
              <Link key={card.slug} href={href} className={styles.gameCard}>{inner}</Link>;
          })}
          </div>
        </section>}
        {upcomingCards.length > 0 && <section className={styles.upcomingGames} aria-labelledby="upcoming-games-title">
          <h2 id="upcoming-games-title" className={styles.gameGroupTitle}>출시 예정</h2>
          <ul className={styles.upcomingList}>
            {upcomingCards.map((card) => <li key={card.slug} className={styles.upcomingGame}>
              <span className={styles.upcomingLogo} aria-hidden="true"><GameLogo slug={card.slug} name={card.title} className="size-5" /></span>
              <span>{card.title}</span>
              <span className={styles.upcomingLabel}>준비 중</span>
            </li>)}
          </ul>
        </section>}
      </div> : <p className={styles.empty} role="status">“{query}”에 해당하는 게임이 없습니다. 다른 이름으로 검색해 주십시오.</p>}
    </>
  );
}
