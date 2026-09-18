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
  Radio,
  RotateCcw,
  Shield,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import {
  closeBalanceSessionAction,
  openBalanceSessionAction,
  nextBalanceRoundAction,
  skipHeroBanPhaseAction,
  type BalanceSessionActionResult,
} from "@/app/actions/clan-balance-session";
import { ClanBalanceHeroBanClient } from "./clan-balance-hero-ban-client";
import {
  ClanBalanceMatchOutcomeClient,
} from "./clan-balance-prediction-outcome-client";
import { ClanBalancePredictionDrawer, ClanBalanceScoreDrawer } from "./clan-balance-match-drawers";
import { ClanBalanceMapBanClient } from "./clan-balance-map-ban-client";
import { ClanBalanceRosterBoard } from "./clan-balance-roster-board";
import { ClanBalanceGuide, type BalanceGuideStage } from "./clan-balance-guide";
import { updateFormationAction } from "@/app/actions/clan-balance-formation";
import { ClanBalanceSettings } from "./clan-balance-settings";
import { ClanBalancePrematchControls } from "./clan-balance-prematch-controls";
import { parseBanSettings } from "@/lib/balance/prematch";
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
import { AuctionPurchases } from "./balance-auction-stage";
import {
  parseFormationSettings,
  type Role,
  type FormationState,
} from "@/lib/balance/formation";
import { Button } from "@/components/ui/button";
import { defaultMaForRoster } from "@/lib/balance/ma-snapshot";
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
import { BalanceTeamInsights, ScoreModeToggle, previewScores, type ScoreMode } from "./balance-team-insights";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import type { PlayerSessionInfoMap } from "@/lib/balance/player-session-stats";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  canViewHistory,
  historyScope,
  flash,
  canViewScores,
  scores,
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
  qaPreviewEnabled = false,
  playerSessionInfo,
}: {
  gameSlug: string;
  clanId: string;
  userId: string;
  canManage: boolean;
  canViewHistory: boolean;
  historyScope: "clan" | "session";
  flash: boolean;
  canViewScores: boolean;
  scores: MaSnapshot;
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
  qaPreviewEnabled?: boolean;
  playerSessionInfo?: PlayerSessionInfoMap;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const rosterRef = useRef<ClanBalanceRosterEditorHandle>(null);
  const [busyFormation, setBusyFormation] = useState(false);
  const [preferencePending, setPreferencePending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [scoreMode, setScoreMode] = useState<ScoreMode>("m");
  const formation =
    session?.formation_state as unknown as FormationState | null;
  const mapScreen = Boolean(
    session &&
      (session.phase === "map_ban" ||
        session.phase === "hero_ban" ||
        (session.phase === "editing" &&
          formation?.stage === "complete" &&
          formation.appliedAt !== undefined)),
  );
  const guideStage: BalanceGuideStage =
    session?.phase === "map_ban"
      ? session.resolved_map_label
        ? "map-result"
        : "map-vote"
      : session?.phase === "hero_ban"
        ? session.banned_heroes === null
          ? "hero-vote"
          : "hero-result"
        : session?.phase === "match_live"
          ? "match"
          : mapScreen
            ? session?.map_ban_enabled
              ? session.resolved_map_label
                ? "map-result"
                : "map-types"
              : "map-manual"
            : formation
              ? "formation"
              : "roster";
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
  const isRosterParticipant =
    rosterAssignedUserIds(rosterData).includes(userId);
  const maForUi = defaultMaForRoster(
    rosterData,
    scores,
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
          : session?.match_outcome === "draw" ? "무승부" : null;
  const endSessionControl = session && canManage ? <Button variant="destructive" size="sm"
    disabled={pending || busyFormation || (session.phase !== "editing" && session.match_outcome === "pending")}
    title={session.phase !== "editing" && session.match_outcome === "pending" ? "경기 결과 또는 무효를 먼저 기록하세요." : undefined}
    onClick={() => setConfirmEnd(true)}>세션 종료</Button> : null;
  const sampleScores = canViewScores && qaPreviewEnabled;
  const displayScores = sampleScores ? previewScores(rosterPool.map((member) => member.user_id), scores) : scores;
  const samplePlayerIds = sampleScores ? rosterPool.filter((member) => !scores[member.user_id]).map((member) => member.user_id) : [];
  const scoreControl = canViewScores ? <ScoreModeToggle value={scoreMode} onChange={setScoreMode} premium={planPremium} /> : null;
  const renderInsights = (map: string | null, roster = rosterData, showMap = false) => canViewScores && !flash ? <BalanceTeamInsights roster={roster} scores={displayScores} mode={scoreMode} map={map} premium={planPremium} compact={!showMap} showMap={showMap} sample={sampleScores} /> : null;

  return (
    <div
      className="space-y-5"
      data-testid="clan-balance-session-panel"
      data-balance-phase={session?.phase ?? "none"}
    >
      <Dialog open={confirmEnd} onOpenChange={(open) => { if (!pending) setConfirmEnd(open); }}>
        <DialogContent><DialogHeader><DialogTitle>내전을 종료할까요?</DialogTitle><DialogDescription>{flash ? "깜짝 내전의 모든 라운드·참여·점수·투표 기록이 삭제되며 복구할 수 없습니다." : "현재 세션을 종료합니다. 정규 내전 기록은 보존됩니다."}</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setConfirmEnd(false)}>돌아가기</Button><Button variant="destructive" disabled={pending} onClick={() => {
            if (!session) return;
            runAction("세션을 종료했습니다.", async () => {
              const saved = await flushRoster();
              if (!saved.ok) return { ok: false, error: "명단 저장을 완료한 뒤 다시 시도하세요." };
              const result = await closeBalanceSessionAction(gameSlug, clanId, session.id);
              if (result.ok) { setConfirmEnd(false); router.replace(`/games/${gameSlug}/clan/${clanId}/balance`); }
              return result;
            });
          }}>종료 확정</Button></div>
        </DialogContent>
      </Dialog>
      <ClanBalanceSessionRealtime
        seriesId={series?.id ?? null}
        sessionId={session?.id ?? null}
        clanId={clanId}
        roundKey={
          session
            ? `${session.id}:${session.formation_revision}:${session.phase}:${session.match_outcome}`
            : "none"
        }
      />
      {canManage ? (
        <ClanBalanceGuide
          open={guideOpen}
          onOpenChange={setGuideOpen}
          key={guideStage}
          stage={guideStage}
        />
      ) : null}
      {canViewHistory ? <ClanBalanceHistoryDrawer
        scope={historyScope}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        gameSlug={gameSlug}
        clanId={clanId}
        currentSeriesId={series?.id ?? null}
        pool={rosterPool}
      /> : null}
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
          planPremium={planPremium}
          regularRoom={!flash}
          mapBan={session.map_ban_enabled}
          heroBan={session.hero_ban_enabled}
          roster={rosterData}
          pool={rosterPool}
          banSettings={parseBanSettings(session)}
          activeVote={
            session.phase === "map_ban" || session.phase === "hero_ban"
          }
          editable={
            canManage && session.phase !== "match_live" && !busyFormation
          }
          formationEditable={
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
                    : mapScreen
                      ? session?.map_ban_enabled
                        ? "맵 유형 선택"
                        : "맵 선택"
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
          <div
            className={cn(
              "flex items-center gap-3 text-[11px]",
              mapScreen && "hidden",
            )}
          >
            {session ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Radio className="size-3 text-emerald-500" aria-hidden="true" />
                {hostNickname ? "호스트 · " + hostNickname : "세션 진행 중"}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {canViewHistory ? <Button
              size="icon"
              variant="ghost"
              aria-label="내전 기록"
              title={canViewHistory ? "내전 기록" : "운영진 이상만 확인할 수 있습니다."}
              data-balance-guide="history"
              onClick={() => setHistoryOpen(true)}
            >
              <BarChart3 className="size-4" />
            </Button> : null}
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
            {session &&
            canManage &&
            !mapScreen &&
            session.phase !== "match_live" ? (
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
            {session.phase === "editing" && !mapScreen && !(canManage && !formation) ? (
              <div className="flex items-center justify-between gap-2">
                {scoreControl ?? <span />}
                {canManage && formation && session.phase === "editing" && !mapScreen ? (
                  <ClanBalanceRevealComplete state={formation} serverNow={presentationNow}>
                    <Button size="icon" variant="ghost" title="명단 수정" aria-label="명단 수정" disabled={pending || busyFormation}
                      onClick={() => runAction("명단을 수정할 수 있습니다.", () => updateFormationAction(gameSlug, clanId, session.id, session.formation_revision, { type: "reset" }))}>
                      <RotateCcw className="size-4" />
                    </Button>
                  </ClanBalanceRevealComplete>
                ) : null}
              </div>
            ) : null}
            {session.phase === "editing" && !mapScreen ? (
              <div className="flex flex-col gap-5">
                <div data-balance-guide="board" className="order-2">
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
                      scoreControl={scoreControl}
                      scores={canViewScores ? displayScores : undefined}
                      scoreMode={scoreMode}
                      planPremium={planPremium}
                      playerSessionInfo={playerSessionInfo}
                      samplePlayerIds={samplePlayerIds}
                      samplePrediction={sampleScores}
                      showPrediction={!flash && planPremium}
                      showPlayerCardScore={settings.showPlayerCardScore}
                      showPlayerCardInfo={settings.showPlayerCardInfo}
                      showTeamComparisonSummary={settings.showTeamComparisonSummary}
                      showPlayerSessionSummary={settings.showPlayerSessionSummary}
                      playerCardInfo={settings.playerCardInfo}
                    />
                  ) : (
                    <ClanBalanceRevealBoard
                      state={formation}
                      roster={rosterData}
                      pool={rosterPool}
                      serverNow={presentationNow}
                      snapshot={canViewScores ? displayScores : undefined}
                      scoreMode={scoreMode}
                      planPremium={planPremium}
                      playerSessionInfo={playerSessionInfo}
                      samplePlayerIds={samplePlayerIds}
                      samplePrediction={sampleScores}
                      showPrediction={!flash && planPremium}
                      showPlayerCardScore={settings.showPlayerCardScore}
                      showPlayerCardInfo={settings.showPlayerCardInfo}
                      showTeamComparisonSummary={settings.showTeamComparisonSummary}
                      showPlayerSessionSummary={settings.showPlayerSessionSummary}
                      playerCardInfo={settings.playerCardInfo}
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
                  endSessionControl={formation ? null : endSessionControl}
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
                {formation && formation.stage !== "complete" ? <div className="order-last">{endSessionControl}</div> : null}
              </div>
            ) : null}

            {mapScreen || session.phase === "match_live" ? <div className="my-4"><AuctionPurchases state={formation} /></div> : null}

            {session.phase === "editing" && mapScreen ? (
              <ClanBalancePrematchControls
                renderInsights={(map) => renderInsights(map, rosterData, true)}
                key={`${session.id}:${JSON.stringify(session.map_types)}`}
                gameSlug={gameSlug}
                clanId={clanId}
                session={session}
                canManage={canManage}
              />
            ) : null}
            {session.phase === "map_ban" ? (
              <div className="space-y-6">
                {triple ? (
                  <ClanBalanceMapBanClient
                    gameSlug={gameSlug}
                    clanId={clanId}
                    sessionId={session.id}
                    candidates={triple}
                    deadlineIso={session.map_ban_deadline_at}
                    resolvedMap={session.resolved_map_label}
                    serverNow={serverNow}
                    myChoiceIdx={myVote?.choice_idx ?? null}
                    tallies={tallyMapVotes(votes)}
                    canResolve={canManage}
                    heroBanEnabled={session.hero_ban_enabled}
                    renderInsights={(map) => renderInsights(map, rosterData, true)}
                  />
                ) : (
                  <p
                    role="status"
                    className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
                  >
                    맵 후보를 불러오지 못했습니다. 페이지를 새로고침해 주세요.
                  </p>
                )}
              </div>
            ) : null}

            {session.phase === "hero_ban" ? (
              <div className="space-y-6" data-balance-guide="hero-vote">
                {session.resolved_map_label ? (
                  <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-xs">
                    <Map className="size-4 text-primary" aria-hidden="true" />
                    <span className="text-muted-foreground">경기 맵</span>
                    <strong>{session.resolved_map_label}</strong>
                  </p>
                ) : null}
                {isOverwatchBalanceGame(gameSlug) ? (
                  <ClanBalanceHeroBanClient
                    key={session.id + ":" + session.hero_ban_deadline_at}
                    gameSlug={gameSlug} clanId={clanId} sessionId={session.id}
                    deadlineIso={session.hero_ban_deadline_at} serverNow={serverNow}
                    myVote={myHeroVote} allVotes={heroVotes} canResolve={canManage}
                    userId={userId} roster={rosterData}
                    bansPerTeam={parseBanSettings(session).heroBansPerTeam}
                    resolvedHeroes={session.banned_heroes}
                    renderInsights={canViewScores && !flash ? (bannedHeroes) => <BalanceTeamInsights
                      roster={rosterData} scores={displayScores} mode={scoreMode} map={session.resolved_map_label}
                      premium={planPremium} showMap bannedHeroes={bannedHeroes} /> : undefined}
                  />
                ) : canManage ? (
                  <Button onClick={() => runAction("경기를 시작했습니다.", () => skipHeroBanPhaseAction(gameSlug, clanId, session.id))}>경기 시작</Button>
                ) : null}
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
                <div className="flex flex-wrap justify-end gap-2">
                  {!flash && planPremium && settings.predictionEnabled ? <ClanBalancePredictionDrawer
                    key={session.id}
                    gameSlug={gameSlug} clanId={clanId} sessionId={session.id}
                    myPickTeam={myPickTeam} predictionCount={balancePredictions.length}
                    deadlineIso={session.prediction_deadline_at}
                    outcome={session.match_outcome} isParticipant={isRosterParticipant}
                  /> : null}
                  {canViewScores && canEditMscore ? <ClanBalanceScoreDrawer
                    key={`${session.id}:scores`} snapshotKey={maSyncKey}
                    gameSlug={gameSlug} clanId={clanId} sessionId={session.id}
                    roster={rosterData} initialSnapshot={maForUi} pool={[...rosterPool]}
                    canEdit={canEditMscore} planPremium={planPremium}
                  /> : null}
                </div>
                <div className={cn("grid items-start gap-6", canManage && "xl:grid-cols-[minmax(0,1fr)_280px]")}>
                  <ClanBalanceRosterBoard
                    roster={rosterData}
                    pool={rosterPool}
                    showPlayerCardScore={false}
                    showPlayerCardInfo={false}
                    showTeamComparisonSummary={false}
                    showPlayerSessionSummary={false}
                  />
                  <div className="space-y-4">
                    {flash ? <p className="text-xs text-muted-foreground">깜짝 내전은 세션 종료 후 기록을 남기지 않으며 코인 보상을 지급하지 않습니다.</p> : null}
                    {canManage && session.match_outcome === "pending" ? (
                      <ClanBalanceMatchOutcomeClient
                        gameSlug={gameSlug}
                        clanId={clanId}
                        sessionId={session.id}
                        disabled={false}
                        predictionEnabled={!flash && planPremium && settings.predictionEnabled}
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
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {session && (mapScreen || session.phase !== "editing") ? <div className="px-5 pb-5">{endSessionControl}</div> : null}
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
