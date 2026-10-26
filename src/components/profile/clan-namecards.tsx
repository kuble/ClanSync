"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ClanNamecards } from "@/lib/profile/namecard";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Namecard } from "./namecard";

const RecordPath = createContext<string | null>(null);
const Cards = createContext<ClanNamecards>({});
const HideDecoration = createContext(false);
const ProfileLinks = createContext(false);
export function ClanNamecardsProvider({ cards, recordPath, children }: { cards: ClanNamecards; recordPath: string; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => { const refresh = () => router.refresh(); window.addEventListener(CLANSYNC_NAMEPLATE_CHANGED, refresh); return () => window.removeEventListener(CLANSYNC_NAMEPLATE_CHANGED, refresh); }, [router]);
  return <RecordPath.Provider value={recordPath}><Cards.Provider value={cards}>{children}</Cards.Provider></RecordPath.Provider>;
}
export function BalanceNamecardMode({ hide, profileLinks = false, children }: { hide: boolean; profileLinks?: boolean; children: ReactNode }) {
  return <HideDecoration.Provider value={hide}><ProfileLinks.Provider value={profileLinks}>{children}</ProfileLinks.Provider></HideDecoration.Provider>;
}
export function useClanNamecard(userId?: string | null) {
  return useContext(Cards)[userId ?? ""];
}
export function ClanPlayerNamecard({ userId, fallback }: { userId?: string | null; fallback: string }) {
  const card = useClanNamecard(userId);
  const hide = useContext(HideDecoration);
  const profileLinks = useContext(ProfileLinks);
  const recordPath = useContext(RecordPath);
  if (!card) return <span className="block truncate text-xs font-bold sm:text-sm">{fallback}</span>;
  const content = hide ? <span data-namecard-plain="true" className="block truncate text-xs font-bold sm:text-sm" title={card.displayName}>{card.displayName}</span> : <Namecard displayName={card.displayName} title={card.title} frame={card.frame} compact />;
  return profileLinks && userId && recordPath ? <Link href={`${recordPath}?player=${userId}`} prefetch={false} aria-label={`${card.displayName} 프로필 보기`}
    className="block min-w-0 rounded-lg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    onClick={(event) => event.stopPropagation()}>{content}</Link> : content;
}
