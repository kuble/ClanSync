"use client";

import { useEffect, useState } from "react";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import type { PlayerIdentity } from "@/lib/profile/visibility";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import type { PlayerProfile } from "@/lib/clan/player-profile";
import { useClanNamecard } from "@/components/profile/clan-namecards";
import profileStyles from "@/components/profile/profile.module.css";
import styles from "./stats-emblems.module.css";
import { collectHofEmblems, type HofEmblem } from "@/lib/clan/stats/hof-emblems";
import { PersonalEmblemCaseLauncher } from "@/components/personal-emblems/personal-emblem-case";

type Hof = ClanStatsPageModel["hof"];

export function StatsPlayerBanner({ gameSlug, clanId, hof, userId, nickname, profile, awards, showEmblems = true }: {
  gameSlug: string; clanId: string; showEmblems?: boolean; hof: Hof; userId: string; nickname: string; profile?: PlayerProfile; awards?: HofEmblem[];
}) {
  const target = `${clanId}:${userId}`;
  const [result, setResult] = useState<{ target: string; identity?: PlayerIdentity; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/player-profiles/${userId}?clanId=${clanId}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("플레이어 소개를 불러오지 못했습니다.");
      const data = await response.json() as { profile: PlayerIdentity };
      if (data.profile?.userId !== userId) throw new Error("플레이어가 변경되었습니다.");
      if (active) setResult({ target, identity: data.profile });
    }).catch(() => {
      if (active) setResult(previous => ({ target, identity: previous?.target === target ? previous.identity : undefined, error: "플레이어 소개를 불러오지 못했습니다." }));
    });
    return () => { active = false; controller.abort(); };
  }, [userId, clanId, target, profile, attempt]);
  const current = result?.target === target ? result : undefined;
  const facts = profile ?? current?.identity?.clanProfile;
  const card = useClanNamecard(userId);
  const displayName = card?.displayName ?? profile?.battleTag ?? "Player";
  const emblems = awards ?? [...collectHofEmblems(hof, userId, "month"), ...collectHofEmblems(hof, userId, "year")];
  const emblemCase = showEmblems ? <PersonalEmblemCaseLauncher key={clanId + userId} variant="namecard" accountWide clanId={clanId} userId={userId} nickname={nickname} initialAwards={emblems} /> : undefined;
  const linkedGame = current?.identity?.games.find(game => game.gameSlug === gameSlug);
  const membership = current?.identity?.memberships.find(clan => clan.clanId === clanId);
  const game = linkedGame ?? { gameSlug, gameName: membership?.gameName ?? gameSlug, accountId: membership?.accountId ?? displayName };
  const loading = !current?.identity && !current?.error;
  const introPlaceholder = current?.error ? <>
    {current.identity?.intro && <p>{current.identity.intro}</p>}
    <span role="alert">{current.error}<button type="button" className="ml-3 underline" onClick={() => { setResult(previous => previous && { target: previous.target, identity: previous.identity }); setAttempt(value => value + 1); }}>다시 불러오기</button></span>
  </> : loading ? <span role="status" className="block">
    <span className="sr-only">플레이어 소개를 불러오는 중…</span>
    <span aria-hidden="true" className="grid gap-2 pt-1.5 motion-safe:animate-pulse"><span className="h-3 w-4/5 rounded bg-muted" /><span className="h-3 w-full rounded bg-muted" /><span className="h-3 w-3/5 rounded bg-muted" /></span>
  </span> : undefined;
  return <section aria-label="플레이어 배너" aria-busy={loading} className={`min-h-48 min-w-0 overflow-hidden rounded-xl border bg-card ${styles.banner}`}>
    <ProfileIdentity readOnly userId={userId} intro={current?.identity?.intro ?? ""} introPlaceholder={introPlaceholder} memberships={[]}
      games={[game]} publicAppearance={current?.identity?.appearance ?? card} emblemCase={emblemCase}>
      <section className={profileStyles.identityFacts} aria-label="기본 정보" aria-busy={loading && !facts}><dl>
        <div><dt>성별</dt><dd>{facts ? facts.gender === "male" ? "남성" : facts.gender === "female" ? "여성" : "비공개" : "—"}</dd></div>
        <div><dt>출생 연도</dt><dd>{facts ? facts.birthYear ?? "미등록" : "—"}</dd></div>
        <div><dt>클랜 가입일</dt><dd>{facts ? facts.clanJoinedAt ? new Date(facts.clanJoinedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "미등록" : "—"}</dd></div>
      </dl></section>
    </ProfileIdentity>
  </section>;
}
