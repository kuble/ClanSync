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
import { BalanceMapImage } from "./clan-balance-map-image";
import {
  ClanBalanceMapResultDialog,
  ClanBalanceMapVotePreview,
} from "./clan-balance-map-vote-preview";

export function ClanBalanceMapBanClient({
  gameSlug,
  clanId,
  sessionId,
  candidates,
  deadlineIso,
  myChoiceIdx,
  tallies,
  canResolve,
  resolvedMap = null,
  qaPreview = false,
  serverNow,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  candidates: [string, string, string];
  deadlineIso: string | null;
  myChoiceIdx: number | null;
  tallies: [number, number, number];
  canResolve: boolean;
  resolvedMap?: string | null;
  qaPreview?: boolean;
  serverNow?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const [observedResult, setObservedResult] = useState(resolvedMap);
  const [resultOpen, setResultOpen] = useState(false);
  const [animateResult, setAnimateResult] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // A reconnect starts with the saved result; only a new result starts its reveal.
  if (observedResult !== resolvedMap) {
    setObservedResult(resolvedMap);
    setResultOpen(Boolean(resolvedMap));
    setAnimateResult(Boolean(resolvedMap));
  }
  const deadlineMs = deadlineIso ? new Date(deadlineIso).getTime() : 0;
  useEffect(() => {
    const anchor = serverNow ?? Date.now();
    const started = performance.now();
    const update = () => setNow(anchor + performance.now() - started);
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 250);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [serverNow]);
  const remainSec =
    now === null ? null : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec === 0;
  const total = tallies.reduce((sum, count) => sum + count, 0);

  function onVote(idx: number) {
    if (resolvedMap || expired || pending || !deadlineIso) return;
    start(async () => {
      const r = await submitMapVoteAction(gameSlug, clanId, sessionId, idx, deadlineIso);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("투표가 반영되었습니다.");
      router.refresh();
    });
  }
  function onResolve() {
    if (resolvedMap || pending || !expired) return;
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
    <div className="space-y-5" data-balance-guide="map-vote">
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
            {resolvedMap
              ? "맵 확정"
              : remainSec === null
                ? "—"
                : expired
                  ? "투표 종료"
                  : remainSec + "s"}
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
              disabled={pending || expired || Boolean(resolvedMap)}
              onClick={() => onVote(idx)}
              className={cn(
                "group overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default",
                selected
                  ? "border-primary bg-primary/[0.05] ring-1 ring-primary/25"
                  : "border-border bg-muted/10 hover:border-primary/50",
              )}
            >
              <div className="relative h-36 overflow-hidden border-b sm:h-52 lg:h-64">
                <BalanceMapImage label={label} className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" sizes="(max-width: 640px) 100vw, 33vw" />
                <span className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/30" aria-hidden="true" />
                <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold tracking-widest text-white backdrop-blur-sm">
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/25 px-4 py-3" data-balance-guide={resolvedMap ? undefined : "primary"}>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Vote className="size-4" aria-hidden="true" />
          {total}명 투표
          {myChoiceIdx !== null ? " · 내 선택이 반영되었습니다." : ""}
        </p>
        {resolvedMap ? (
          <div className="flex flex-wrap items-center gap-3">
            <strong className="text-sm" data-testid="resolved-map">
              {resolvedMap}
            </strong>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAnimateResult(false);
                setResultOpen(true);
              }}
            >
              추첨 결과
            </Button>
          </div>
        ) : canResolve ? (
          <Button
            type="button"
            disabled={pending || !expired}
            onClick={onResolve}
          >
            맵 확정하기
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            운영진이 투표 결과를 반영해 맵을 확정합니다.
          </p>
        )}
      </div>
      {qaPreview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          QA 맵 투표 연출 테스트
        </Button>
      ) : null}
      {resolvedMap ? (
        <ClanBalanceMapResultDialog
          open={resultOpen}
          onOpenChange={setResultOpen}
          candidates={candidates}
          tallies={tallies}
          selectedMap={resolvedMap}
          animate={animateResult}
        />
      ) : null}
      {qaPreview ? (
        <ClanBalanceMapVotePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          candidates={candidates}
        />
      ) : null}
    </div>
  );
}
