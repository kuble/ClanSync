"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateFormationAction } from "@/app/actions/clan-balance-formation";
import {
  ROLE_LABEL,
  TEAM_LABEL,
  canFit,
  draftTurn,
  maxBid,
  type FormationSettings,
  type Team,
  type FormationState,
  type FormationCommand,
} from "@/lib/balance/formation";
import { useServerClock } from "@/lib/balance/use-server-clock";
import type { ReactNode } from "react";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
const inputClass =
  "min-h-10 w-full rounded-lg border bg-background px-3 text-xs";
export function ClanBalanceFormation({
  gameSlug,
  clanId,
  roundId,
  revision,
  drawHistoryLength,
  state,
  settings,
  bans,
  pool,
  userId,
  canManage,
  readOnly = false,
  beforeStart,
  onPendingChange,
  serverNow,
  preferencePending = false,
  endSessionControl,
}: {
  serverNow: number;
  preferencePending?: boolean;
  endSessionControl?: ReactNode;
  gameSlug: string;
  clanId: string;
  roundId: string;
  revision: number;
  drawHistoryLength: number;
  state: FormationState | null;
  settings: FormationSettings;
  bans: { mapBan: boolean; heroBan: boolean };
  pool: readonly { user_id: string; nickname: string }[];
  userId: string;
  canManage: boolean;
  readOnly?: boolean;
  beforeStart?: () => Promise<
    { ok: true; revision: number; roster: BalanceRoster } | { ok: false }
  >;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [bidDraft, setBidDraft] = useState({ lot: "", value: 10 });
  const lotKey = `${state?.auction?.player}:${state?.auction?.startedAt}`;
  const bidInput =
    bidDraft.lot === lotKey ? bidDraft.value : (state?.settings?.minBid ?? 10);
  const revealEnd =
    state?.draw &&
    (state.draw.roleMode === "lottery" || state.mode === "random")
      ? state.draw.startedAt + state.draw.durationMs
      : 0;
  const now = useServerClock(
    serverNow,
    Math.max(revealEnd, state?.auction?.deadline ?? 0),
    200,
  );
  const names = new Map(pool.map((p) => [p.user_id, p.nickname]));
  const name = (id: string) => names.get(id) ?? "탈퇴한 멤버";
  const manager = canManage && !readOnly;
  const canTeam = (team: Team) =>
    !readOnly &&
    (manager || state?.captains?.[team === "team1" ? 0 : 1] === userId);
  const revealing = now < revealEnd;
  const increment = state?.settings?.minBid ?? 10;
  function run(command: FormationCommand) {
    start(async () => {
      onPendingChange?.(true);
      try {
        const flushed =
          command.type === "start" && beforeStart
            ? await beforeStart()
            : { ok: true as const, revision };
        if (!flushed.ok) return;
        const result = await updateFormationAction(
          gameSlug,
          clanId,
          roundId,
          Math.max(revision, flushed.revision),
          command.type === "start" && "roster" in flushed
            ? { ...command, expectedRoster: flushed.roster, expectedBans: bans }
            : command,
        );
        if (!result.ok) toast.error(result.error);
        router.refresh();
      } catch {
        toast.error("연결을 확인한 뒤 다시 시도하세요.");
      } finally {
        onPendingChange?.(false);
      }
    });
  }
  const turn = state?.stage === "draft" ? draftTurn(state) : null;
  const lot = state?.auction;
  const seconds = lot
    ? Math.max(
        0,
        Math.ceil(
          (lot.deadline - (state?.pausedAt ?? (now || lot.startedAt))) / 1000,
        ),
      )
    : 0;
  if (!state)
    return (
      <section
        data-testid="balance-formation"
        data-balance-guide="primary"
        className="mt-5 flex flex-wrap items-center justify-between gap-3"
      >
        {endSessionControl ?? <span />}
        {manager ? (
          <Button
            disabled={pending || preferencePending}
            onClick={() =>
              run({
                type: "start",
                setup: settings,
                expectedDrawHistoryLength: drawHistoryLength,
              })
            }
          >
            {pending ? "편성 중…" : "편성 시작"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            운영진이 편성을 준비하고 있습니다.
          </p>
        )}
      </section>
    );
  return (
    <section data-testid="balance-formation" className={state.stage === "complete" ? "hidden" : "mt-4 space-y-4"}>
      {endSessionControl}
      {manager ? (
        <div className="flex justify-end gap-1">
          {state.stage !== "complete" ? (
            <Button
              size="icon"
              variant="ghost"
              disabled={pending || revealing}
              title={state.pausedAt !== null ? "편성 재개" : "편성 일시정지"}
              aria-label={
                state.pausedAt !== null ? "편성 재개" : "편성 일시정지"
              }
              onClick={() =>
                run({ type: state.pausedAt !== null ? "resume" : "pause" })
              }
            >
              {state.pausedAt !== null ? (
                <Play className="size-4" />
              ) : (
                <Pause className="size-4" />
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
      {state.stage !== "complete" ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 p-4"
          aria-live="polite"
        >
          <strong className="text-sm">
            {state.pausedAt !== null
              ? "편성 일시정지"
              : turn
                ? TEAM_LABEL[turn] + " 지명 차례 · " + (state.picks + 1) + "/8"
                : "팀원 경매"}
          </strong>
          {state.captains ? (
            <span className="text-xs text-muted-foreground">
              {name(state.captains[0])} vs {name(state.captains[1])}
            </span>
          ) : null}
        </div>
      ) : null}
      {turn ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {state.remaining.map((id) => (
            <Button
              variant="outline"
              className="h-auto justify-between px-3 py-3"
              key={id}
              disabled={
                pending ||
                revealing ||
                state.pausedAt !== null ||
                !canTeam(turn) ||
                !canFit(state, turn, id)
              }
              onClick={() => run({ type: "pick", player: id })}
            >
              <span>{name(id)}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABEL[state.players.find((p) => p.id === id)!.role]}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
      {state.stage === "auction" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["team1", "team2"] as const).map((t) => (
            <div
              className={`rounded-xl border p-4 ${t === "team1" ? "border-blue-500/25 bg-blue-500/5" : "border-rose-500/25 bg-rose-500/5"}`}
              key={t}
            >
              <span className="text-xs">{TEAM_LABEL[t]} 남은 크레딧</span>
              <strong className="mt-1 block text-2xl tabular-nums">
                {state.budgets[t].toLocaleString()}
                <small className="ml-1 text-xs">P</small>
              </strong>
            </div>
          ))}
        </div>
      ) : null}
      {state.stage === "auction" ? (
        <div className="rounded-xl border bg-card p-5 text-center">
          {lot ? (
            <>
              <p className="text-xs text-muted-foreground">
                {lot.retry ? "재경매" : "현재 경매 선수"} ·{" "}
                {
                  ROLE_LABEL[
                    state.players.find((p) => p.id === lot.player)!.role
                  ]
                }
              </p>
              <h5 className="my-3 text-2xl font-bold">{name(lot.player)}</h5>
              <p className="mb-4 text-sm">
                <strong className="text-primary">{lot.bid}P</strong> ·{" "}
                {lot.team ? TEAM_LABEL[lot.team] : "입찰 대기"} ·{" "}
                <span className="tabular-nums">{seconds}초</span>
              </p>
              {!readOnly && (manager || state.captains?.includes(userId)) ? (
                <div className="mx-auto max-w-md space-y-2">
                  <input
                    type="number"
                    aria-label="입찰 크레딧"
                    min={lot.bid + increment}
                    step={increment}
                    value={Math.max(bidInput, lot.bid + increment)}
                    onChange={(e) =>
                      setBidDraft({
                        lot: lotKey,
                        value: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    {(["team1", "team2"] as const)
                      .filter(canTeam)
                      .map((team) => (
                        <Button
                          key={team}
                          className="flex-1"
                          disabled={
                            pending ||
                            revealing ||
                            state.pausedAt !== null ||
                            seconds === 0 ||
                            !canFit(state, team, lot.player) ||
                            maxBid(state, team) <
                              Math.max(bidInput, lot.bid + increment)
                          }
                          onClick={() =>
                            run({
                              type: "bid",
                              team,
                              amount: Math.max(bidInput, lot.bid + increment),
                            })
                          }
                        >
                          {TEAM_LABEL[team]} 입찰
                        </Button>
                      ))}
                  </div>
                </div>
              ) : null}
              {manager ? (
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={
                    pending ||
                    revealing ||
                    seconds > 0 ||
                    state.pausedAt !== null
                  }
                  onClick={() => run({ type: "settle" })}
                >
                  경매 마감
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                남은 선수 {state.remaining.length}명
              </p>
              {manager ? (
                <Button
                  disabled={pending || revealing || state.pausedAt !== null}
                  onClick={() => run({ type: "lot" })}
                >
                  다음 선수 공개
                </Button>
              ) : (
                <p className="text-xs">다음 선수를 기다리고 있습니다.</p>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
