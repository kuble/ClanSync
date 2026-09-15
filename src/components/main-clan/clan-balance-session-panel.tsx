"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Crown,
  Gamepad2,
  Map,
  Radio,
  Shield,
  Swords,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  closeBalanceSessionAction,
  openBalanceSessionAction,
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
import { ClanBalanceRosterEditor } from "./clan-balance-roster-editor";
import { ClanBalanceSessionRealtime } from "./clan-balance-session-realtime";
import { Button } from "@/components/ui/button";
import { defaultMaForRoster, parseMaSnapshot } from "@/lib/balance/ma-snapshot";
import { isOverwatchBalanceGame, owHeroLabel } from "@/lib/balance/ow-hero-ban";
import {
  EMPTY_ROSTER,
  parseRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";
import { tallyMapVotes } from "@/lib/balance/weighted-map-pick";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type BalanceSession = Database["public"]["Tables"]["balance_sessions"]["Row"];
type MapVote = Database["public"]["Tables"]["balance_session_map_votes"]["Row"];
type HeroVote =
  Database["public"]["Tables"]["balance_session_hero_votes"]["Row"];
type BalancePrediction =
  Database["public"]["Tables"]["balance_session_predictions"]["Row"];

function Workflow({ phase }: { phase: BalanceSession["phase"] | null }) {
  const activeStep =
    phase === "match_live"
      ? 2
      : phase === "map_ban" || phase === "hero_ban"
        ? 1
        : 0;
  return (
    <ol
      aria-label="밸런스 진행 단계"
      className="grid grid-cols-3 gap-1 border-b px-3 sm:px-5"
    >
      {["① 편집 중", "② 참가자 · 밴픽", "③ 경기 진행"].map((label, index) => (
        <li
          key={label}
          aria-current={index === activeStep ? "step" : undefined}
          className={cn(
            "flex min-h-14 items-center justify-center gap-1.5 border-b-2 px-1 text-center text-[11px] font-semibold sm:text-xs",
            index === activeStep
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          {index < activeStep ? (
            <Check className="hidden size-3.5 sm:block" aria-hidden="true" />
          ) : null}
          {label}
        </li>
      ))}
    </ol>
  );
}

export function ClanBalanceSessionPanel({
  gameSlug,
  clanId,
  userId,
  canManage,
  hostNickname,
  session,
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
  votes: MapVote[];
  heroVotes: HeroVote[];
  balancePredictions: BalancePrediction[];
  rosterPool: readonly { user_id: string; nickname: string }[];
  canEditMscore: boolean;
  planPremium: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dirtyRosterKey, setDirtyRosterKey] = useState<string | null>(null);
  const storeHref = `/games/${gameSlug}/clan/${clanId}/store`;

  function onOpenSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await openBalanceSessionAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("밸런스 세션이 열렸습니다.");
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
  const rosterEditorKey = session
    ? `${session.id}:${JSON.stringify(session.roster)}`
    : "";
  const rosterDirty =
    dirtyRosterKey === rosterEditorKey && Boolean(rosterEditorKey);
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
      />
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Swords className="size-4 text-primary" aria-hidden="true" />
            {session?.phase === "match_live" ? "경기 현황" : "밸런스 편집"}
          </h3>
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
        </div>
        <Workflow phase={session?.phase ?? null} />

        {!session ? (
          canManage ? (
            <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>5 vs 5 · 탱커 1 / 딜러 2 / 힐러 2</span>
                  <span>{rosterPool.length}명 참여 가능</span>
                </div>
                <ClanBalanceRosterBoard
                  roster={EMPTY_ROSTER}
                  pool={rosterPool}
                />
              </div>
              <form
                onSubmit={onOpenSession}
                className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5"
              >
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Gamepad2 className="size-4" aria-hidden="true" />새 경기
                    준비
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    밴픽 옵션을 선택하고 세션을 열어 참가자를 배치하세요.
                  </p>
                </div>
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-[11px] font-semibold text-muted-foreground">
                    밴픽 설정
                  </legend>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3 py-3 text-xs">
                    <input
                      type="checkbox"
                      name="mapBan"
                      defaultChecked
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="font-semibold">맵 밴 사용</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        3개 후보에 투표해 경기 맵을 정합니다.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3 py-3 text-xs">
                    <input
                      type="checkbox"
                      name="heroBan"
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="font-semibold">영웅 밴 포함</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        참가자가 제외할 영웅에 투표합니다.
                      </span>
                    </span>
                  </label>
                </fieldset>
                <div className="mt-auto border-t pt-4">
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? "세션 여는 중…" : "세션 열기"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                  <p className="mt-3 text-center text-[10px] text-muted-foreground">
                    클랜당 하나의 세션을 진행할 수 있습니다.
                  </p>
                </div>
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
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  {canManage ? (
                    <ClanBalanceRosterEditor
                      key={rosterEditorKey}
                      gameSlug={gameSlug}
                      clanId={clanId}
                      sessionId={session.id}
                      initialRoster={rosterData}
                      pool={[...rosterPool]}
                      canEdit
                      onDirtyChange={(dirty) =>
                        setDirtyRosterKey(dirty ? rosterEditorKey : null)
                      }
                    />
                  ) : (
                    <ClanBalanceRosterBoard
                      roster={rosterData}
                      pool={rosterPool}
                    />
                  )}
                </div>
                <aside className="space-y-4">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold">
                      <CircleHelp
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      편성 가이드
                    </h4>
                    <ul className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
                      <li>
                        <strong className="mb-1 block text-foreground">
                          5 vs 5 역할 고정
                        </strong>
                        팀마다 탱커 1명, 딜러 2명, 힐러 2명을 배치합니다.
                      </li>
                      <li>
                        <strong className="mb-1 block text-foreground">
                          멤버 선택 · 끌어놓기
                        </strong>
                        아래 목록에서 멤버를 골라 양 팀 슬롯에 배치하세요.
                      </li>
                      <li>
                        <strong className="mb-1 block text-foreground">
                          배치 저장 후 진행
                        </strong>
                        밴픽을 시작하면 출전 명단은 변경할 수 없습니다.
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="text-xs font-semibold">배치 확정</h4>
                    <dl className="my-4 space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">
                          저장된 출전 인원
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {rosterCount} / 10
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">맵 밴</dt>
                        <dd>
                          {session.map_ban_enabled ? "사용" : "사용 안 함"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">영웅 밴</dt>
                        <dd>
                          {session.hero_ban_enabled ? "사용" : "사용 안 함"}
                        </dd>
                      </div>
                    </dl>
                    {canManage ? (
                      <Button
                        type="button"
                        disabled={pending || rosterDirty}
                        className="h-auto min-h-10 w-full whitespace-normal text-xs"
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
                          ? "맵 밴 시작 (후보 3곳)"
                          : "맵 밴 없이 경기 화면으로"}
                        <ArrowRight
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        운영진이 편성을 마치면 밴픽이 시작됩니다.
                      </p>
                    )}
                    {rosterDirty ? (
                      <p
                        role="status"
                        className="mt-2 text-[11px] text-amber-700 dark:text-amber-300"
                      >
                        먼저 변경한 배치를 저장하세요.
                      </p>
                    ) : null}
                  </div>
                </aside>
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
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={pending}
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
