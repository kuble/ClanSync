"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Coins, Crown, Equal, RotateCcw, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  setBalanceMatchOutcomeAction,
  submitBalancePredictionAction,
} from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClanBalanceRosterBoard } from "./clan-balance-roster-board";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type MatchOutcome = Database["public"]["Enums"]["balance_match_outcome"];

export function ClanBalancePredictionClient({
  gameSlug,
  clanId,
  sessionId,
  myPickTeam,
  predictionCount,
  deadlineIso,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  myPickTeam: 1 | 2 | 3 | null;
  predictionCount: number;
  deadlineIso: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const deadlineMs = deadlineIso ? new Date(deadlineIso).getTime() : null;
  useEffect(() => {
    if (deadlineMs === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [deadlineMs]);
  const remainSec =
    deadlineMs === null || now === null
      ? null
      : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec === 0;

  function submit(pick: 1 | 2 | 3) {
    start(async () => {
      const r = await submitBalancePredictionAction(
        gameSlug,
        clanId,
        sessionId,
        pick,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("예측이 저장되었습니다.");
      router.refresh();
    });
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.025]"
      aria-label="승부예측"
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="size-4 text-amber-500" aria-hidden="true" />
            승부예측
          </h4>
          <span className="text-[10px] font-bold text-primary">Premium</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          블루 승·레드 승·무승부 중 예측하세요. 비출전 멤버만 참여할 수 있습니다.
        </p>
        {deadlineIso ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="size-3.5" aria-hidden="true" />
              예측 마감
            </span>
            <strong className="tabular-nums">
              {remainSec === null
                ? "—"
                : expired
                  ? "마감됨"
                  : Math.floor(remainSec / 60) +
                    ":" +
                    String(remainSec % 60).padStart(2, "0")}
            </strong>
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((team) => (
            <button
              key={team}
              type="button"
              aria-pressed={myPickTeam === team}
              disabled={pending || expired}
              onClick={() => submit(team)}
              className={cn(
                "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
                team === 1
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : team === 2
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                myPickTeam === team && "ring-2 ring-current",
              )}
            >
              {myPickTeam === team ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Trophy className="size-4" aria-hidden="true" />
              )}
              {team === 1 ? "블루(팀1) 승" : team === 2 ? "레드(팀2) 승" : "무승부"}
            </button>
          ))}
        </div>
        <p
          role="status"
          className="text-center text-[11px] text-muted-foreground"
        >
          {predictionCount}명 참여
          {myPickTeam
            ? " · " + (myPickTeam === 1 ? "블루 승" : myPickTeam === 2 ? "레드 승" : "무승부") + " 선택됨"
            : ""}
        </p>
      </div>
      <div className="border-t border-primary/10 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Coins className="size-3.5 text-amber-500" aria-hidden="true" />
          적중 보상 5코인
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          경기 결과 확정 후 클랜 코인 풀에서 지급됩니다. 마감 전까지 선택을 바꿀
          수 있습니다.
        </p>
      </div>
    </section>
  );
}

export function ClanBalanceMatchOutcomeClient({ gameSlug, clanId, sessionId, roster, pool, disabled, snapshot, renderScore }: {
  gameSlug: string; clanId: string; sessionId: string; roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  disabled: boolean; snapshot?: import("@/lib/balance/ma-snapshot").MaSnapshot; renderScore?: (userId: string) => import("react").ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Exclude<MatchOutcome, "pending"> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const label = outcome === "team1" ? "블루 팀 승리" : outcome === "team2" ? "레드 팀 승리" : outcome === "draw" ? "무승부" : outcome === "void" ? "무효 · 재경기" : null;
  function confirm() {
    if (!outcome || pending || disabled) return;
    start(async () => {
      try {
        const result = await setBalanceMatchOutcomeAction(gameSlug, clanId, sessionId, outcome);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(label + "로 확정했습니다.");
        setConfirmOpen(false);
        router.refresh();
      } catch { toast.error("결과를 저장하지 못했습니다. 다시 시도하세요."); }
    });
  }
  function choose(value: Exclude<MatchOutcome, "pending">) { setOutcome(value); setConfirmOpen(true); }
  return <div className="space-y-3" data-testid="balance-match-result">
    <ClanBalanceRosterBoard roster={roster} pool={pool} outcome={outcome ?? "pending"}
      onTeamSelect={choose} selectionDisabled={pending || disabled} snapshot={snapshot} renderScore={renderScore}
      showPlayerCardScore={Boolean(snapshot)} showPlayerCardInfo={false} showTeamComparisonSummary={false} showPlayerSessionSummary={false} />
    <section className="flex items-center justify-center gap-2" aria-label="다른 경기 결과">
      <Button variant="ghost" size="sm" disabled={pending || disabled} onClick={() => choose("draw")}><Equal className="size-4" aria-hidden="true" />무승부</Button>
      <Button variant="ghost" size="sm" disabled={pending || disabled} onClick={() => choose("void")}><RotateCcw className="size-4" aria-hidden="true" />무효 · 재경기</Button>
    </section>
    <Dialog open={confirmOpen} onOpenChange={(open) => { if (!pending) { setConfirmOpen(open); if (!open) setOutcome(null); } }}>
      <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{label}로 확정할까요?</DialogTitle><DialogDescription>{outcome === "void" ? "전적·예측 보상에서 제외됩니다." : "확정한 결과는 변경할 수 없습니다."}</DialogDescription></DialogHeader>
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => { setConfirmOpen(false); setOutcome(null); }}>취소</Button><Button disabled={pending || disabled} onClick={confirm}>{pending ? "확정 중…" : "확정"}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
