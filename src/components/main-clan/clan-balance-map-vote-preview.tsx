"use client";

import { useEffect, useState } from "react";
import { Check, Map, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const REVEAL_DURATION_MS = 3200;
const SAMPLE_TALLIES: [number, number, number] = [3, 5, 2];

function MapVoteReveal({
  candidates,
  tallies,
  selectedMap,
  animate,
}: {
  candidates: [string, string, string];
  tallies: [number, number, number];
  selectedMap: string;
  animate: boolean;
}) {
  const [elapsed, setElapsed] = useState(animate ? 0 : REVEAL_DURATION_MS);
  useEffect(() => {
    if (!animate) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = motion.matches
        ? REVEAL_DURATION_MS
        : Math.min(REVEAL_DURATION_MS, performance.now() - started);
      setElapsed(next);
      if (next >= REVEAL_DURATION_MS) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [animate]);

  const done = elapsed >= REVEAL_DURATION_MS;
  const selectedIndex = candidates.indexOf(selectedMap);
  const steps = 21 + Math.max(0, selectedIndex);
  const progress = Math.min(1, elapsed / REVEAL_DURATION_MS);
  const activeIndex = done
    ? selectedIndex
    : Math.floor((1 - (1 - progress) ** 2) * steps) % candidates.length;
  const total = tallies.reduce((sum, count) => sum + count, 0);

  return (
    <div
      className="space-y-5"
      data-testid="map-vote-reveal"
      data-reveal-complete={done}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {candidates.map((label, index) => {
          const count = tallies[index];
          const share = total ? Math.round((count / total) * 100) : 33;
          const active = activeIndex === index;
          return (
            <div
              key={label}
              data-map-label={label}
              data-highlighted={active}
              className={cn(
                "relative rounded-xl border p-4 transition-colors motion-reduce:transition-none",
                active
                  ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                  : "border-border bg-muted/20",
                done && !active && "opacity-55",
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <Map
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                {done && active ? (
                  <Check className="size-5 text-primary" aria-hidden="true" />
                ) : null}
              </div>
              <p className="font-semibold">{label}</p>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{count}표</span>
                <strong className="tabular-nums text-foreground">
                  {share}%
                </strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="rounded-xl bg-primary/5 px-4 py-5 text-center"
      >
        <p className="text-xs text-muted-foreground">
          {done ? "선택된 맵" : "득표 비율로 맵 추첨 중"}
        </p>
        <p className="mt-2 text-xl font-bold" data-testid="map-vote-result">
          {done ? selectedMap : "잠시 후 공개됩니다"}
        </p>
      </div>
    </div>
  );
}

/** Displays a result supplied by the server. This component never chooses a map. */
export function ClanBalanceMapResultDialog({
  open,
  onOpenChange,
  candidates,
  tallies,
  selectedMap,
  animate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: [string, string, string];
  tallies: [number, number, number];
  selectedMap: string;
  animate?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        overlayClassName="bg-black/55 backdrop-blur-md"
      >
        <DialogTitle>맵 추첨 결과</DialogTitle>
        <DialogDescription className="text-xs">
          투표 결과가 반영되었습니다.
        </DialogDescription>
        {open ? (
          <MapVoteReveal
            candidates={candidates}
            tallies={tallies}
            selectedMap={selectedMap}
            animate={animate}
          />
        ) : null}
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>확인</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Local sample votes only; no server actions or session mutations. */
export function ClanBalanceMapVotePreview({
  open,
  onOpenChange,
  candidates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: [string, string, string];
}) {
  const [run, setRun] = useState(0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        overlayClassName="bg-black/55 backdrop-blur-md"
      >
        <DialogTitle>맵 투표 연출 테스트</DialogTitle>
        <DialogDescription className="text-xs">
          QA 연출 테스트 · 실제 투표/기록 변경 없음
        </DialogDescription>
        {open ? (
          <MapVoteReveal
            key={run}
            candidates={candidates}
            tallies={SAMPLE_TALLIES}
            selectedMap={candidates[1]}
            animate
          />
        ) : null}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setRun((value) => value + 1)}
          >
            <RotateCcw className="size-4" aria-hidden="true" /> 다시 보기
          </Button>
          <Button onClick={() => onOpenChange(false)}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
