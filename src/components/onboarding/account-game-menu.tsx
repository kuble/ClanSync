"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
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
    <DropdownMenuTrigger openOnHover delay={120} closeDelay={160} className={headerActionClassName} aria-label="게임 선택" title="게임 선택">
      <Gamepad2 aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={4} className="w-72 max-w-[calc(100vw-24px)] rounded-xl p-0 shadow-lg ring-border" aria-label="게임 선택지">
      <p className="relative border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold after:absolute after:right-1.5 after:top-0 after:h-0.5 after:w-6 after:rounded-full after:bg-primary">게임 선택</p>
      <div className="min-h-44 p-1" aria-busy={games === null && !error}>
        {error ? <><p role="alert" className="px-3 py-4 text-xs text-muted-foreground">게임 목록을 불러오지 못했습니다.</p><DropdownMenuItem closeOnClick={false} onClick={() => { setError(false); setAttempt(value => value + 1); }}>다시 불러오기</DropdownMenuItem></> : games === null ? <p role="status" className="px-3 py-4 text-xs text-muted-foreground">게임을 불러오는 중…</p> : games.length ? games.map(game => <DropdownMenuItem key={game.slug} aria-label={game.name_ko} title={game.name_ko} disabled={!game.is_active} className="h-11 gap-3 px-3" render={game.is_active ? <Link href={`/games/${encodeURIComponent(game.slug)}/clan`} prefetch={false} /> : undefined}>
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted"><GameLogo slug={game.slug} name={game.name_ko} className="size-4" /></span>
          <span className="min-w-0 flex-1 text-sm leading-tight">{game.name_ko}</span>
          {!game.is_active && <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">준비 중</span>}
        </DropdownMenuItem>) : <p className="px-3 py-4 text-xs text-muted-foreground">등록된 게임이 없습니다.</p>}
      </div>
      <DropdownMenuSeparator className="m-0" /><DropdownMenuItem render={<Link href="/games" />} className="min-h-11 justify-between rounded-none bg-muted/30 px-4 text-xs">전체 게임 보기<ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" /></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
