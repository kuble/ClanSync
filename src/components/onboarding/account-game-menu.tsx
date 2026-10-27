"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GameLogo } from "@/components/ui/game-logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./onboarding.module.css";

type Game = { slug: string; name_ko: string; is_active: boolean };
const order = ["overwatch", "valorant", "lol", "pubg"];

export function AccountGameMenu() {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || games !== null) return;
    let active = true;
    const client = createClient();
    void Promise.resolve(client.from("games").select("slug,name_ko,is_active").order("slug")).then(result => {
      if (!active) return;
      if (result.error) { setError(true); return; }
      setGames((result.data as Game[]).sort((a, b) => {
        const rank = (slug: string) => order.includes(slug) ? order.indexOf(slug) : order.length;
        return rank(a.slug) - rank(b.slug);
      }));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [open, games, attempt]);
  return <DropdownMenu open={open} onOpenChange={next => { setOpen(next); if (next) setError(false); }} modal={false}>
    <DropdownMenuTrigger openOnHover delay={120} closeDelay={160} className={styles.gameTrigger} aria-label="게임 선택">
      <Gamepad2 size={16} aria-hidden="true" /><span className={styles.navLabel}>게임 선택</span><ChevronDown size={12} aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-24px)]" aria-label="게임 선택지">
      <div className="min-h-44" aria-busy={games === null && !error}>
        {error ? <><p role="alert" className="px-3 py-4 text-xs text-muted-foreground">게임 목록을 불러오지 못했습니다.</p><DropdownMenuItem closeOnClick={false} onClick={() => { setError(false); setAttempt(value => value + 1); }}>다시 불러오기</DropdownMenuItem></> : games === null ? <p role="status" className="px-3 py-4 text-xs text-muted-foreground">게임을 불러오는 중…</p> : games.length ? games.map(game => <DropdownMenuItem key={game.slug} aria-label={game.name_ko} title={game.name_ko} disabled={!game.is_active} className="h-11 gap-3 px-3" render={game.is_active ? <Link href={`/games/${encodeURIComponent(game.slug)}/clan`} prefetch={false} /> : undefined}>
          <GameLogo slug={game.slug} name={game.name_ko} /><span className="min-w-0 flex-1 truncate">{game.name_ko}</span>{!game.is_active && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">준비 중</span>}
        </DropdownMenuItem>) : <p className="px-3 py-4 text-xs text-muted-foreground">등록된 게임이 없습니다.</p>}
      </div>
      <DropdownMenuSeparator /><DropdownMenuItem render={<Link href="/games" />} className="min-h-11 px-3">전체 게임 보기</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
