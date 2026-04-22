"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(
    () => new Date(deadlineIso).getTime(),
    [deadlineIso],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remainSec = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec <= 0;

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          후보 3개 중 1곳에 투표합니다. 제한 시간{" "}
          <span className="font-medium tabular-nums text-foreground">
            {expired ? "종료" : `${remainSec}s`}
          </span>
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          득표 {tallies[0]} · {tallies[1]} · {tallies[2]}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {candidates.map((label, idx) => (
          <Button
            key={`${idx}-${label}`}
            type="button"
            variant={myChoiceIdx === idx ? "default" : "outline"}
            disabled={pending}
            className={cn("h-auto min-h-11 py-2 whitespace-normal")}
            onClick={() => onVote(idx)}
          >
            {label}
          </Button>
        ))}
      </div>
      {canResolve ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={onResolve}
            className="w-full sm:w-auto"
          >
            맵 확정하기
          </Button>
          <p className="text-muted-foreground self-center text-xs">
            득표 가중 무작위로 1개를 고릅니다(09-BalanceMaker).
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          맵 확정은 운영진만 할 수 있습니다.
        </p>
      )}
    </div>
  );
}
