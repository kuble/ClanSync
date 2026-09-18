"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Coins, Crown, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  setBalanceMatchOutcomeAction,
  submitBalancePredictionAction,
} from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  myPickTeam: 1 | 2 | null;
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

  function submit(pick: 1 | 2) {
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
          승리할 팀을 선택하세요. 비출전 멤버만 참여할 수 있습니다.
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
        <div className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map((team) => (
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
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                myPickTeam === team && "ring-2 ring-current",
              )}
            >
              {myPickTeam === team ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Trophy className="size-4" aria-hidden="true" />
              )}
              {team === 1 ? "블루(팀1) 승" : "레드(팀2) 승"}
            </button>
          ))}
        </div>
        <p
          role="status"
          className="text-center text-[11px] text-muted-foreground"
        >
          {predictionCount}명 참여
          {myPickTeam
            ? " · " + (myPickTeam === 1 ? "블루" : "레드") + " 팀 선택됨"
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

export function ClanBalanceMatchOutcomeClient({
  gameSlug,
  clanId,
  sessionId,
  disabled,
  predictionEnabled = true,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  disabled: boolean;
  predictionEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Exclude<
    MatchOutcome,
    "pending"
  > | null>(null);
  const outcomeLabel =
    outcome === "team1"
      ? "블루 팀 승리"
      : outcome === "team2"
        ? "레드 팀 승리"
        : outcome === "draw"
          ? "무승부"
          : "무효 · 재경기";

  function confirm() {
    if (!outcome) return;
    start(async () => {
      const r = await setBalanceMatchOutcomeAction(
        gameSlug,
        clanId,
        sessionId,
        outcome,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(outcomeLabel + "로 확정했습니다.");
      setOutcome(null);
      router.refresh();
    });
  }

  return (
    <>
      <section className="rounded-xl border bg-muted/15 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
          경기 결과 확정
        </h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          경기 결과를 기록하세요. {predictionEnabled ? "승리 팀을 확정하면 예측 적중 보상이 지급됩니다. " : ""}무승부는 승패 없이 경기 기록에 포함됩니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-sky-500/30 text-sky-700 dark:text-sky-300"
            disabled={pending || disabled}
            onClick={() => setOutcome("team1")}
          >
            블루 승
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-rose-500/30 text-rose-700 dark:text-rose-300"
            disabled={pending || disabled}
            onClick={() => setOutcome("team2")}
          >
            레드 승
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || disabled}
            onClick={() => setOutcome("draw")}
          >
            무승부
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs text-muted-foreground"
            disabled={pending || disabled}
            onClick={() => setOutcome("void")}
          >
            무효 · 재경기
          </Button>
        </div>
      </section>
      <Dialog
        open={outcome !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setOutcome(null);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>경기 결과를 확정할까요?</DialogTitle>
            <DialogDescription>
              <strong className="text-foreground">{outcomeLabel}</strong>로
              기록됩니다.{" "}
              {!predictionEnabled ? "확정 후 다음 라운드를 시작할 수 있습니다." : outcome === "void" || outcome === "draw"
                ? "이번 경기의 예측 보상은 지급되지 않습니다."
                : "적중자에게 5코인씩 지급되며, 클랜 코인 풀이 부족하면 확정되지 않습니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOutcome(null)}
            >
              취소
            </Button>
            <Button type="button" disabled={pending} onClick={confirm}>
              {pending ? "확정 중…" : "결과 확정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
