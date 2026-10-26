"use client";

import { useEffect, useState } from "react";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import type { PlayerIdentity } from "@/lib/profile/visibility";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import type { PlayerProfile } from "@/lib/clan/player-profile";
import { useClanNamecard } from "@/components/profile/clan-namecards";
import profileStyles from "@/components/profile/profile.module.css";
import { Namecard } from "@/components/profile/namecard";
import { collectHofEmblems, type HofEmblem } from "@/lib/clan/stats/hof-emblems";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";

type Hof = ClanStatsPageModel["hof"];

export function StatsPlayerBanner({ gameSlug, clanId, hof, userId, nickname, profile, awards, showEmblems = true }: {
  gameSlug: string; clanId: string; showEmblems?: boolean; hof: Hof; userId: string; nickname: string; profile?: PlayerProfile; awards?: HofEmblem[];
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
  const emblemCase = showEmblems ? <PersonalEmblemCaseLauncher key={clanId + userId} variant="namecard" accountWide clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} /> : undefined;
  const linkedGame = current?.identity?.games.find(game => game.gameSlug === gameSlug);
  const membership = current?.identity?.memberships.find(clan => clan.clanId === clanId);
  const game = linkedGame ?? { gameSlug, gameName: membership?.gameName ?? gameSlug, accountId: membership?.accountId ?? null };
  return <section aria-label="플레이어 배너" className="min-h-48 min-w-0 overflow-hidden rounded-xl border bg-card">
    {current?.identity ? <ProfileIdentity readOnly userId={userId} intro={current.identity.intro} memberships={[]}
      games={[game]} publicAppearance={current.identity.appearance} emblemCase={emblemCase}>
      {profile && <section className={profileStyles.identityFacts} aria-label="기본 정보"><dl>
        <div><dt>성별</dt><dd>{profile.gender === "male" ? "남성" : profile.gender === "female" ? "여성" : "비공개"}</dd></div>
        <div><dt>출생 연도</dt><dd>{profile.birthYear ?? "미등록"}</dd></div>
        <div><dt>클랜 가입일</dt><dd>{profile.clanJoinedAt ? new Date(profile.clanJoinedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "미등록"}</dd></div>
      </dl></section>}
    </ProfileIdentity>
      : <div className="space-y-4 p-4"><Namecard {...card} displayName={displayName} />{!current?.error && <p role="status" className="text-xs text-muted-foreground">플레이어 소개를 불러오는 중…</p>}{emblemCase}</div>}
    {current?.error && <p role="alert" className="px-4 pb-4 text-sm">{current.error}<button className="ml-3 underline" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></p>}
  </section>;
}
