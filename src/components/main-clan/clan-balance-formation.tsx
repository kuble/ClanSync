"use client";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Crown, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateFormationAction } from "@/app/actions/clan-balance-formation";
import {
  ROLE_LABEL, TEAM_LABEL, canFit, canControlTeam, draftTurn, getFormationDeadline,
  type FormationSettings, type Team, type FormationState, type FormationCommand,
} from "@/lib/balance/formation";
import { useServerClock } from "@/lib/balance/use-server-clock";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import { BalanceAuctionStage } from "./balance-auction-stage";
import { cn } from "@/lib/utils";

export function ClanBalanceFormation({
  gameSlug, clanId, roundId, revision, drawHistoryLength, state, settings, bans,
  pool, userId, canManage, readOnly = false, beforeStart, onPendingChange,
  serverNow, preferencePending = false, endSessionControl,
}: {
  serverNow: number; preferencePending?: boolean; endSessionControl?: ReactNode;
  gameSlug: string; clanId: string; roundId: string; revision: number; drawHistoryLength: number;
  state: FormationState | null; settings: FormationSettings;
  bans: { mapBan: boolean; heroBan: boolean };
  pool: readonly { user_id: string; nickname: string }[];
  userId: string; canManage: boolean; readOnly?: boolean;
  beforeStart?: () => Promise<{ ok: true; revision: number; roster: BalanceRoster } | { ok: false }>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [progressError, setProgressError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const revealEnd = state?.draw && (state.draw.roleMode === "lottery" || state.mode === "random")
    ? state.draw.startedAt + state.draw.durationMs : 0;
  const deadline = state ? getFormationDeadline(state) : null;
  const now = useServerClock(serverNow, Math.max(revealEnd, deadline ?? 0), 100);
  const names = new Map(pool.map((player) => [player.user_id, player.nickname]));
  const name = (id: string) => names.get(id) ?? "탈퇴한 멤버";
  const manager = canManage && !readOnly;
  const canTeam = (team: Team) => !readOnly && Boolean(state && canControlTeam(state, { id: userId, manager }, team));
  const revealing = now < revealEnd;
  const due = !readOnly && deadline !== null && now >= deadline;

  // Each member may request a clock check; server time and CAS decide the result.
  useEffect(() => {
    if (!due || pending) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const result = await updateFormationAction(gameSlug, clanId, roundId, revision, { type: "tick" });
        if (cancelled) return;
        setProgressError(result.ok ? null : result.error);
        router.refresh();
      } catch {
        if (!cancelled) setProgressError("연결을 확인하고 있습니다. 복구되면 자동으로 이어집니다.");
      }
      if (!cancelled) timer = setTimeout(tick, 1500);
    }
    timer = setTimeout(tick, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [due, pending, gameSlug, clanId, roundId, revision, router, retry]);

  function run(command: FormationCommand) {
    start(async () => {
      onPendingChange?.(true);
      try {
        const flushed = command.type === "start" && beforeStart ? await beforeStart() : { ok: true as const, revision };
        if (!flushed.ok) return;
        const result = await updateFormationAction(gameSlug, clanId, roundId, Math.max(revision, flushed.revision),
          command.type === "start" && "roster" in flushed ? { ...command, expectedRoster: flushed.roster, expectedBans: bans }
            : command.type === "choose-item" ? { ...command, expectedDrawId: state?.draw?.id } : command);
        if (!result.ok) toast.error(result.error);
        router.refresh();
      } catch {
        toast.error("연결을 확인한 뒤 다시 시도하세요.");
      } finally {
        onPendingChange?.(false);
      }
    });
  }

  if (!state) return <section data-testid="balance-formation" data-balance-guide="primary" className="order-last mt-5 flex flex-wrap items-center justify-between gap-3">
    {endSessionControl ?? <span />}
    {manager ? <Button disabled={pending || preferencePending} onClick={() => run({ type: "start", setup: settings, expectedDrawHistoryLength: drawHistoryLength })}>
      {pending ? "처리 중…" : settings.roles === "lottery" || settings.teams === "random" ? "추첨 시작" : settings.teams === "draft" || settings.teams === "auction" ? "편성 진행" : "다음 단계"}
    </Button> : <p className="text-xs text-muted-foreground">운영진이 편성을 준비하고 있습니다.</p>}
  </section>;

  if (state.stage === "complete") return <section data-testid="balance-formation" data-balance-guide="primary" className="order-last mt-4 flex flex-wrap items-center justify-between gap-3">
    {endSessionControl ?? <span />}
    {progressError ? <div role="status" className="space-y-2 text-xs text-muted-foreground"><p>{progressError}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>다음 단계 다시 시도</Button></div> : <p role="status" className="text-xs text-muted-foreground">{revealing ? "현재 화면에서 추첨 결과를 공개하고 있습니다." : "다음 단계로 이동하고 있습니다."}</p>}
  </section>;

  const turn = state.stage === "draft" ? draftTurn(state) : null;
  return <section data-testid="balance-formation" data-balance-guide="primary" aria-label={turn ? "주장 지명" : "팀원 경매"} className="order-1 mt-3 space-y-4 rounded-2xl border border-primary/20 bg-muted/10 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold"><Crown className="size-4 text-primary" aria-hidden="true" />{state.pausedAt !== null ? "편성 일시정지" : turn ? "주장 지명" : "팀원 경매"}</h3>
      {manager ? <Button size="icon" variant="ghost" disabled={pending || revealing} title={state.pausedAt !== null ? "편성 재개" : "편성 일시정지"} aria-label={state.pausedAt !== null ? "편성 재개" : "편성 일시정지"} onClick={() => run({ type: state.pausedAt !== null ? "resume" : "pause" })}>{state.pausedAt !== null ? <Play className="size-4" /> : <Pause className="size-4" />}</Button> : null}
    </div>
    {turn ? <>
      <div className={cn("rounded-xl border p-5 text-center", turn === "team1" ? "border-sky-500/30 bg-sky-500/5" : "border-rose-500/30 bg-rose-500/5")} aria-live="polite">
        <p className="text-xs text-muted-foreground">{state.picks + 1}번째 지명 / 8</p>
        <h4 className={cn("mt-2 text-xl font-bold", turn === "team1" ? "text-sky-400" : "text-rose-400")}>{TEAM_LABEL[turn]} · {state.captains ? name(state.captains[turn === "team1" ? 0 : 1]) : "주장"}</h4>
        <p className="mt-2 text-xs text-muted-foreground">{canTeam(turn) ? "함께할 팀원을 선택하세요." : "현재 차례의 주장이 팀원을 선택하고 있습니다."}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" aria-label="지명 가능한 선수">{state.remaining.map((id) => <Button variant="outline" className="h-auto min-h-12 justify-between gap-2 px-3 py-3" key={id} disabled={pending || revealing || state.pausedAt !== null || !canTeam(turn) || !canFit(state, turn, id)} onClick={() => run({ type: "pick", player: id })}><span className="truncate">{name(id)}</span><span className="shrink-0 text-xs text-muted-foreground">{ROLE_LABEL[state.players.find((player) => player.id === id)!.role]}</span></Button>)}</div>
    </> : <BalanceAuctionStage state={state} now={now} pending={pending} revealing={revealing} name={name} canTeam={canTeam} run={run} />}
    {progressError ? <p role="status" className="text-xs text-amber-500">{progressError}</p> : null}
  </section>;
}
