"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { FormationState } from "@/lib/balance/formation";
import { ROLE_LABEL } from "@/lib/balance/formation";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import {
  ClanBalanceRosterBoard,
  BALANCE_SLOTS,
  BalanceRoleIcon,
  BalanceTeamHeading,
  balanceSlotMember,
} from "./clan-balance-roster-board";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { cn } from "@/lib/utils";
import { drawRevealCount } from "@/lib/balance/draw-presentation";

/** A presentation of the server's saved draw, never a new random draw. */
export function ClanBalanceRevealBoard({
  state,
  roster,
  pool,
  serverNow,
}: {
  state: FormationState | null;
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  serverNow: number;
}) {
  const [reduced, setReduced] = useState(false);
  const draw = state?.draw;
  const end = draw ? draw.startedAt + draw.durationMs : 0;
  const now = useServerClock(serverNow, end, 80);
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
  const elapsed = draw ? Math.max(0, now - draw.startedAt) : 0;
  const showing = Boolean(
    draw &&
      !reduced &&
      now < end &&
      (draw.roleMode === "lottery" || state?.mode === "random"),
  );
  const names = new Map(pool.map((p) => [p.user_id, p.nickname]));
  const latest = state?.log.findLast(
    (entry) => entry.player && entry.team,
  )?.player;
  if (!showing || !state || !draw)
    return (
      <div data-draw-id={draw?.id}>
        <ClanBalanceRosterBoard
          roster={roster}
          pool={pool}
          highlightPlayer={latest}
        />
      </div>
    );
  const revealed =
    draw.roleMode === "lottery"
      ? drawRevealCount(draw, now, state.order.length)
      : Math.max(
          0,
          Math.min(
            10,
            Math.floor(((elapsed - 650) / (draw.durationMs - 650)) * 11),
          ),
        );
  const ordered = new Set(state.order.slice(0, revealed));
  // Draft/auction first reveal assigned roles in the familiar two-column board,
  // then keep only captains in team slots while the remaining players are picked.
  const staging = state.stage !== "complete";
  const rolePlayers = (role: string) =>
    state.order.filter(
      (id) => state.players.find((p) => p.id === id)?.role === role,
    );
  return (
    <div
      aria-label="공개 추첨 진행"
      data-draw-id={draw.id}
      data-reveal-count={revealed}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <strong className="text-primary">
          {elapsed < 650
            ? "추첨 순서를 섞고 있습니다"
            : "순서대로 역할과 자리를 공개합니다"}
        </strong>
        <span className="tabular-nums text-muted-foreground">
          {revealed} / 10
        </span>
      </div>
      <BalanceTeamHeading />
      <div className="space-y-2 rounded-xl bg-muted/35 p-2 sm:p-3">
        {BALANCE_SLOTS.map((slot) => (
          <div
            key={slot.key}
            className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"
          >
            {(["team1", "team2"] as const).map((team, index) => {
              const capacity = slot.role === "tank" ? 1 : 2;
              const id = staging
                ? rolePlayers(slot.role)[index * capacity + slot.index]
                : balanceSlotMember(roster[team], slot);
              const visible = Boolean(id && ordered.has(id));
              const placeholder =
                state.order[
                  (Math.floor(elapsed / 85) + slot.index + index * 5) % 10
                ];
              return (
                <div key={team} className="contents">
                  {index === 1 ? <BalanceRoleIcon slot={slot} /> : null}
                  <div
                    data-board-slot={`${team}:${slot.key}`}
                    className={cn(
                      "flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors",
                      team === "team1"
                        ? "border-sky-500/35 bg-sky-500/[0.06]"
                        : "border-rose-500/35 bg-rose-500/[0.06]",
                      visible && "ring-1 ring-primary/50",
                    )}
                  >
                    <strong
                      key={visible ? id : undefined}
                      className={cn(
                        "max-w-full truncate text-xs sm:text-sm",
                        visible
                          ? "motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300"
                          : "opacity-30",
                      )}
                      aria-hidden={!visible}
                    >
                      {names.get(visible ? id! : placeholder) ?? "…"}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      {visible
                        ? `${state.order.indexOf(id!) + 1}번 · ${ROLE_LABEL[slot.role]}`
                        : "추첨 중"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p role="status" className="sr-only">
        추첨 순서와 역할을 공개하고 있습니다.
      </p>
    </div>
  );
}

export function ClanBalanceRevealComplete({
  state,
  serverNow,
  children,
}: {
  state: FormationState;
  serverNow: number;
  children: ReactNode;
}) {
  const end =
    state.draw && (state.draw.roleMode === "lottery" || state.mode === "random")
      ? state.draw.startedAt + state.draw.durationMs
      : 0;
  const now = useServerClock(serverNow, end);
  return now >= end ? children : null;
}
