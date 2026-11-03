"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GameLogo } from "@/components/ui/game-logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { headerActionClassName } from "@/components/ui/header-action-style";

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
    <DropdownMenuTrigger openOnHover delay={120} closeDelay={160} className={`${headerActionClassName} relative aria-expanded:bg-primary/10 aria-expanded:text-primary aria-expanded:ring-1 aria-expanded:ring-primary/30`} aria-label="게임 선택" title="게임 선택">
      <Gamepad2 aria-hidden="true" />
      <ChevronDown aria-hidden="true" className={`absolute bottom-1 right-0.5 size-2.5! ${open ? "rotate-180" : ""}`} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={4} className="w-64 max-w-[calc(100vw-24px)] shadow-lg ring-border" aria-label="게임 선택지">
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">게임 선택</p>
      <div className="min-h-44" aria-busy={games === null && !error}>
        {error ? <><p role="alert" className="px-3 py-4 text-xs text-muted-foreground">게임 목록을 불러오지 못했습니다.</p><DropdownMenuItem closeOnClick={false} onClick={() => { setError(false); setAttempt(value => value + 1); }}>다시 불러오기</DropdownMenuItem></> : games === null ? <p role="status" className="px-3 py-4 text-xs text-muted-foreground">게임을 불러오는 중…</p> : games.length ? games.map(game => <DropdownMenuItem key={game.slug} aria-label={game.name_ko} title={game.name_ko} disabled={!game.is_active} className="h-11 gap-3 px-3" render={game.is_active ? <Link href={`/games/${encodeURIComponent(game.slug)}/clan`} prefetch={false} /> : undefined}>
          <GameLogo slug={game.slug} name={game.name_ko} /><span className="min-w-0 flex-1 truncate">{game.name_ko}</span>{!game.is_active && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">준비 중</span>}
        </DropdownMenuItem>) : <p className="px-3 py-4 text-xs text-muted-foreground">등록된 게임이 없습니다.</p>}
      </div>
      <DropdownMenuSeparator /><DropdownMenuItem render={<Link href="/games" />} className="min-h-11 justify-between px-3">전체 게임 보기<ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" /></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
