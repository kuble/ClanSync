"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { GameCardState } from "@/lib/routing/game-card-router";
import { buildGameCardHref } from "@/lib/routing/game-card-router";
import styles from "@/components/entry/entry.module.css";

function statusLabel(card: GameCardState): { dot: string; text: string } {
  if (card.disabled) return { dot: "bg-zinc-500", text: "출시 예정" };
  if (!card.auth) {
    if (card.clanStatus === "pending") return { dot: "bg-red-500", text: "계정 미연동 · 신청 보류" };
    if (card.clanStatus === "member") return { dot: "bg-amber-400", text: "계정 재연동 필요" };
    return { dot: "bg-red-500", text: "계정 미연동" };
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
  cards: (GameCardState & { title: string; emoji: string })[];
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCards = cards.filter((card) => `${card.title} ${card.slug} ${searchAliases[card.slug] ?? ""}`.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <>
      <header className={styles.gameHeader}>
        <div><h1 className={styles.gameHeading}>게임 선택</h1><p className={styles.gameDescription}>플레이할 게임을 선택하세요.</p></div>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input className={styles.input} type="search" aria-label="게임 검색" placeholder="게임 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </header>
      {visibleCards.length ? (
        <div className={styles.gameGrid}>
          {visibleCards.map((card) => {
            const { dot, text } = statusLabel(card);
            const href = buildGameCardHref(basePath, card);
            const inner = <>
              <div className={styles.gameThumbnail}><span aria-hidden="true">{card.emoji}</span></div>
              <div className={styles.gameBody}>
                <h2 className={styles.gameName}>{card.title}</h2>
                <div className={styles.gameStatus}><span className={`${styles.gameDot} ${dot}`} aria-hidden="true" /><span>{text}</span></div>
              </div>
            </>;
            return card.disabled || href === "#" ?
              <div key={card.slug} className={styles.gameCard} aria-disabled="true">{inner}</div> :
              <Link key={card.slug} href={href} className={styles.gameCard}>{inner}</Link>;
          })}
        </div>
      ) : <p className={styles.empty} role="status">“{query}”에 해당하는 게임이 없습니다. 다른 이름으로 검색해 주세요.</p>}
    </>
  );
}
