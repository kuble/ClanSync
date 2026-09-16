import { Crosshair, Plus, Shield } from "lucide-react";
import type { BalanceRoster, TeamRoster } from "@/lib/balance/roster-schema";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import { cn } from "@/lib/utils";

export const BALANCE_SLOTS = [
  { key: "d0", label: "딜러 1", role: "dmg", index: 0 },
  { key: "d1", label: "딜러 2", role: "dmg", index: 1 },
  { key: "tank", label: "탱커", role: "tank", index: 0 },
  { key: "s0", label: "힐러 1", role: "sup", index: 0 },
  { key: "s1", label: "힐러 2", role: "sup", index: 1 },
] as const;

export type BalanceSlot = (typeof BALANCE_SLOTS)[number];

export function balanceSlotMember(team: TeamRoster, slot: BalanceSlot) {
  return slot.role === "tank" ? team.tank : team[slot.role][slot.index];
}

export function BalanceRoleIcon({ slot }: { slot: BalanceSlot }) {
  const Icon =
    slot.role === "tank" ? Shield : slot.role === "dmg" ? Crosshair : Plus;
  return (
    <span
      className="flex flex-col items-center justify-center gap-1 text-muted-foreground"
      title={slot.label}
    >
      <Icon className="size-4 sm:size-5" aria-hidden="true" />
      <span className="text-[9px] font-medium sm:text-[10px]">
        {slot.role === "tank" ? "탱커" : slot.role === "dmg" ? "딜러" : "힐러"}
      </span>
    </span>
  );
}

export function BalanceTeamHeading() {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 text-center sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]">
      <span className="text-xs font-bold tracking-wider text-sky-600 dark:text-sky-300">
        1팀
      </span>
      <span className="text-base font-black italic text-muted-foreground/60">
        VS
      </span>
      <span className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-300">
        2팀
      </span>
    </div>
  );
}

export function ClanBalanceRosterBoard({
  roster,
  pool,
  snapshot,
  planPremium = false,
  scoreMode = "m",
  highlightPlayer,
}: {
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  snapshot?: MaSnapshot;
  planPremium?: boolean;
  scoreMode?: "m" | "a";
  highlightPlayer?: string;
}) {
  const nickById = Object.fromEntries(pool.map((p) => [p.user_id, p.nickname]));
  return (
    <div aria-label="출전 라인업">
      <BalanceTeamHeading />
      <div className="space-y-2 rounded-xl bg-muted/35 p-2 sm:p-3">
        {BALANCE_SLOTS.map((slot) => (
          <div
            key={slot.key}
            className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"
          >
            {(["team1", "team2"] as const).map((team, idx) => {
              const userId = balanceSlotMember(roster[team], slot);
              const nickname = userId
                ? (nickById[userId] ?? "탈퇴한 멤버")
                : "빈자리";
              const score = userId && snapshot ? snapshot[userId] : null;
              return (
                <div key={team} className="contents">
                  {idx === 1 ? <BalanceRoleIcon slot={slot} /> : null}
                  <div
                    key={userId ?? "empty"}
                    data-board-slot={`${team}:${slot.key}`}
                    className={cn(
                      "flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center",
                      team === "team1"
                        ? "border-sky-500/35 bg-sky-500/[0.06]"
                        : "border-rose-500/35 bg-rose-500/[0.06]",
                      !userId && "border-dashed opacity-65",
                      userId === highlightPlayer &&
                        "ring-2 ring-primary motion-safe:animate-in motion-safe:slide-in-from-bottom-3 motion-safe:fade-in motion-safe:duration-500",
                    )}
                  >
                    <span className="sr-only">
                      {team === "team1" ? "1팀" : "2팀"} {slot.label}
                    </span>
                    <span
                      className="max-w-full truncate text-xs font-bold sm:text-sm"
                      title={nickname}
                    >
                      {nickname}
                    </span>
                    {score ? (
                      <span className="flex gap-3 text-[11px] tabular-nums text-muted-foreground">
                        <span>
                          {scoreMode === "a" && planPremium ? "A" : "M"}{" "}
                          <strong className="text-foreground">{scoreMode === "a" && planPremium ? score.a ?? "—" : score.m}</strong>
                        </span>
                      </span>
                    ) : !userId ? (
                      <span className="text-[10px] text-muted-foreground">
                        참가자 대기
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
