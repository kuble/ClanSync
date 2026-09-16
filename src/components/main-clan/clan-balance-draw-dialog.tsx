"use client";

import { useEffect, useState } from "react";
import { Crosshair, Plus, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ROLE_LABEL,
  type FormationState,
  type Role,
} from "@/lib/balance/formation";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { cn } from "@/lib/utils";
import { drawRevealCount } from "@/lib/balance/draw-presentation";

const ICONS = { tank: Shield, dmg: Crosshair, sup: Plus };
const CAPACITY = { tank: 2, dmg: 4, sup: 4 };

/** Displays a saved draw. Closing it never changes the draw or anyone else's view. */
export function ClanBalanceDrawDialog({
  state,
  userId,
  pool,
  serverNow,
  showSummary = true,
}: {
  state: FormationState;
  userId: string;
  pool: readonly { user_id: string; nickname: string }[];
  serverNow: number;
  showSummary?: boolean;
}) {
  const draw = state.draw!;
  const end = draw.startedAt + draw.durationMs;
  const [open, setOpen] = useState(() => serverNow < end);
  const [reduced, setReduced] = useState(false);
  const now = useServerClock(serverNow, end, 150);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motion.matches);
    const frame = requestAnimationFrame(sync);
    motion.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", sync);
    };
  }, []);

  const count = state.order.length;
  const revealed = reduced ? count : drawRevealCount(draw, now, count);
  const done = reduced || now >= end;
  const ownIndex = state.order.indexOf(userId);
  const players = state.order.map((id) => ({
    id,
    name:
      pool.find((person) => person.user_id === id)?.nickname ?? "탈퇴한 멤버",
    role: state.players.find((person) => person.id === id)!.role,
  }));
  const current = players[Math.max(0, revealed - 1)];
  const own = players[ownIndex];
  const ownVisible = ownIndex >= 0 && ownIndex < revealed;
  const Icon = current ? ICONS[current.role] : Shield;

  return (
    <>
      {own && showSummary ? (
        <p
          data-testid="my-draw-result"
          className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>
            내 추첨 순번{" "}
            <strong className="text-foreground">{ownIndex + 1}번</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>{ownVisible ? ROLE_LABEL[own.role] : "배정 대기"}</span>
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName="bg-black/55 backdrop-blur-md"
          className="max-h-[90dvh] overflow-y-auto p-5 sm:max-w-2xl sm:p-7 motion-reduce:animate-none"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>역할 추첨</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {done
                  ? "역할 배정 완료"
                  : revealed
                    ? `${revealed} / ${count} 배정`
                    : "추첨 순서 공개"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {done ? "확인" : "닫기"}
            </Button>
          </div>
          {own ? (
            <div
              data-testid="draw-my-order"
              className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3"
            >
              <span className="text-sm">내 추첨 순번</span>
              <strong className="text-2xl tabular-nums">
                {ownIndex + 1}
                <span className="ml-1 text-sm font-normal">번</span>
              </strong>
              <span className="text-sm font-semibold">
                {ownVisible ? ROLE_LABEL[own.role] : "배정 대기"}
              </span>
            </div>
          ) : null}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="flex min-h-28 items-center justify-center gap-4 rounded-xl bg-muted/30 p-4 text-center"
          >
            {revealed > 0 ? (
              <>
                <div
                  key={done ? "done" : current.id}
                  className="rounded-2xl bg-primary/10 p-3 text-primary motion-safe:animate-in motion-safe:zoom-in-90"
                >
                  <Icon className="size-8" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {done
                      ? "모든 역할이 정해졌습니다"
                      : `${revealed}번${current.id === userId ? " · 내 차례" : ""}`}
                  </p>
                  <p className="mt-1 truncate text-lg font-bold">
                    {done ? "팀 편성으로 이어집니다" : current.name}
                  </p>
                  {!done ? (
                    <p className="mt-1 text-sm text-primary">
                      {ROLE_LABEL[current.role]}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm font-medium">내 순번을 확인하세요</p>
            )}
          </div>
          <ol
            aria-label="추첨 순서와 역할"
            data-draw-id={draw.id}
            data-reveal-count={revealed}
            className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2"
          >
            {players.map((player, index) => {
              const visible = index < revealed;
              const RoleIcon = ICONS[player.role];
              return (
                <li
                  key={player.id}
                  data-player-id={player.id}
                  className={cn(
                    "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    player.id === userId
                      ? "border-primary/50 bg-primary/10"
                      : "border-border",
                    index === revealed - 1 && !done && "ring-1 ring-primary/60",
                  )}
                >
                  <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <strong className="min-w-0 flex-1 truncate">
                    {player.name}
                    {player.id === userId ? " (나)" : ""}
                  </strong>
                  {visible ? (
                    <span className="flex shrink-0 items-center gap-1 text-primary">
                      <RoleIcon className="size-3.5" aria-hidden="true" />
                      {ROLE_LABEL[player.role]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">대기</span>
                  )}
                </li>
              );
            })}
          </ol>
          <div
            aria-label="남은 역할 자리"
            className="flex justify-center gap-5 text-xs text-muted-foreground"
          >
            {(["tank", "dmg", "sup"] as Role[]).map((role) => (
              <span key={role}>
                {ROLE_LABEL[role]}{" "}
                {CAPACITY[role] -
                  players
                    .slice(0, revealed)
                    .filter((player) => player.role === role).length}
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
