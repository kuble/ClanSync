"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  BarChart3,
  Settings2,
  CircleHelp,
  Crown,
  Gamepad2,
  Map,
  MonitorPlay,
  Radio,
  Shield,
  Swords,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  closeBalanceSessionAction,
  openBalanceSessionAction,
  nextBalanceRoundAction,
  skipHeroBanPhaseAction,
  skipMapBanToMatchLiveAction,
  startMapBanPhaseAction,
  type BalanceSessionActionResult,
} from "@/app/actions/clan-balance-session";
import { ClanBalancePredictionPlaceholder } from "./clan-balance-match-live-placeholders";
import { ClanBalanceHeroBanClient } from "./clan-balance-hero-ban-client";
import {
  ClanBalanceMatchOutcomeClient,
  ClanBalancePredictionClient,
} from "./clan-balance-prediction-outcome-client";
import { ClanBalanceMaEditor } from "./clan-balance-ma-editor";
import { ClanBalanceMapBanClient } from "./clan-balance-map-ban-client";
import { ClanBalanceRosterBoard } from "./clan-balance-roster-board";
import { ClanBalanceGuide } from "./clan-balance-guide";
import { ClanBalanceSettings } from "./clan-balance-settings";
import { ClanBalanceHistoryDrawer } from "./clan-balance-history-drawer";
import {
  ClanBalanceRevealBoard,
  ClanBalanceRevealComplete,
} from "./clan-balance-reveal-board";
import { ClanBalanceOwnPreference } from "./clan-balance-own-preference";
import {
  ClanBalanceRosterEditor,
  type ClanBalanceRosterEditorHandle,
} from "./clan-balance-roster-editor";
import { ClanBalanceSessionRealtime } from "./clan-balance-session-realtime";
import { ClanBalanceFormation } from "./clan-balance-formation";
import {
  parseFormationSettings,
  type Role,
  type FormationState,
} from "@/lib/balance/formation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { defaultMaForRoster, parseMaSnapshot } from "@/lib/balance/ma-snapshot";
import { isOverwatchBalanceGame, owHeroLabel } from "@/lib/balance/ow-hero-ban";
import {
  EMPTY_ROSTER,
  parseRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";
import { tallyMapVotes } from "@/lib/balance/weighted-map-pick";
import type { Database } from "@/lib/supabase/database.types";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { cn } from "@/lib/utils";

type BalanceSession = Database["public"]["Tables"]["balance_sessions"]["Row"];
type MapVote = Database["public"]["Tables"]["balance_session_map_votes"]["Row"];
type HeroVote =
  Database["public"]["Tables"]["balance_session_hero_votes"]["Row"];
type BalancePrediction =
  Database["public"]["Tables"]["balance_session_predictions"]["Row"];

export function ClanBalanceSessionPanel({
  gameSlug,
  clanId,
  userId,
  canManage,
  hostNickname,
  session,
  series,
  profileRanking,
  roundRanking,
  serverNow,
  votes,
  heroVotes,
  balancePredictions,
  rosterPool,
  canEditMscore,
  planPremium,
}: {
  gameSlug: string;
  clanId: string;
  userId: string;
  canManage: boolean;
  hostNickname: string | null;
  session: BalanceSession | null;
  series: Database["public"]["Tables"]["balance_session_series"]["Row"] | null;
  profileRanking: Role[];
  roundRanking: Role[] | null;
  serverNow: number;
  votes: MapVote[];
  heroVotes: HeroVote[];
  balancePredictions: BalancePrediction[];
  rosterPool: readonly { user_id: string; nickname: string }[];
  canEditMscore: boolean;
  planPremium: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const rosterRef = useRef<ClanBalanceRosterEditorHandle>(null);
  const [busyFormation, setBusyFormation] = useState(false);
  const [preferencePending, setPreferencePending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const formation =
    session?.formation_state as unknown as FormationState | null;
  const presentationNow = useServerClock(
    serverNow,
    Math.max(
      formation?.draw
        ? formation.draw.startedAt + formation.draw.durationMs
        : 0,
      formation?.auction?.deadline ?? 0,
    ),
  );
  const settings = parseFormationSettings(session?.formation_settings);
  async function flushRoster() {
    const editor = rosterRef.current;
    if (!editor)
      return {
        ok: true as const,
        revision: session?.formation_revision ?? 0,
        roster: parseRoster(session?.roster),
      };
    const result = await editor.flush();
    return result.ok ? { ...result, roster: editor.getRoster() } : result;
  }
  const storeHref = `/games/${gameSlug}/clan/${clanId}/store`;

  function onOpenSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("mapBan", "on");
    start(async () => {
      const r = await openBalanceSessionAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("내전 세션이 열렸습니다.");
      router.refresh();
    });
  }

  function runAction(
    label: string,
    fn: () => Promise<BalanceSessionActionResult>,
  ) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  const rosterData = session ? parseRoster(session.roster) : EMPTY_ROSTER;
  const rosterCount = rosterAssignedUserIds(rosterData).length;
  const isRosterParticipant =
    rosterAssignedUserIds(rosterData).includes(userId);
  const maForUi = defaultMaForRoster(
    rosterData,
    parseMaSnapshot(session?.ma_snapshot),
  );
  const maSyncKey = `${session?.id}:${JSON.stringify(session?.ma_snapshot)}`;
  const candidates = session?.map_candidates;
  const triple =
    candidates?.length === 3
      ? ([candidates[0]!, candidates[1]!, candidates[2]!] as [
          string,
          string,
          string,
        ])
      : null;
  const myVote = votes.find((vote) => vote.user_id === userId);
  const myHeroVote = heroVotes.find((vote) => vote.user_id === userId) ?? null;
  const heroBanSyncKey = `${session?.id}:${JSON.stringify(heroVotes)}`;
  const myPrediction = balancePredictions.find(
    (prediction) => prediction.user_id === userId,
  );
  const myPickTeam =
    myPrediction?.pick_team === 1
      ? 1
      : myPrediction?.pick_team === 2
        ? 2
        : null;
  const outcomeLabel =
    session?.match_outcome === "void"
      ? "무효 · 재경기"
      : session?.match_outcome === "team1"
        ? "블루 팀 승리"
        : session?.match_outcome === "team2"
          ? "레드 팀 승리"
          : null;

  return (
    <div
      className="space-y-5"
      data-testid="clan-balance-session-panel"
      data-balance-phase={session?.phase ?? "none"}
    >
      <ClanBalanceSessionRealtime
        sessionId={session?.id ?? null}
        clanId={clanId}
        roundKey={
          session
            ? `${session.id}:${session.formation_revision}:${session.phase}:${session.match_outcome}`
            : "none"
        }
      />
      {session && canManage ? (
        <Dialog open={broadcast} onOpenChange={setBroadcast}>
          <DialogContent
            className="h-dvh w-screen max-w-none overflow-y-auto rounded-none p-5 sm:max-w-none sm:p-10"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">내전 방송용 화면</DialogTitle>
            <div className="mx-auto max-w-5xl">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {series?.session_date} 내전
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    라운드 {session.round_number} ·{" "}
                    {outcomeLabel ??
                      (session.phase === "editing" ? "팀 편성" : "경기 진행")}
                  </h2>
                </div>
                <Button variant="outline" onClick={() => setBroadcast(false)}>
                  방송용 화면 닫기
                </Button>
              </div>
              <ClanBalanceRevealBoard
                state={formation}
                roster={rosterData}
                pool={rosterPool}
                serverNow={presentationNow}
              />
              {formation ? (
                <ClanBalanceFormation
                  serverNow={presentationNow}
                  gameSlug={gameSlug}
                  clanId={clanId}
                  roundId={session.id}
                  revision={session.formation_revision}
                  drawHistoryLength={
                    Array.isArray(session.draw_history)
                      ? session.draw_history.length
                      : 0
                  }
                  state={formation}
                  settings={settings}
                  bans={{
                    mapBan: session.map_ban_enabled,
                    heroBan: session.hero_ban_enabled,
                  }}
                  pool={rosterPool}
                  userId={userId}
                  canManage={false}
                  readOnly
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {canManage ? (
        <ClanBalanceGuide
          open={guideOpen}
          onOpenChange={setGuideOpen}
          editing={session?.phase === "editing" && !formation}
          canManage={canManage}
        />
      ) : null}
      <ClanBalanceHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        gameSlug={gameSlug}
        clanId={clanId}
        currentSeriesId={series?.id ?? null}
        pool={rosterPool}
      />
      {session && canManage && settingsOpen ? (
        <ClanBalanceSettings
          key={session.id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          gameSlug={gameSlug}
          clanId={clanId}
          roundId={session.id}
          revision={session.formation_revision}
          settings={settings}
          mapBan={session.map_ban_enabled}
          heroBan={session.hero_ban_enabled}
          roster={rosterData}
          pool={rosterPool}
          editable={
            canManage &&
            session.phase === "editing" &&
            !formation &&
            !busyFormation
          }
          beforeSave={flushRoster}
        />
      ) : null}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <Swords className="size-4 text-primary" aria-hidden="true" />
              {session?.phase === "match_live"
                ? "경기 현황"
                : session?.phase === "map_ban"
                  ? "맵 밴"
                  : session?.phase === "hero_ban"
                    ? "영웅 밴"
                    : canManage
                      ? "밸런스 편집"
                      : "팀 편성"}
              {session ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  라운드 {session.round_number}
                </span>
              ) : null}
            </h3>
            {series ? (
              <p className="mt-1.5 pl-6 text-[11px] text-muted-foreground">
                {series.session_date?.replaceAll("-", ".")}
                {series.closed_at ? " · 세션 종료" : null}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {session ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Radio className="size-3 text-emerald-500" aria-hidden="true" />
                {hostNickname ? "호스트 · " + hostNickname : "세션 진행 중"}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-semibold",
                planPremium
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-border text-muted-foreground",
              )}
            >
              {planPremium ? "Premium" : "Free"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="내전 기록"
              title="내전 기록"
              data-balance-guide="history"
              onClick={() => setHistoryOpen(true)}
            >
              <BarChart3 className="size-4" />
            </Button>
            {canManage ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="화면 안내"
                title="화면 안내"
                onClick={() => setGuideOpen(true)}
              >
                <CircleHelp className="size-4" />
              </Button>
            ) : null}
            {session && canManage ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="방송용 화면"
                title="방송용 화면"
                onClick={() => setBroadcast(true)}
              >
                <MonitorPlay className="size-4" />
              </Button>
            ) : null}
            {session && canManage ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="라운드 설정"
                title="라운드 설정"
                data-balance-guide="settings"
                disabled={pending || busyFormation}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-4" />
              </Button>
            ) : null}
            {session && canManage && session.phase === "editing" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || busyFormation}
                onClick={() =>
                  runAction("세션을 종료했습니다.", async () => {
                    const saved = await flushRoster();
                    if (!saved.ok)
                      return {
                        ok: false,
                        error: "명단 저장을 완료한 뒤 다시 시도하세요.",
                      };
                    return closeBalanceSessionAction(
                      gameSlug,
                      clanId,
                      session.id,
                    );
                  })
                }
              >
                세션 종료
              </Button>
            ) : null}
          </div>
        </div>

        {!session ? (
          canManage ? (
            <div className="space-y-5 p-4 sm:p-6" data-balance-guide="board">
              <ClanBalanceRosterBoard roster={EMPTY_ROSTER} pool={rosterPool} />
              <form
                onSubmit={onOpenSession}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  세션을 열고 참가자와 라운드 규칙을 정하세요.
                </p>
                <Button type="submit" disabled={pending}>
                  {pending ? "세션 여는 중…" : "세션 열기"}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <div className="mb-5 rounded-2xl bg-primary/10 p-5">
                <Gamepad2 className="size-8 text-primary" aria-hidden="true" />
              </div>
              <h4 className="text-lg font-semibold">경기를 준비 중입니다</h4>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                운영진이 세션을 열면 팀 배치와 밴픽이 이곳에 표시됩니다. 잠시 후
                함께 경기를 시작해 보세요.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => router.refresh()}
              >
                새로고침
              </Button>
            </div>
          )
        ) : (
          <div className="p-4 sm:p-6">
            {session.phase === "editing" ? (
              <div className="space-y-5">
                <div data-balance-guide="board">
                  {canManage && !formation ? (
                    <ClanBalanceRosterEditor
                      ref={rosterRef}
                      key={session.id}
                      gameSlug={gameSlug}
                      clanId={clanId}
                      sessionId={session.id}
                      revision={session.formation_revision}
                      initialRoster={rosterData}
                      pool={[...rosterPool]}
                      canEdit={!busyFormation && !pending}
                    />
                  ) : (
                    <ClanBalanceRevealBoard
                      state={formation}
                      roster={rosterData}
                      pool={rosterPool}
                      serverNow={presentationNow}
                    />
                  )}
                </div>
                {isRosterParticipant &&
                !formation &&
                settings.roles === "lottery" ? (
                  <ClanBalanceOwnPreference
                    key={
                      session.id +
                      ":" +
                      JSON.stringify(roundRanking) +
                      ":" +
                      profileRanking.join()
                    }
                    gameSlug={gameSlug}
                    clanId={clanId}
                    roundId={session.id}
                    profileRanking={profileRanking}
                    roundRanking={roundRanking}
                    locked={Boolean(formation) || busyFormation}
                    onPendingChange={setPreferencePending}
                  />
                ) : null}
                <ClanBalanceFormation
                  serverNow={presentationNow}
                  key={session.id}
                  gameSlug={gameSlug}
                  clanId={clanId}
                  roundId={session.id}
                  revision={session.formation_revision}
                  drawHistoryLength={
                    Array.isArray(session.draw_history)
                      ? session.draw_history.length
                      : 0
                  }
                  state={formation}
                  settings={settings}
                  bans={{
                    mapBan: session.map_ban_enabled,
                    heroBan: session.hero_ban_enabled,
                  }}
                  pool={rosterPool}
                  userId={userId}
                  canManage={canManage}
                  beforeStart={flushRoster}
                  preferencePending={preferencePending}
                  onPendingChange={setBusyFormation}
                />
                {formation?.stage === "complete" && canManage ? (
                  <ClanBalanceRevealComplete
                    key={`reveal:${formation.draw?.id ?? session.id}`}
                    state={formation}
                    serverNow={presentationNow}
                  >
                    <div
                      className="flex justify-end"
                      data-balance-guide="primary"
                    >
                      <Button
                        disabled={pending || busyFormation}
                        onClick={() =>
                          session.map_ban_enabled
                            ? runAction("맵 밴을 시작했습니다.", () =>
                                startMapBanPhaseAction(
                                  gameSlug,
                                  clanId,
                                  session.id,
                                ),
                              )
                            : runAction("경기 화면으로 이동했습니다.", () =>
                                skipMapBanToMatchLiveAction(
                                  gameSlug,
                                  clanId,
                                  session.id,
                                ),
                              )
                        }
                      >
                        {session.map_ban_enabled
                          ? "맵 밴 시작"
                          : session.hero_ban_enabled
                            ? "영웅 밴 시작"
                            : "경기 시작"}
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </ClanBalanceRevealComplete>
                ) : null}
              </div>
            ) : null}

            {session.phase === "map_ban" ? (
              <div className="space-y-6">
                {triple && session.map_ban_deadline_at ? (
                  <ClanBalanceMapBanClient
                    gameSlug={gameSlug}
                    clanId={clanId}
                    sessionId={session.id}
                    candidates={triple}
                    deadlineIso={session.map_ban_deadline_at}
                    myChoiceIdx={myVote?.choice_idx ?? null}
                    tallies={tallyMapVotes(votes)}
                    canResolve={canManage}
                  />
                ) : (
                  <p
                    role="status"
                    className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
                  >
                    맵 후보를 불러오지 못했습니다. 페이지를 새로고침해 주세요.
                  </p>
                )}
                <details className="rounded-xl border p-4">
                  <summary className="cursor-pointer text-xs font-semibold">
                    출전 라인업 · {rosterCount}명
                  </summary>
                  <div className="mt-5">
                    <ClanBalanceRosterBoard
                      roster={rosterData}
                      pool={rosterPool}
                    />
                  </div>
                </details>
              </div>
            ) : null}

            {session.phase === "hero_ban" ? (
              <div className="space-y-6">
                {session.resolved_map_label ? (
                  <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-xs">
                    <Map className="size-4 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">경기 맵</span>
                    <strong>{session.resolved_map_label}</strong>
                  </p>
                ) : null}
                {isOverwatchBalanceGame(gameSlug) ? (
                  <ClanBalanceHeroBanClient
                    key={
                      heroBanSyncKey +
                      ":" +
                      myHeroVote?.pick_1 +
                      ":" +
                      myHeroVote?.pick_2 +
                      ":" +
                      myHeroVote?.pick_3
                    }
                    gameSlug={gameSlug}
                    clanId={clanId}
                    sessionId={session.id}
                    deadlineIso={session.hero_ban_deadline_at}
                    myVote={myHeroVote}
                    allVotes={heroVotes}
                    canResolve={canManage}
                    isRosterParticipant={isRosterParticipant}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    이 게임은 영웅 밴을 지원하지 않습니다. 운영진이 다음 단계로
                    진행할 수 있습니다.
                  </p>
                )}
                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      runAction("경기 화면으로 이동했습니다.", () =>
                        skipHeroBanPhaseAction(gameSlug, clanId, session.id),
                      )
                    }
                  >
                    영웅 밴 건너뛰기
                  </Button>
                ) : null}
                <details className="rounded-xl border p-4">
                  <summary className="cursor-pointer text-xs font-semibold">
                    출전 라인업 · {rosterCount}명
                  </summary>
                  <div className="mt-5">
                    <ClanBalanceRosterBoard
                      roster={rosterData}
                      pool={rosterPool}
                    />
                  </div>
                </details>
              </div>
            ) : null}

            {session.phase === "match_live" ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Map className="size-4 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">경기 맵</span>
                    <strong>{session.resolved_map_label ?? "자유 선택"}</strong>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                      outcomeLabel
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {outcomeLabel ? (
                      <Crown className="size-3.5" aria-hidden="true" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                    {outcomeLabel ?? "경기 진행 중"}
                  </span>
                </div>
                {session.banned_heroes?.length ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Shield className="size-3.5" aria-hidden="true" />밴 영웅
                    </span>
                    {session.banned_heroes.map((id) => (
                      <span
                        key={id}
                        className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2 py-1"
                      >
                        {owHeroLabel(id)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <ClanBalanceRosterBoard
                    roster={rosterData}
                    pool={rosterPool}
                    snapshot={maForUi}
                    planPremium={planPremium}
                  />
                  <div className="space-y-4">
                    {!planPremium || isRosterParticipant ? (
                      <ClanBalancePredictionPlaceholder
                        planPremium={planPremium}
                        gameSlug={gameSlug}
                        clanId={clanId}
                        isRosterParticipant={isRosterParticipant}
                      />
                    ) : session.match_outcome === "pending" ? (
                      <ClanBalancePredictionClient
                        gameSlug={gameSlug}
                        clanId={clanId}
                        sessionId={session.id}
                        myPickTeam={myPickTeam}
                        predictionCount={balancePredictions.length}
                        deadlineIso={session.prediction_deadline_at}
                      />
                    ) : (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <h4 className="text-sm font-semibold">승부예측 결과</h4>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {session.match_outcome === "void"
                            ? "이번 경기는 무효 처리되어 예측 보상이 지급되지 않습니다."
                            : "결과가 확정되었습니다. 적중 보상은 개인 코인 내역에서 확인할 수 있습니다."}
                        </p>
                      </div>
                    )}
                    {canManage && session.match_outcome === "pending" ? (
                      <ClanBalanceMatchOutcomeClient
                        gameSlug={gameSlug}
                        clanId={clanId}
                        sessionId={session.id}
                        disabled={false}
                      />
                    ) : null}
                    {canManage && session.match_outcome !== "pending" ? (
                      <Button
                        className="w-full"
                        disabled={pending}
                        onClick={() =>
                          runAction("다음 라운드를 열었습니다.", () =>
                            nextBalanceRoundAction(
                              gameSlug,
                              clanId,
                              session.id,
                            ),
                          )
                        }
                      >
                        다음 라운드
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={
                          pending || session.match_outcome === "pending"
                        }
                        onClick={() =>
                          runAction("세션을 종료했습니다.", () =>
                            closeBalanceSessionAction(
                              gameSlug,
                              clanId,
                              session.id,
                            ),
                          )
                        }
                      >
                        세션 종료
                      </Button>
                    ) : null}
                  </div>
                </div>
                <section className="border-t pt-5">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Users
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    참가자 점수
                  </h4>
                  <ClanBalanceMaEditor
                    key={maSyncKey}
                    gameSlug={gameSlug}
                    clanId={clanId}
                    sessionId={session.id}
                    roster={rosterData}
                    initialSnapshot={maForUi}
                    pool={[...rosterPool]}
                    canEdit={canEditMscore}
                    planPremium={planPremium}
                  />
                </section>
              </div>
            ) : null}
          </div>
        )}
      </section>
      <p className="text-right text-xs text-muted-foreground">
        경기 보상과 코인 내역은{" "}
        <Link
          href={storeHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          스토어
        </Link>
        에서 확인하세요.
      </p>
    </div>
  );
}
