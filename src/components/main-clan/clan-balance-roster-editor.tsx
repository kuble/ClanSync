"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, GripVertical, Save, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { updateBalanceRosterAction } from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import {
  type BalanceRoster,
  rosterAssignedUserIds,
} from "@/lib/balance/roster-schema";
import {
  BALANCE_SLOTS,
  BalanceRoleIcon,
  BalanceTeamHeading,
  balanceSlotMember,
  type BalanceSlot,
} from "./clan-balance-roster-board";
import { cn } from "@/lib/utils";

type PoolRow = { user_id: string; nickname: string };
type TeamKey = "team1" | "team2";

export function ClanBalanceRosterEditor({
  gameSlug,
  clanId,
  sessionId,
  initialRoster,
  pool,
  canEdit,
  onDirtyChange,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  initialRoster: BalanceRoster;
  pool: PoolRow[];
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [roster, setRoster] = useState<BalanceRoster>(initialRoster);
  const [savedRoster, setSavedRoster] = useState(initialRoster);
  const [query, setQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const usedIds = new Set(rosterAssignedUserIds(roster));
  const dirty = JSON.stringify(roster) !== JSON.stringify(savedRoster);
  const visiblePool = pool.filter((p) =>
    p.nickname.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const selectedNickname = pool.find(
    (p) => p.user_id === selectedMember,
  )?.nickname;

  function assign(teamKey: TeamKey, slot: BalanceSlot, userId: string | null) {
    if (!canEdit || pending) return;
    const next = structuredClone(roster);
    // Moving a member clears their previous slot; a player can only play for one team.
    if (userId) {
      for (const team of [next.team1, next.team2]) {
        if (team.tank === userId) team.tank = null;
        team.dmg = team.dmg.map((id) => (id === userId ? null : id)) as [
          string | null,
          string | null,
        ];
        team.sup = team.sup.map((id) => (id === userId ? null : id)) as [
          string | null,
          string | null,
        ];
      }
    }
    if (slot.role === "tank") next[teamKey].tank = userId;
    else next[teamKey][slot.role][slot.index] = userId;
    setRoster(next);
    setSelectedMember(null);
    onDirtyChange?.(JSON.stringify(next) !== JSON.stringify(savedRoster));
  }

  function save() {
    start(async () => {
      const r = await updateBalanceRosterAction(
        gameSlug,
        clanId,
        sessionId,
        JSON.stringify(roster),
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setSavedRoster(roster);
      onDirtyChange?.(false);
      toast.success("배치를 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" aria-hidden="true" /> 출전 명단{" "}
          <strong className="tabular-nums text-foreground">
            {usedIds.size} / 10
          </strong>
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[10px] font-medium",
            dirty
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {dirty ? "저장하지 않은 변경" : "저장된 배치"}
        </span>
      </div>
      <div>
        <BalanceTeamHeading />
        <div className="space-y-2 rounded-xl bg-muted/35 p-2 sm:p-3">
          {BALANCE_SLOTS.map((slot) => (
            <div
              key={slot.key}
              className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"
            >
              {(["team1", "team2"] as const).map((teamKey, index) => {
                const userId = balanceSlotMember(roster[teamKey], slot);
                const teamLabel = teamKey === "team1" ? "블루" : "레드";
                const prefix = teamKey === "team1" ? "t1" : "t2";
                return (
                  <div key={teamKey} className="contents">
                    {index === 1 ? <BalanceRoleIcon slot={slot} /> : null}
                    <div
                      className={cn(
                        "relative flex min-h-24 min-w-0 flex-col justify-center gap-1 rounded-xl border p-2 sm:px-3",
                        teamKey === "team1"
                          ? "border-sky-500/35 bg-sky-500/[0.06]"
                          : "border-rose-500/35 bg-rose-500/[0.06]",
                        !userId && "border-dashed",
                        selectedMember && "ring-1 ring-primary/40",
                      )}
                      onDragOver={(event) => {
                        if (canEdit && !pending) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const id = event.dataTransfer.getData("text/plain");
                        if (pool.some((p) => p.user_id === id))
                          assign(teamKey, slot, id);
                      }}
                    >
                      <label
                        htmlFor={prefix + "-" + slot.key}
                        className="text-[10px] font-medium text-muted-foreground"
                      >
                        {teamLabel} · {slot.label}
                      </label>
                      <select
                        id={prefix + "-" + slot.key}
                        disabled={!canEdit || pending}
                        value={userId ?? ""}
                        className="h-9 w-full min-w-0 rounded-md border border-transparent bg-transparent pr-1 text-xs font-bold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm [&>option]:bg-background"
                        onChange={(event) =>
                          assign(teamKey, slot, event.target.value || null)
                        }
                      >
                        <option value="">참가자 선택</option>
                        {pool
                          .filter(
                            (p) =>
                              !usedIds.has(p.user_id) || p.user_id === userId,
                          )
                          .map((p) => (
                            <option key={p.user_id} value={p.user_id}>
                              {p.nickname}
                            </option>
                          ))}
                      </select>
                      {selectedMember ? (
                        <button
                          type="button"
                          disabled={!canEdit || pending}
                          onClick={() => assign(teamKey, slot, selectedMember)}
                          className="rounded bg-primary/10 px-1 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {selectedNickname} 배치
                        </button>
                      ) : userId ? (
                        <button
                          type="button"
                          disabled={!canEdit || pending}
                          onClick={() => assign(teamKey, slot, null)}
                          className="self-end rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          aria-label={teamLabel + " " + slot.label + " 비우기"}
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="text-center text-[10px] text-muted-foreground/70">
                          아래 멤버를 끌어놓으세요
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <section
        className="overflow-hidden rounded-xl border bg-muted/15"
        aria-label="참가 가능 멤버"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h4 className="text-xs font-semibold">
              클랜 멤버{" "}
              <span className="ml-1 tabular-nums text-muted-foreground">
                {pool.length}
              </span>
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              멤버 선택 후 슬롯에 배치하거나 끌어놓으세요.
            </p>
          </div>
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-3 sm:w-48">
            <Search
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              aria-label="참가자 닉네임 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="닉네임 검색"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </label>
        </div>
        <div className="flex min-h-24 flex-wrap content-start gap-2 p-4">
          {visiblePool.length ? (
            visiblePool.map((p) => (
              <button
                key={p.user_id}
                type="button"
                draggable={canEdit && !pending}
                disabled={!canEdit || pending}
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/plain", p.user_id)
                }
                onClick={() =>
                  setSelectedMember(
                    selectedMember === p.user_id ? null : p.user_id,
                  )
                }
                aria-pressed={selectedMember === p.user_id}
                className={cn(
                  "flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
                  selectedMember === p.user_id
                    ? "border-primary bg-primary/10 text-primary"
                    : usedIds.has(p.user_id)
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-border bg-card hover:border-primary/50",
                )}
              >
                {usedIds.has(p.user_id) ? (
                  <Check className="size-3 shrink-0" aria-hidden="true" />
                ) : (
                  <GripVertical
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{p.nickname}</span>
                <span className="sr-only">
                  {usedIds.has(p.user_id) ? "배치됨" : "배치 가능"}
                </span>
              </button>
            ))
          ) : (
            <p className="py-3 text-xs text-muted-foreground">
              {pool.length
                ? "검색 결과가 없습니다."
                : "참가할 수 있는 클랜 멤버가 없습니다."}
            </p>
          )}
        </div>
        {selectedMember ? (
          <p role="status" className="border-t px-4 py-2 text-xs text-primary">
            {selectedNickname} 선택됨 · 배치할 슬롯의 버튼을 누르세요.
          </p>
        ) : null}
      </section>
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs text-muted-foreground">
            {dirty
              ? "변경한 배치를 저장한 뒤 다음 단계로 진행하세요."
              : "다른 멤버에게는 저장된 배치가 실시간으로 표시됩니다."}
          </p>
          <Button
            type="button"
            disabled={pending}
            onClick={save}
            variant="outline"
          >
            <Save className="size-4" aria-hidden="true" />
            {pending ? "저장 중…" : "배치 저장"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
