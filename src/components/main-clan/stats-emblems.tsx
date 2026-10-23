"use client";

import { UserRound } from "lucide-react";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { playerProfileDetails, type PlayerProfile } from "@/lib/clan/player-profile";
import { collectHofEmblems, type HofEmblem } from "@/lib/clan/stats/hof-emblems";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";

type Hof = ClanStatsPageModel["hof"];

export function StatsPlayerBanner({ clanId, hof, userId, nickname, profile, awards, showEmblems = true }: {
  clanId: string; showEmblems?: boolean; hof: Hof; userId: string; nickname: string; profile?: PlayerProfile; awards?: HofEmblem[];
}) {
  const displayName = profile?.battleTag ?? nickname;
  const details = playerProfileDetails(profile);
  const emblems = awards ?? [...collectHofEmblems(hof, userId, "month"), ...collectHofEmblems(hof, userId, "year")];
  return <section aria-label="플레이어 배너" className="relative isolate flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card px-5 py-5 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-linear-to-r from-primary/15 via-primary/5 to-transparent" />
    <div className="flex min-w-0 max-w-full items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><UserRound className="size-6" aria-hidden="true" /></span>
      <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">개인 기록</p><h3 className="break-words text-lg font-bold" aria-label={`개인 기록 · ${displayName}`}>{displayName}</h3>{details && <p className="mt-1 text-xs text-muted-foreground">{details}</p>}{profile && !profile.battleTag && <p className="mt-1 text-xs text-muted-foreground">배틀태그 미등록</p>}</div>
    </div>
    {showEmblems && <PersonalEmblemCaseLauncher key={clanId + userId} clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} />}
  </section>;
}
