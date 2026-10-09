"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Map, Timer } from "lucide-react";
import { toast } from "sonner";
import {
  resolveMapBanAction,
  startHeroBanPhaseAction,
  startBalanceMatchAction,
  submitMapVoteAction,
} from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BalanceMapImage } from "./clan-balance-map-image";
import { MAP_DRAW_TICKS, mapDrawHighlight, mapDrawTickDelay } from "@/lib/balance/map-draw-presentation";
import styles from "./clan-balance-map-ban-client.module.css";

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
  heroBanEnabled,
  renderInsights,
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
  heroBanEnabled: boolean;
  renderInsights?: (map: string | null) => ReactNode;
  serverNow?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const [draw, setDraw] = useState({ map: resolvedMap, tick: MAP_DRAW_TICKS, animate: false });
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveRetry, setResolveRetry] = useState(0);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const advancing = useRef(false);
  const resolving = useRef<string | null>(null);
  // A refresh of an already visible result must not replay the draw.
  if (draw.map !== resolvedMap) {
    setDraw({ map: resolvedMap, tick: resolvedMap ? 0 : MAP_DRAW_TICKS, animate: Boolean(resolvedMap) });
  }
  const revealing = Boolean(resolvedMap) && draw.tick < MAP_DRAW_TICKS;
  const displayedMap = revealing ? null : resolvedMap;
  useEffect(() => {
    if (!resolvedMap || draw.tick >= MAP_DRAW_TICKS) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setDraw((current) => ({
      ...current, tick: reduced ? MAP_DRAW_TICKS : current.tick + 1,
    })), reduced ? 0 : mapDrawTickDelay(draw.tick));
    return () => clearTimeout(timer);
  }, [resolvedMap, draw.tick]);
  useEffect(() => {
    if (!displayedMap || !canResolve || advanceError) return;
    const timer = setTimeout(async () => {
      if (advancing.current) return;
      advancing.current = true;
      try {
        const action = heroBanEnabled ? startHeroBanPhaseAction : startBalanceMatchAction;
        const result = await action(gameSlug, clanId, sessionId);
        if (!result.ok) setAdvanceError(result.error);
      } catch {
        setAdvanceError("다음 단계로 이동하지 못했습니다. 다시 시도해 주세요.");
      } finally {
        advancing.current = false;
        router.refresh();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [displayedMap, canResolve, heroBanEnabled, advanceError, gameSlug, clanId, sessionId, router]);
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
  useEffect(() => {
    if (!expired || !canResolve || resolvedMap || pending || !deadlineIso || resolving.current === deadlineIso) return;
    resolving.current = deadlineIso;
    start(async () => {
      try {
        const result = await resolveMapBanAction(gameSlug, clanId, sessionId);
        if (!result.ok) setResolveError(result.error);
      } catch {
        setResolveError("맵을 확정하지 못했습니다.");
      } finally { router.refresh(); }
    });
  }, [expired, canResolve, resolvedMap, pending, deadlineIso, resolveRetry, gameSlug, clanId, sessionId, router]);

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
  return (
    <div className="space-y-5" data-balance-guide="map-vote" data-map-revealing={revealing}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-base font-semibold">
            <Map className="size-5 text-primary" aria-hidden="true" />
            {revealing ? "전장을 추첨하고 있습니다" : displayedMap ? "맵이 확정되었습니다" : "어디에서 승부할까요?"}
          </h4>
          <p className="mt-2 text-xs text-muted-foreground">
            {revealing ? "득표 비율에 따라 전장이 선택됩니다." : displayedMap ? "잠시 후 다음 단계로 이동합니다." : "후보 3개 중 1곳에 투표합니다. 득표가 높을수록 선택될 확률이 올라갑니다."}
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
            {revealing ? "추첨 중" : displayedMap
              ? "맵 확정"
              : remainSec === null
                ? "—"
                : expired
                  ? "투표 종료"
                  : remainSec + "s"}
          </span>
        </div>
      </div>
      {displayedMap ? (
        <article className={cn("relative overflow-hidden rounded-xl border border-primary bg-primary/5", draw.animate && styles.expand)}
          data-testid="resolved-map-card" role="status" style={{
            "--reveal-left": `${Math.max(0, candidates.indexOf(displayedMap)) * 100 / 3}%`,
            "--reveal-right": `${(2 - Math.max(0, candidates.indexOf(displayedMap))) * 100 / 3}%`,
          } as CSSProperties}>
          <div className="relative h-36 overflow-hidden sm:h-52 lg:h-64">
            <BalanceMapImage label={displayedMap} sizes="100vw" />
            <span className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-5 left-5 flex items-center gap-2 text-white">
              <Check className="size-5 text-primary" aria-hidden="true" />
              <strong className="text-xl" data-testid="resolved-map">{displayedMap}</strong>
            </div>
          </div>
        </article>
      ) : <div className="grid gap-3 sm:grid-cols-3" data-testid="map-vote-gallery">
        {candidates.map((label, idx) => {
          const selected = myChoiceIdx === idx;
          const winner = displayedMap === label;
          const highlighted = revealing ? mapDrawHighlight(tallies, draw.tick) === idx : displayedMap ? winner : selected;
          const excluded = total > 0 && tallies[idx] === 0;
          const count = tallies[idx] ?? 0;
          const share = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={idx + "-" + label}
              type="button"
              aria-pressed={selected}
              data-selected-map={winner || undefined}
              data-draw-highlight={revealing && highlighted || undefined}
              data-vote-excluded={excluded || undefined}
              disabled={pending || expired || Boolean(resolvedMap)}
              onClick={() => onVote(idx)}
              className={cn(
                "group overflow-hidden rounded-xl border text-left transition-[opacity,filter,transform,box-shadow] duration-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default",
                highlighted
                  ? "border-primary bg-primary/[0.05] ring-1 ring-primary/25"
                  : "border-border bg-muted/10 hover:border-primary/50",
                revealing && highlighted && "-translate-y-1 border-amber-300 ring-2 ring-amber-300 shadow-lg shadow-amber-300/20",
                excluded && "opacity-45 grayscale",
              )}
            >
              <div className="relative h-36 overflow-hidden border-b sm:h-52 lg:h-64">
                <BalanceMapImage label={label} className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" sizes="(max-width: 640px) 100vw, 33vw" />
                <span className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/30" aria-hidden="true" />
                <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold tracking-widest text-white backdrop-blur-sm">
                  MAP 0{idx + 1}
                </span>
                {winner || (selected && !revealing) ? (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                    <Check className="size-3" aria-hidden="true" />{winner ? "선택된 맵" : "내 선택"}
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
      </div>}
      {resolveError && !resolvedMap ? (
        <div role="alert" className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-destructive">{resolveError}</p>
          <Button variant="outline" disabled={pending} onClick={() => {
            resolving.current = null; setResolveError(null); setResolveRetry((value) => value + 1);
          }}>맵 확정 다시 시도</Button>
        </div>
      ) : null}
      {advanceError ? (
        <div role="alert" className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-destructive">{advanceError}</p>
          <Button variant="outline" onClick={() => setAdvanceError(null)}>다음 단계 다시 시도</Button>
        </div>
      ) : null}
      {renderInsights?.(displayedMap)}
    </div>
  );
}
