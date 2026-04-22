"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  closeBalanceSessionAction,
  openBalanceSessionAction,
  skipHeroBanPhaseAction,
  skipMapBanToMatchLiveAction,
  startMapBanPhaseAction,
  type BalanceSessionActionResult,
} from "@/app/actions/clan-balance-session";
import {
  ClanBalancePredictionPlaceholder,
} from "@/components/main-clan/clan-balance-match-live-placeholders";
import { ClanBalanceHeroBanClient } from "@/components/main-clan/clan-balance-hero-ban-client";
import {
  ClanBalanceMatchOutcomeClient,
  ClanBalancePredictionClient,
} from "@/components/main-clan/clan-balance-prediction-outcome-client";
import { ClanBalanceMaEditor } from "@/components/main-clan/clan-balance-ma-editor";
import { ClanBalanceMapBanClient } from "@/components/main-clan/clan-balance-map-ban-client";
import { ClanBalanceRosterBoard } from "@/components/main-clan/clan-balance-roster-board";
import { ClanBalanceRosterEditor } from "@/components/main-clan/clan-balance-roster-editor";
import { ClanBalanceSessionRealtime } from "@/components/main-clan/clan-balance-session-realtime";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  defaultMaForRoster,
  parseMaSnapshot,
} from "@/lib/balance/ma-snapshot";
import { isOverwatchBalanceGame, owHeroLabel } from "@/lib/balance/ow-hero-ban";
import { parseRoster, rosterAssignedUserIds } from "@/lib/balance/roster-schema";
import { tallyMapVotes } from "@/lib/balance/weighted-map-pick";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type BalanceSession = Database["public"]["Tables"]["balance_sessions"]["Row"];
type MapVote = Database["public"]["Tables"]["balance_session_map_votes"]["Row"];
type HeroVote = Database["public"]["Tables"]["balance_session_hero_votes"]["Row"];
type BalancePrediction =
  Database["public"]["Tables"]["balance_session_predictions"]["Row"];

const PHASE_LABEL: Record<
  Database["public"]["Enums"]["balance_session_phase"],
  string
> = {
  editing: "① 편집 중",
  map_ban: "② 맵 밴픽",
  hero_ban: "② 영웅 밴픽",
  match_live: "③ 경기 진행",
};

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

  if (!session) {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-dashed p-6">
          <p className="text-muted-foreground text-sm">
            진행 중인 밸런스 세션이 없습니다. 운영진이 세션을 열면 맵 밴·경기
            단계로 이어집니다.
          </p>
          {canManage ? (
            <form className="mt-4 space-y-4" onSubmit={onOpenSession}>
              <fieldset className="space-y-2 text-sm">
                <legend className="text-foreground mb-2 font-medium">
                  새 세션 옵션
                </legend>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="mapBan"
                    defaultChecked
                    className="size-4 rounded border-input"
                  />
                  맵 밴 사용 (3후보 투표 → 가중 확정)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="heroBan"
                    className="size-4 rounded border-input"
                  />
                  영웅 밴 포함 (맵 확정 후 준비 중 단계로 이동)
                </label>
              </fieldset>
              <Button type="submit" disabled={pending}>
                세션 열기
              </Button>
            </form>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              세션을 열려면 클랜 운영진 권한이 필요합니다.
            </p>
          )}
        </section>
        <p className="text-muted-foreground text-sm">
          코인 내역은{" "}
          <Link
            href={storeHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            스토어
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const tallies = tallyMapVotes(votes);
  const myVote = votes.find((v) => v.user_id === userId);
  const candidates = session.map_candidates;
  const triple =
    candidates && candidates.length === 3
      ? ([candidates[0]!, candidates[1]!, candidates[2]!] as [
          string,
          string,
          string,
        ])
      : null;

  const rosterData = parseRoster(session.roster);
  const isRosterParticipant = new Set(rosterAssignedUserIds(rosterData)).has(
    userId,
  );
  const rosterEditorKey = `${session.id}:${JSON.stringify(session.roster)}`;
  const maForUi = defaultMaForRoster(
    rosterData,
    parseMaSnapshot(session.ma_snapshot),
  );
  const maSyncKey = `${session.id}:${JSON.stringify(session.ma_snapshot)}`;
  const myHeroVote = heroVotes.find((v) => v.user_id === userId) ?? null;
  const heroBanSyncKey = `${session.id}:${JSON.stringify(heroVotes)}`;
  const myPrediction =
    balancePredictions.find((p) => p.user_id === userId) ?? null;
  const myPickTeam: 1 | 2 | null =
    myPrediction?.pick_team === 1
      ? 1
      : myPrediction?.pick_team === 2
        ? 2
        : null;

  return (
    <div className="space-y-6">
      <ClanBalanceSessionRealtime sessionId={session.id} />
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
        )}
      >
        <span className="font-medium">{PHASE_LABEL[session.phase]}</span>
        <span className="text-muted-foreground text-xs">
          호스트{hostNickname ? `: ${hostNickname}` : ""}
        </span>
      </div>

      {session.phase === "editing" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">① 편집 중</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            5v5(탱1·딜2·힐2 × 양팀) 슬롯에 활동 멤버를 배치합니다. 저장 후 맵
            밴·경기 단계로 진행하세요.
          </p>
          <div className="mt-4">
            {canManage ? (
              <ClanBalanceRosterEditor
                key={rosterEditorKey}
                gameSlug={gameSlug}
                clanId={clanId}
                sessionId={session.id}
                initialRoster={rosterData}
                pool={[...rosterPool]}
                canEdit
              />
            ) : (
              <ClanBalanceRosterBoard roster={rosterData} pool={rosterPool} />
            )}
          </div>
          {canManage ? (
            <div className="mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
              {session.map_ban_enabled ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction("맵 밴을 시작했습니다.", () =>
                      startMapBanPhaseAction(gameSlug, clanId, session.id),
                    )
                  }
                >
                  맵 밴 시작 (후보 3곳)
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction("경기 화면으로 이동했습니다.", () =>
                      skipMapBanToMatchLiveAction(gameSlug, clanId, session.id),
                    )
                  }
                >
                  맵 밴 없이 경기 화면으로
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-xs">
              다음 단계 진행은 운영진만 할 수 있습니다.
            </p>
          )}
        </section>
      ) : null}

      {session.phase === "map_ban" && triple && session.map_ban_deadline_at ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">② 맵 밴픽</h3>
          <p className="text-muted-foreground mt-2 text-xs">확정된 배치</p>
          <div className="mt-2">
            <ClanBalanceRosterBoard roster={rosterData} pool={rosterPool} />
          </div>
          <div className="mt-4">
            <ClanBalanceMapBanClient
              gameSlug={gameSlug}
              clanId={clanId}
              sessionId={session.id}
              candidates={triple}
              deadlineIso={session.map_ban_deadline_at}
              myChoiceIdx={myVote?.choice_idx ?? null}
              tallies={tallies}
              canResolve={canManage}
            />
          </div>
        </section>
      ) : null}

      {session.phase === "hero_ban" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">② 영웅 밴픽</h3>
          <div className="mt-2">
            <ClanBalanceRosterBoard roster={rosterData} pool={rosterPool} />
          </div>
          {isOverwatchBalanceGame(gameSlug) ? (
            <div className="mt-4">
              <ClanBalanceHeroBanClient
                gameSlug={gameSlug}
                clanId={clanId}
                sessionId={session.id}
                deadlineIso={session.hero_ban_deadline_at}
                myVote={myHeroVote}
                allVotes={heroVotes}
                canResolve={canManage}
                isRosterParticipant={isRosterParticipant}
                syncKey={heroBanSyncKey}
              />
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              이 게임에서는 영웅 밴 풀이 아직 없습니다. 운영진이 건너뛰면 경기
              화면으로 이동합니다.
            </p>
          )}
          {canManage ? (
            <Button
              type="button"
              className="mt-4"
              variant="secondary"
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
        </section>
      ) : null}

      {session.phase === "match_live" ? (
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-medium tracking-tight">③ 경기 진행</h3>
          <p className="mt-2 text-sm">
            {session.resolved_map_label ? (
              <>
                확정 맵:{" "}
                <strong className="font-semibold">
                  {session.resolved_map_label}
                </strong>
              </>
            ) : (
              <span className="text-muted-foreground">
                맵 밴 없이 진입했습니다. 라인업·M/A·승부예측·결과 확정 UI는
                아래에서 이어집니다.
              </span>
            )}
          </p>
          {session.banned_heroes && session.banned_heroes.length > 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              밴 영웅:{" "}
              <span className="text-foreground">
                {session.banned_heroes.map((id) => owHeroLabel(id)).join(", ")}
              </span>
            </p>
          ) : null}
          <p className="text-muted-foreground mt-3 text-xs">라인업</p>
          <div className="mt-2">
            <ClanBalanceRosterBoard roster={rosterData} pool={rosterPool} />
          </div>
          <h4 className="text-muted-foreground mt-6 text-xs font-medium tracking-tight">
            M / A 스냅샷
          </h4>
          <div className="mt-2">
            <ClanBalanceMaEditor
              gameSlug={gameSlug}
              clanId={clanId}
              sessionId={session.id}
              roster={rosterData}
              initialSnapshot={maForUi}
              pool={[...rosterPool]}
              canEdit={canEditMscore}
              planPremium={planPremium}
              syncKey={maSyncKey}
            />
          </div>
          <div
            className={cn(
              "mt-6 grid gap-4",
              canManage && "md:grid-cols-2",
            )}
          >
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">승부예측</CardTitle>
                  <CardDescription>
                    {session.match_outcome === "void"
                      ? "이번 판은 무효입니다. 예측은 적용되지 않습니다."
                      : session.match_outcome === "team1"
                        ? "결과 확정: 블루(팀1) 승. Premium 적중자에게 코인이 지급되었습니다."
                        : "결과 확정: 레드(팀2) 승. Premium 적중자에게 코인이 지급되었습니다."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            {canManage ? (
              session.match_outcome === "pending" ? (
                <ClanBalanceMatchOutcomeClient
                  gameSlug={gameSlug}
                  clanId={clanId}
                  sessionId={session.id}
                  disabled={false}
                />
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">경기 결과</CardTitle>
                    <CardDescription>
                      {session.match_outcome === "void"
                        ? "무효(재경기)로 확정됨."
                        : session.match_outcome === "team1"
                          ? "블루(팀1) 승으로 확정됨."
                          : "레드(팀2) 승으로 확정됨."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            ) : null}
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={pending}
              onClick={() =>
                runAction("세션을 종료했습니다.", () =>
                  closeBalanceSessionAction(gameSlug, clanId, session.id),
                )
              }
            >
              세션 종료
            </Button>
          ) : null}
        </section>
      ) : null}

      <p className="text-muted-foreground text-sm">
        코인:{" "}
        <Link
          href={storeHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          스토어
        </Link>
      </p>
    </div>
  );
}
