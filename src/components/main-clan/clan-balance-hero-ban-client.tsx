"use client";

import { useOptimistic, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Ban, Check, Crosshair, Shield, Plus, Timer, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { resolveHeroBanAction, submitHeroBanVoteAction } from "@/app/actions/clan-balance-session";
import { OW_HEROES, heroVoteTeam, teamHeroBanStandings, owHeroLabel, type HeroBanVote, type OwHero } from "@/lib/balance/ow-hero-ban";
import { OW_HERO_PORTRAITS } from "@/lib/balance/ow-hero-portraits";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useServerClock } from "@/lib/balance/use-server-clock";

const ROLES = [
  { id: "tank", label: "돌격", Icon: Shield },
  { id: "dps", label: "공격", Icon: Crosshair },
  { id: "support", label: "지원", Icon: Plus },
] as const;

const HERO_PLACEHOLDER_TONES: Record<OwHero["role"], string> = {
  tank: "bg-sky-950 text-sky-200",
  dps: "bg-rose-950 text-rose-200",
  support: "bg-emerald-950 text-emerald-200",
};

function HeroPortrait({ hero, className }: { hero: OwHero; className: string }) {
  const src = OW_HERO_PORTRAITS[hero.id];
  if (src) return <Image unoptimized src={src} alt="" width={104} height={112} className={className} />;
  return <span aria-hidden="true" className={cn("flex items-center justify-center font-black", HERO_PLACEHOLDER_TONES[hero.role], className)}>{hero.nameKo.slice(0, 1)}</span>;
}

export function ClanBalanceHeroBanClient({ gameSlug, clanId, sessionId, deadlineIso, serverNow,
  myVote, allVotes, canResolve, userId, roster, bansPerTeam, resolvedHeroes,
}: {
  gameSlug: string; clanId: string; sessionId: string; deadlineIso: string | null; serverNow: number;
  myVote: HeroBanVote | null; allVotes: readonly HeroBanVote[]; canResolve: boolean; userId: string;
  roster: BalanceRoster; bansPerTeam: 1 | 2; resolvedHeroes: string[] | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const saved = [myVote?.pick_1, myVote?.pick_2].filter((id): id is string => Boolean(id));
  const [picks, setPicks] = useOptimistic(saved, (_previous, next: string[]) => next);
  const now = useServerClock(serverNow, deadlineIso ? Date.parse(deadlineIso) : 0, 250);
  const remain = deadlineIso ? Math.max(0, Math.ceil((Date.parse(deadlineIso) - now) / 1000)) : 0;
  const expired = remain === 0 || resolvedHeroes !== null;
  const myTeam = heroVoteTeam(roster, userId);
  const standings = teamHeroBanStandings(allVotes, roster);

  function toggle(id: string) {
    if (!deadlineIso || expired || pending || !myTeam) return;
    const next = picks.includes(id) ? picks.filter((pick) => pick !== id) : [...picks, id];
    if (next.length > bansPerTeam) return;
    start(async () => {
      setPicks(next);
      try {
        const result = await submitHeroBanVoteAction(gameSlug, clanId, sessionId, next, deadlineIso);
        if (!result.ok) toast.error(result.error);
      } catch { toast.error("투표를 저장하지 못했습니다. 다시 선택해 주세요."); }
      router.refresh();
    });
  }
  function beginMatch() {
    start(async () => {
      const result = await resolveHeroBanAction(gameSlug, clanId, sessionId);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }
  return <div className="space-y-6" data-testid="hero-ban-selection">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 className="flex items-center gap-2 text-base font-bold"><Ban className="size-5 text-amber-400" />영웅 밴</h4>
        <p className="mt-2 text-xs text-muted-foreground">팀당 최대 {bansPerTeam}명 · 팀 내 득표순으로 결정됩니다. 선택하지 않으면 기권합니다.</p>
      </div>
      <span role="timer" className="flex items-center gap-2 rounded-lg border px-3 py-2 font-bold tabular-nums"><Timer className="size-4" />{expired ? "투표 종료" : remain + "s"}</span>
    </div>
    {expired ? <div className="grid gap-3 sm:grid-cols-2" data-testid="hero-ban-results">
      {(["team1", "team2"] as const).map((team, index) => <section key={team} aria-label={(index + 1) + "팀 밴 현황"}
        className={cn("rounded-xl border p-3", index === 0 ? "border-sky-500/30 bg-sky-500/5" : "border-rose-500/30 bg-rose-500/5")}>
        <div className="mb-3 flex items-center justify-between text-xs">
          <strong className={index === 0 ? "text-sky-400" : "text-rose-400"}>{index + 1}팀 {myTeam === team ? "· 내 팀" : ""}</strong>
          <span className="text-muted-foreground">{allVotes.filter((vote) => heroVoteTeam(roster, vote.user_id) === team).length} / 5명 선택</span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: bansPerTeam }, (_, slot) => {
            const entry = standings[team][slot];
            const hero = entry && (OW_HEROES.find((candidate) => candidate.id === entry.heroId) ?? {
              id: entry.heroId, nameKo: owHeroLabel(entry.heroId), role: entry.role,
            });
            return <div key={slot} className="flex min-h-14 flex-1 items-center gap-2 rounded-lg border bg-background/40 px-2 py-1">
              {entry && hero ? <><HeroPortrait hero={hero} className="h-12 w-11 rounded object-cover object-top" />
                <div><p className="text-xs font-semibold">{owHeroLabel(entry.heroId)}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.votes}표 · {ROLES.find((role) => role.id === entry.role)?.label}</p></div></>
                : <span className="text-xs text-muted-foreground">밴 없음</span>}
            </div>;
          })}
        </div>
      </section>)}
    </div> : <><div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <p className="text-muted-foreground">{myTeam ? "초상화를 눌러 선택 · 다시 누르면 취소" : "관전 중 · 출전자만 투표할 수 있습니다."}</p>
      {myTeam ? <span role="status">{pending ? "저장 중…" : picks.length ? picks.map(owHeroLabel).join(" · ") : "선택 없음"} <span className="ml-2 tabular-nums text-muted-foreground">{picks.length}/{bansPerTeam}</span></span> : null}
    </div>
    <div className="space-y-5">
      {ROLES.map(({ id: role, label, Icon }) => <section key={role} aria-label={label + " 영웅"}>
        <h5 className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Icon className="size-4" />{label}</h5>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-11">
          {OW_HEROES.filter((hero) => hero.role === role).map((hero) => {
            const selected = picks.includes(hero.id);
            return <button key={hero.id} type="button" aria-label={hero.nameKo + " 밴 선택"} aria-pressed={selected}
              disabled={pending || expired || !myTeam || (!selected && picks.length >= bansPerTeam)} onClick={() => toggle(hero.id)}
              className={cn("group relative overflow-hidden rounded-md border bg-muted/30 text-center transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default", selected ? "border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/50" : "border-border hover:border-foreground/60 disabled:opacity-50")}>
              <HeroPortrait hero={hero} className={cn("aspect-square w-full object-cover object-top", selected && "opacity-60")} />
              {selected ? <Ban className="absolute left-1/2 top-1/3 size-7 -translate-x-1/2 text-amber-300 drop-shadow" aria-hidden="true" /> : null}
              <span className="block truncate px-1 py-1.5 text-[10px] font-semibold">{hero.nameKo}</span>
            </button>;
          })}
        </div>
      </section>)}
    </div></>}
    {expired ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" data-balance-guide="primary">
      <p className="text-xs text-muted-foreground">무투표 팀은 밴 없음 · 동률은 영웅 고정 순서 · 양 팀 중복은 한 번만 제외</p>
      {canResolve ? <Button disabled={pending || !expired} onClick={beginMatch}><Check className="size-4" />경기 시작<ArrowRight className="size-4" /></Button>
        : <span className="text-xs text-muted-foreground">운영진이 경기를 시작하면 밴이 확정됩니다.</span>}
    </div> : null}
  </div>;
}
