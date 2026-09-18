"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useState,
  useSyncExternalStore,
  type Ref,
  type ReactNode,
} from "react";
import { RotateCcw, Search, Undo2 } from "lucide-react";
import { updateBalanceRosterAction } from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import {
  EMPTY_ROSTER,
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
import {
  RosterAutosave,
  type RosterFlushResult,
} from "@/lib/balance/roster-autosave";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import type { ScoreMode } from "./balance-team-insights";
import type { PlayerSessionInfoMap } from "@/lib/balance/player-session-stats";
import { BalancePlayerCardContent, BalancePlayerDetails } from "./balance-player-details";
import type { PlayerCardInfoMode } from "@/lib/balance/formation";

export type ClanBalanceRosterEditorHandle = {
  flush(): Promise<RosterFlushResult>;
  getRoster(): BalanceRoster;
};

type PoolRow = { user_id: string; nickname: string };
type TeamKey = "team1" | "team2";
type SlotAddress = { team: TeamKey; slot: BalanceSlot };

const TEAMS = ["team1", "team2"] as const;
const SLOT_ADDRESSES = TEAMS.flatMap((team) =>
  BALANCE_SLOTS.map((slot) => ({ team, slot })),
);
const DRAG_TYPE = "application/x-clansync-roster-slot";

function addressKey(address: SlotAddress) {
  return `${address.team}:${address.slot.key}`;
}

function setSlot(
  roster: BalanceRoster,
  { team, slot }: SlotAddress,
  userId: string | null,
) {
  if (slot.role === "tank") roster[team].tank = userId;
  else roster[team][slot.role][slot.index] = userId;
}

export function ClanBalanceRosterEditor({
  gameSlug,
  clanId,
  sessionId,
  revision,
  initialRoster,
  pool,
  canEdit,
  onDirtyChange,
  onRosterChange,
  scores,
  scoreMode = "m",
  scoreControl,
  playerSessionInfo,
  planPremium = false,
  samplePlayerIds = [],
  samplePrediction = false,
  showPrediction = false,
  showPlayerCardScore = true,
  showPlayerCardInfo = true,
  showTeamComparisonSummary = true,
  showPlayerSessionSummary = true,
  playerCardInfo = "record",
  ref,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  revision: number;
  initialRoster: BalanceRoster;
  pool: PoolRow[];
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRosterChange?: (roster: BalanceRoster) => void;
  scores?: MaSnapshot;
  scoreMode?: ScoreMode;
  scoreControl?: ReactNode;
  playerSessionInfo?: PlayerSessionInfoMap;
  planPremium?: boolean;
  samplePlayerIds?: readonly string[];
  samplePrediction?: boolean;
  showPrediction?: boolean;
  showPlayerCardScore?: boolean;
  showPlayerCardInfo?: boolean;
  showTeamComparisonSummary?: boolean;
  showPlayerSessionSummary?: boolean;
  playerCardInfo?: PlayerCardInfoMode;
  ref?: Ref<ClanBalanceRosterEditorHandle>;
}) {
  const helpId = useId();
  const [autosave] = useState(
    () =>
      new RosterAutosave(
        { roster: initialRoster, revision },
        ({ roster, revision: expectedRevision }) =>
          updateBalanceRosterAction(
            gameSlug,
            clanId,
            sessionId,
            JSON.stringify(roster),
            expectedRevision,
          ),
      ),
  );
  const { roster, dirty, saving, error, remoteLoads } = useSyncExternalStore(
    autosave.subscribe,
    autosave.getSnapshot,
    autosave.getSnapshot,
  );
  useEffect(() => { onRosterChange?.(roster); }, [roster, onRosterChange]);
  useImperativeHandle(ref, () => ({ flush: autosave.flush, getRoster: () => autosave.getSnapshot().roster }), [autosave]);
  useEffect(() => {
    autosave.receiveRemote({ roster: initialRoster, revision });
  }, [autosave, initialRoster, revision]);
  useEffect(() => {
    onDirtyChange?.(dirty || saving);
  }, [dirty, saving, onDirtyChange]);
  useEffect(
    () => () => {
      void autosave.flush();
    },
    [autosave],
  );
  useEffect(() => {
    if (!dirty && !saving) return;
    const preventUnsavedExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnsavedExit);
    return () => window.removeEventListener("beforeunload", preventUnsavedExit);
  }, [dirty, saving]);
  const [history, setHistory] = useState<BalanceRoster[]>([]);
  const [historyRemoteLoads, setHistoryRemoteLoads] = useState(remoteLoads);
  if (historyRemoteLoads !== remoteLoads) {
    setHistoryRemoteLoads(remoteLoads);
    setHistory([]);
  }
  const [query, setQuery] = useState("");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<string | null>(null);
  const usedIds = new Set(rosterAssignedUserIds(roster));
  const availablePool = pool.filter((member) => !usedIds.has(member.user_id));
  const visiblePool = availablePool.filter((member) =>
    member.nickname
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const nickById = new Map(
    pool.map((member) => [member.user_id, member.nickname]),
  );
  const firstEmpty = SLOT_ADDRESSES.find(
    ({ team, slot }) => !balanceSlotMember(roster[team], slot),
  );

  function clearInteraction() {
    setActiveSlot(null);
    setDraggedSlot(null);
    setDropSlot(null);
  }

  function apply(next: BalanceRoster) {
    if (!canEdit) return;
    clearInteraction();
    if (JSON.stringify(next) === JSON.stringify(roster)) return;
    setHistory((previous) => [...previous.slice(-99), roster]);
    autosave.edit(next);
  }

  function addMember(userId: string) {
    if (!firstEmpty || usedIds.has(userId)) return;
    const next = structuredClone(roster);
    setSlot(next, firstEmpty, userId);
    apply(next);
  }

  function emptySlot(address: SlotAddress) {
    const next = structuredClone(roster);
    setSlot(next, address, null);
    apply(next);
  }

  function moveMember(sourceKey: string, target: SlotAddress) {
    const source = SLOT_ADDRESSES.find(
      (address) => addressKey(address) === sourceKey,
    );
    if (!source || sourceKey === addressKey(target)) {
      clearInteraction();
      return;
    }
    const movingId = balanceSlotMember(roster[source.team], source.slot);
    if (!movingId) return;
    const next = structuredClone(roster);
    setSlot(next, source, balanceSlotMember(roster[target.team], target.slot));
    setSlot(next, target, movingId);
    apply(next);
  }

  function undo() {
    if (!canEdit) return;
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((entries) => entries.slice(0, -1));
    autosave.edit(previous);
    clearInteraction();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>{scoreControl}</div>
        {canEdit ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={history.length === 0}
              onClick={undo}
              aria-label="명단 변경 되돌리기"
              title="되돌리기"
            >
              <Undo2 className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={usedIds.size === 0}
              onClick={() => apply(structuredClone(EMPTY_ROSTER))}
              aria-label="출전 명단 초기화"
              title="초기화"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
      <p id={helpId} className="sr-only">
        아래 클랜원을 누르면 1팀부터 순서대로 빈자리에 들어갑니다. 참여자를 끌어
        다른 자리로 이동하거나 교환할 수 있습니다. 키보드 또는 터치로는 참여자와
        도착할 자리를 차례로 누르세요. 우클릭이나 Delete 키로 자리를 비우고
        Escape 키로 이동 선택을 취소할 수 있습니다.
      </p>
      <div aria-label="출전 명단 편집" aria-describedby={helpId}>
        <BalanceTeamHeading roster={roster} scores={scores} mode={scoreMode} premium={planPremium} showPrediction={showPrediction} samplePrediction={samplePrediction} showSummary={showTeamComparisonSummary} />
        <div className="space-y-2 rounded-xl bg-muted/35 p-2 sm:p-3">
          {BALANCE_SLOTS.map((slot) => (
            <div
              key={slot.key}
              className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"
            >
              {TEAMS.map((team, index) => {
                const address = { team, slot };
                const key = addressKey(address);
                const userId = balanceSlotMember(roster[team], slot);
                const nickname = userId
                  ? (nickById.get(userId) ?? "탈퇴한 멤버")
                  : "빈자리";
                const teamLabel = team === "team1" ? "1팀" : "2팀";
                return (
                  <div key={team} className="contents">
                    {index === 1 ? <BalanceRoleIcon slot={slot} /> : null}
                    <BalancePlayerDetails nickname={nickname} info={userId ? playerSessionInfo?.[userId] : undefined} score={userId ? scores?.[userId] : undefined} premium={planPremium} sample={Boolean(userId && samplePlayerIds.includes(userId))} enabled={showPlayerSessionSummary}>
                    <button
                      type="button"
                      data-roster-slot={key}
                      disabled={!canEdit}
                      draggable={canEdit && Boolean(userId)}
                      aria-label={`${teamLabel} ${slot.label}: ${nickname}`}
                      aria-pressed={activeSlot === key}
                      aria-describedby={helpId}
                      className={cn(
                        "relative flex min-h-20 min-w-0 flex-col gap-1 select-none items-center justify-center rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3",
                        team === "team1"
                          ? "border-sky-500/35 bg-sky-500/[0.08]"
                          : "border-rose-500/35 bg-rose-500/[0.08]",
                        !userId && "border-dashed text-muted-foreground/65",
                        userId &&
                          canEdit &&
                          "cursor-grab active:cursor-grabbing",
                        (activeSlot === key || dropSlot === key) &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        draggedSlot === key && "opacity-50",
                      )}
                      onClick={() => {
                        if (activeSlot) moveMember(activeSlot, address);
                        else if (userId) setActiveSlot(key);
                      }}
                      onContextMenu={(event) => {
                        if (!canEdit) return;
                        event.preventDefault();
                        emptySlot(address);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Delete" ||
                          event.key === "Backspace"
                        ) {
                          event.preventDefault();
                          emptySlot(address);
                        } else if (event.key === "Escape") clearInteraction();
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_TYPE, key);
                        event.dataTransfer.effectAllowed = "move";
                        setActiveSlot(null);
                        setDraggedSlot(key);
                      }}
                      onDragEnd={clearInteraction}
                      onDragOver={(event) => {
                        if (!canEdit || !draggedSlot) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropSlot(key);
                      }}
                      onDragLeave={() => setDropSlot(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!canEdit || !draggedSlot) return;
                        const source = event.dataTransfer.getData(DRAG_TYPE);
                        if (source === draggedSlot) moveMember(source, address);
                        else clearInteraction();
                      }}
                    >
                      <BalancePlayerCardContent nickname={nickname} info={userId ? playerSessionInfo?.[userId] : undefined} score={userId ? scores?.[userId] : undefined} showScore={Boolean(showPlayerCardScore && scores && userId)} showInfo={showPlayerCardInfo} infoMode={playerCardInfo} mode={scoreMode} mirrored={team === "team2"} />
                    </button>
                    </BalancePlayerDetails>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <section
        className="overflow-hidden rounded-xl border bg-muted/15"
        aria-label="참가 가능 클랜원"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <h4 className="text-xs font-semibold">
            클랜원{" "}
            <span className="ml-1 tabular-nums text-muted-foreground">
              {availablePool.length}
            </span>
          </h4>
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
        <div className="grid min-h-24 grid-cols-2 content-start gap-2 p-3 sm:grid-cols-3 sm:p-4">
          {visiblePool.length ? (
            visiblePool.map((member) => (
              <BalancePlayerDetails key={member.user_id} nickname={member.nickname} info={playerSessionInfo?.[member.user_id]} score={scores?.[member.user_id]} premium={planPremium} sample={samplePlayerIds.includes(member.user_id)} enabled={showPlayerSessionSummary}>
              <button
                type="button"
                aria-disabled={!canEdit || !firstEmpty}
                onClick={() => { if (canEdit && firstEmpty) addMember(member.user_id); }}
                aria-label={`${member.nickname} 출전 명단에 추가`}
                className="flex min-h-11 min-w-0 items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:cursor-default aria-disabled:opacity-50"
              >
                <span className="truncate">{member.nickname}</span>
              </button>
              </BalancePlayerDetails>
            ))
          ) : (
            <p className="col-span-full py-3 text-xs text-muted-foreground">
              {query.trim()
                ? "검색 결과가 없습니다."
                : pool.length
                  ? "출전 명단에 추가할 클랜원이 없습니다."
                  : "참가할 수 있는 클랜원이 없습니다."}
            </p>
          )}
        </div>
      </section>
      {canEdit && error ? (
        <div
          className="space-y-2 rounded-lg border border-destructive/40 p-3"
          role="alert"
        >
          <p className="text-xs text-destructive">{error.message}</p>
          <div className="flex flex-wrap gap-2">
            {error.remote?.editable !== false ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  void autosave.retry();
                }}
              >
                {error.remote ? "내 변경 다시 적용" : "다시 시도"}
              </Button>
            ) : null}
            {error.remote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => autosave.loadRemote()}
              >
                최신 명단 불러오기
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
