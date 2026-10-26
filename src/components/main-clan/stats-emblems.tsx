"use client";

import Link from "next/link";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import type { PlayerProfile } from "@/lib/clan/player-profile";
import { useClanNamecard } from "@/components/profile/clan-namecards";
import { Namecard } from "@/components/profile/namecard";
import { collectHofEmblems, type HofEmblem } from "@/lib/clan/stats/hof-emblems";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";

type Hof = ClanStatsPageModel["hof"];

export function StatsPlayerBanner({ clanId, hof, userId, nickname, profile, awards, showEmblems = true }: {
  clanId: string; showEmblems?: boolean; hof: Hof; userId: string; nickname: string; profile?: PlayerProfile; awards?: HofEmblem[];
}) {
  const card = useClanNamecard(userId);
  const displayName = card?.displayName ?? profile?.battleTag ?? "Player";
  const emblems = awards ?? [...collectHofEmblems(hof, userId, "month"), ...collectHofEmblems(hof, userId, "year")];
  return <section aria-label="플레이어 배너" className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <Link href={`/profile/${userId}`} prefetch={false} aria-label={`${displayName} 프로필 보기`} className="min-w-0 flex-1 basis-48 rounded-xl hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Namecard displayName={displayName} title={card?.title} frame={card?.frame} />
    </Link>
    {showEmblems && <div className="ml-auto shrink-0"><PersonalEmblemCaseLauncher key={clanId + userId} clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} /></div>}
  </section>;
}
