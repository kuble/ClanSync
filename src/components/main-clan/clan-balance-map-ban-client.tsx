"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Map, Timer, Vote } from "lucide-react";
import { toast } from "sonner";
import {
  resolveMapBanAction,
  submitMapVoteAction,
} from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ClanBalanceMapBanClient({
  gameSlug,
  clanId,
  sessionId,
  candidates,
  deadlineIso,
  myChoiceIdx,
  tallies,
  canResolve,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  candidates: [string, string, string];
  deadlineIso: string;
  myChoiceIdx: number | null;
  tallies: [number, number, number];
  canResolve: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const deadlineMs = new Date(deadlineIso).getTime();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const remainSec =
    now === null ? null : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec === 0;
  const total = tallies.reduce((sum, count) => sum + count, 0);

  function onVote(idx: number) {
    start(async () => {
      const r = await submitMapVoteAction(gameSlug, clanId, sessionId, idx);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("투표가 반영되었습니다.");
      router.refresh();
    });
  }
  function onResolve() {
    start(async () => {
      const r = await resolveMapBanAction(gameSlug, clanId, sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("맵이 확정되었습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-base font-semibold">
            <Map className="size-5 text-primary" aria-hidden="true" />
            어디에서 승부할까요?
          </h4>
          <p className="mt-2 text-xs text-muted-foreground">
            후보 3개 중 1곳에 투표합니다. 득표가 높을수록 선택될 확률이
            올라갑니다.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5",
            expired
              ? "border-border bg-muted text-muted-foreground"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
        >
          <Timer className="size-4" aria-hidden="true" />
          <span className="text-lg font-bold tabular-nums">
            {remainSec === null ? "—" : expired ? "투표 종료" : remainSec + "s"}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {candidates.map((label, idx) => {
          const selected = myChoiceIdx === idx;
          const count = tallies[idx] ?? 0;
          const share = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={idx + "-" + label}
              type="button"
              aria-pressed={selected}
              disabled={pending || expired}
              onClick={() => onVote(idx)}
              className={cn(
                "group overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default",
                selected
                  ? "border-primary bg-primary/[0.05] ring-1 ring-primary/25"
                  : "border-border bg-muted/10 hover:border-primary/50",
              )}
            >
              <div className="relative flex h-28 items-center justify-center border-b bg-gradient-to-br from-muted/30 to-muted/80">
                <Map
                  className="size-12 text-muted-foreground/25"
                  aria-hidden="true"
                />
                <span className="absolute left-3 top-3 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  MAP 0{idx + 1}
                </span>
                {selected ? (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                    <Check className="size-3" aria-hidden="true" />내 선택
                  </span>
                ) : null}
              </div>
              <div className="space-y-4 p-4">
                <span className="block text-sm font-bold">{label}</span>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{count}표</span>
                    <strong className="tabular-nums">{share}%</strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: share + "%" }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/25 px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Vote className="size-4" aria-hidden="true" />
          {total}명 투표
          {myChoiceIdx !== null ? " · 내 선택이 반영되었습니다." : ""}
        </p>
        {canResolve ? (
          <Button type="button" disabled={pending} onClick={onResolve}>
            맵 확정하기
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            운영진이 투표 결과를 반영해 맵을 확정합니다.
          </p>
        )}
      </div>
    </div>
  );
}
