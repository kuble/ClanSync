"use client";

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
  return <section aria-label="플레이어 배너" className="min-w-0">
    <Namecard displayName={displayName} title={card?.title} frame={card?.frame} profileHref={`/profile/${userId}`}>
      {showEmblems && <PersonalEmblemCaseLauncher key={clanId + userId} variant="namecard" clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} />}
    </Namecard>
  </section>;
}
