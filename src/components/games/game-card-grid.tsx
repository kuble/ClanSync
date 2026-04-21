"use client";

import Link from "next/link";
import type { GameCardState } from "@/lib/routing/game-card-router";
import { buildGameCardHref } from "@/lib/routing/game-card-router";

function statusLabel(card: GameCardState): { dot: string; text: string } {
  if (card.disabled) {
    return { dot: "bg-zinc-500", text: "출시 예정" };
  }
  if (!card.auth) {
    if (card.clanStatus === "pending") {
      return { dot: "bg-red-500", text: "계정 미연동 · 신청 보류" };
    }
    if (card.clanStatus === "member") {
      return { dot: "bg-amber-400", text: "계정 재연동 필요" };
    }
    return { dot: "bg-red-500", text: "계정 미연동" };
  }
  if (card.clanStatus === "none") {
    return { dot: "bg-sky-400", text: "클랜 찾는 중" };
  }
  if (card.clanStatus === "pending" && card.clanName) {
    return {
      dot: "bg-sky-400",
      text: `${card.clanName} 가입 신청 중`,
    };
  }
  if (card.clanStatus === "member" && card.clanName) {
    return { dot: "bg-emerald-500", text: `${card.clanName} 가입됨` };
  }
  return { dot: "bg-zinc-500", text: "상태 확인 중" };
}

export function GameCardGrid({
  cards,
  basePath = "",
}: {
  cards: (GameCardState & { title: string; emoji: string })[];
  basePath?: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const { dot, text } = statusLabel(card);
        const href = buildGameCardHref(basePath, card);
        const inner = (
          <>
            <div className="bg-card flex aspect-video items-center justify-center rounded-t-xl border-b text-5xl">
              <span aria-hidden="true">{card.emoji}</span>
            </div>
            <div className="space-y-2 p-4">
              <div className="text-base font-semibold tracking-tight">
                {card.title}
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span
                  className={`inline-block size-2 shrink-0 rounded-full ${dot}`}
                  aria-hidden
                />
                <span>{text}</span>
              </div>
            </div>
          </>
        );

        if (card.disabled || href === "#") {
          return (
            <div
              key={card.slug}
              className="bg-card text-muted-foreground cursor-not-allowed rounded-xl border opacity-60"
              aria-disabled
            >
              {inner}
            </div>
          );
        }

        return (
          <Link
            key={card.slug}
            href={href}
            className="bg-card hover:border-primary/40 focus-visible:ring-ring rounded-xl border shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
