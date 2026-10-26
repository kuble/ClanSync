"use client";

import { useEffect, useState } from "react";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import type { PlayerIdentity } from "@/lib/profile/visibility";
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
  const [result, setResult] = useState<{ target: string; identity?: PlayerIdentity; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/player-profiles/${userId}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("플레이어 소개를 불러오지 못했습니다.");
      const data = await response.json() as { profile: PlayerIdentity };
      if (data.profile?.userId !== userId) throw new Error("플레이어가 변경되었습니다.");
      if (active) setResult({ target: userId, identity: data.profile });
    }).catch(() => {
      if (active) setResult(previous => ({ target: userId, identity: previous?.target === userId ? previous.identity : undefined, error: "플레이어 소개를 불러오지 못했습니다." }));
    });
    return () => { active = false; controller.abort(); };
  }, [userId, profile, attempt]);
  const current = result?.target === userId ? result : undefined;
  const card = useClanNamecard(userId);
  const displayName = card?.displayName ?? profile?.battleTag ?? "Player";
  const emblems = awards ?? [...collectHofEmblems(hof, userId, "month"), ...collectHofEmblems(hof, userId, "year")];
  const accessory = showEmblems ? <PersonalEmblemCaseLauncher key={clanId + userId} variant="namecard" accountWide clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} /> : undefined;
  return <section aria-label="플레이어 배너" className="min-h-36 min-w-0">
    {current?.identity ? <ProfileIdentity variant="record" readOnly userId={userId} intro={current.identity.intro} memberships={current.identity.memberships}
      games={current.identity.games} publicAppearance={current.identity.appearance} namecardAccessory={accessory} />
      : <div className="space-y-2"><Namecard displayName={displayName} title={card?.title} frame={card?.frame}>{accessory}</Namecard>{!current?.error && <p role="status" className="text-xs text-muted-foreground">플레이어 소개를 불러오는 중…</p>}</div>}
    {current?.error && <p role="alert" className="pb-2 text-sm">{current.error}<button className="ml-3 underline" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></p>}
  </section>;
}
