"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ClanNamecards } from "@/lib/profile/namecard";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Namecard } from "./namecard";

const Cards = createContext<ClanNamecards>({});
const HideDecoration = createContext(false);
export function ClanNamecardsProvider({ cards, children }: { cards: ClanNamecards; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => { const refresh = () => router.refresh(); window.addEventListener(CLANSYNC_NAMEPLATE_CHANGED, refresh); return () => window.removeEventListener(CLANSYNC_NAMEPLATE_CHANGED, refresh); }, [router]);
  return <Cards.Provider value={cards}>{children}</Cards.Provider>;
}
export function BalanceNamecardMode({ hide, children }: { hide: boolean; children: ReactNode }) {
  return <HideDecoration.Provider value={hide}>{children}</HideDecoration.Provider>;
}
export function ClanPlayerNamecard({ userId, fallback }: { userId?: string | null; fallback: string }) {
  const cards = useContext(Cards);
  const hide = useContext(HideDecoration);
  const card = userId ? cards[userId] : undefined;
  if (!card) return <span className="block truncate text-xs font-bold sm:text-sm">{fallback}</span>;
  return hide ? <span data-namecard-plain="true" className="block truncate text-xs font-bold sm:text-sm" title={card.displayName}>{card.displayName}</span> : <Namecard displayName={card.displayName} title={card.title} frame={card.frame} compact />;
}
