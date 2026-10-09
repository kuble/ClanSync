"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, History, LoaderCircle, RefreshCw } from "lucide-react";
import { loadBalanceHistoryAction } from "@/app/actions/clan-balance-history";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  calculateBalanceHistoryStats,
  sortBalanceHistoryStats,
  type BalanceHistoryData,
  type BalanceHistoryRound,
  type BalanceStatsSort,
  type BalanceStatsSortDirection,
  type PublicDrawEvent,
} from "@/lib/balance/history";
import { cn } from "@/lib/utils";
import { ClanBalanceRosterBoard } from "./clan-balance-roster-board";

type Props = {
  gameSlug: string;
  clanId: string;
  currentSeriesId: string | null;
  scope?: "clan" | "session";
  pool: readonly { user_id: string; nickname: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLE_LABEL = { tank: "탱커", dmg: "딜러", sup: "힐러" };
const MODE_LABEL = {
  keep: "현재 팀 유지",
  random: "팀 추첨",
  draft: "주장 지명",
  auction: "포인트 경매",
};
const STAT_COLUMNS: { key: BalanceStatsSort; label: string }[] = [
  { key: "appearances", label: "출전" },
  { key: "wins", label: "승/무/패" },
  { key: "winRate", label: "승률" },
  { key: "currentStreak", label: "현재 연속" },
];
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function timeLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? timeFormatter.format(date)
    : "시간 미상";
}

function outcomeLabel(round: BalanceHistoryRound): string {
  if (round.match_outcome === "team1") return "1팀 승리";
  if (round.match_outcome === "team2") return "2팀 승리";
  if (round.match_outcome === "draw") return "무승부";
  if (round.match_outcome === "void") return "무효";
  return round.phase === "editing" ? "편성 중" : "결과 대기";
}

function DrawAudit({
  event,
  nickname,
}: {
  event: PublicDrawEvent;
  nickname: (id: string) => string;
}) {
  const settings = event.settings;
  const roles = new Map(
    event.players.map((player) => [player.id, player.role]),
  );
  const drawId = event.draw?.id;
  return (
    <li className="space-y-2 rounded-lg border bg-background p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {event.event === "reset" ? "편성 초기화" : "편성 시작"}
        </span>
        <time dateTime={event.at} className="text-muted-foreground">
          {timeLabel(event.at)} KST
        </time>
      </div>
      {drawId ? (
        <p className="break-all text-[10px] text-muted-foreground">
          추첨 {drawId}
        </p>
      ) : null}
      {event.event === "start" ? (
        <>
          <p className="text-muted-foreground">
            {event.draw?.roleMode === "lottery" || settings?.roles === "lottery"
              ? "선호 역할 추첨"
              : "역할 직접 배정"}
            {event.mode ? ` · ${MODE_LABEL[event.mode]}` : ""}
          </p>
          {settings?.teams === "auction" || event.mode === "auction" ? (
            <p className="text-muted-foreground">
              {settings?.auctionBudget != null
                ? `팀당 ${settings.auctionBudget.toLocaleString("ko-KR")}P`
                : "예산 기록 없음"}
              {settings?.minBid != null ? ` · 최소 ${settings.minBid}P` : ""}
              {settings?.durationSeconds != null
                ? ` · ${settings.durationSeconds}초`
                : ""}
              {settings?.auctionPreparationSeconds != null ? ` · 낙찰 후 준비 ${settings.auctionPreparationSeconds}초` : ""}
              {settings?.bidExtensionSeconds != null ? ` · 입찰 연장 ${settings.bidExtensionSeconds}초` : ""}
            </p>
          ) : null}
          {settings?.captains?.length ? (
            <p>주장: {settings.captains.map(nickname).join(" · ")}</p>
          ) : null}
          {event.order.length ? (
            <div>
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                저장된 추첨 순서
              </p>
              <ol className="flex flex-wrap gap-1.5">
                {event.order.map((id, index) => (
                  <li key={id} className="rounded-md bg-muted px-2 py-1">
                    <span className="mr-1.5 tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    {nickname(id)}
                    {roles.has(id) ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {ROLE_LABEL[roles.get(id)!]}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground">이전 추첨 기록은 유지됩니다.</p>
      )}
    </li>
  );
}

function HistoryContent({
  gameSlug,
  clanId,
  currentSeriesId,
  scope = "clan",
  pool,
}: Omit<Props, "open" | "onOpenChange">) {
  const [refresh, setRefresh] = useState(0);
  const [sort, setSort] = useState<BalanceStatsSort>("winRate");
  const [sortDirection, setSortDirection] = useState<BalanceStatsSortDirection>("desc");
  const [response, setResponse] = useState<{
    key: string;
    data: BalanceHistoryData | null;
    error: string | null;
  } | null>(null);
  const requestKey = `${gameSlug}:${clanId}:${currentSeriesId ?? "latest"}:${scope}:${refresh}`;
  useEffect(() => {
    let cancelled = false;
    loadBalanceHistoryAction(gameSlug, clanId, currentSeriesId, scope === "clan" ? "today" : "session")
      .then((result) => {
        if (cancelled) return;
        setResponse(
          result.ok
            ? { key: requestKey, data: result.data, error: null }
            : { key: requestKey, data: null, error: result.error },
        );
      })
      .catch(() => {
        if (!cancelled)
          setResponse({
            key: requestKey,
            data: null,
            error: "기록을 불러오지 못했습니다. 다시 시도하세요.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [gameSlug, clanId, currentSeriesId, scope, requestKey]);

  const loading = response?.key !== requestKey;
  const data = response?.data;
  const stats = useMemo(
    () =>
      sortBalanceHistoryStats(
        calculateBalanceHistoryStats(data?.rounds ?? [], scope === "clan"),
        sort,
        sortDirection,
      ),
    [data, sort, sortDirection, scope],
  );
  const changeSort = (next: BalanceStatsSort) => {
    if (next === sort) {
      setSortDirection((current) => current === "desc" ? "asc" : "desc");
      return;
    }
    setSort(next);
    setSortDirection("desc");
  };
  const nicknames = new Map(
    pool.map((member) => [member.user_id, member.nickname]),
  );
  const nickname = (id: string) =>
    nicknames.get(id) ?? `이전 멤버 · ${id.slice(0, 6)}`;
  const historyPool = [
    ...pool,
    ...stats
      .filter((member) => !nicknames.has(member.userId))
      .map((member) => ({
        user_id: member.userId,
        nickname: nickname(member.userId),
      })),
  ];
  const selected = data?.series.find(
    (series) => series.id === data.selectedSeriesId,
  );
  const completed =
    data?.rounds.filter(
      (round) =>
        round.match_outcome === "team1" || round.match_outcome === "team2" ||
        round.match_outcome === "draw",
    ).length ?? 0;

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 pb-3 sm:px-6">
        <p className="text-sm font-medium">
          {(data?.date ?? selected?.session_date)?.replaceAll("-", ".")}
          {data?.date ? <span className="ml-2 text-xs text-muted-foreground">오늘 · 한국시간</span> : null}
        </p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="내전 기록 새로고침"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw
            className={cn("size-4", loading && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6"
        aria-busy={loading}
      >
        {loading ? (
          <div
            className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            내전 기록을 불러오고 있습니다.
          </div>
        ) : response?.error ? (
          <div
            className="space-y-3 rounded-xl border p-5 text-center"
            role="alert"
          >
            <p>{response.error}</p>
            <Button
              variant="outline"
              onClick={() => setRefresh((value) => value + 1)}
            >
              다시 불러오기
            </Button>
          </div>
        ) : !data?.rounds.length ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {scope === "clan" ? "오늘 기록된 내전 경기가 없습니다." : "아직 기록된 내전 경기가 없습니다."}
          </p>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" data-testid="balance-history-columns">
            <div className="min-w-0 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["완료 경기", `${completed}판`],
                  [
                    "참여자",
                    `${stats.length}명`,
                  ],
                  ["진행 중", `${data.rounds.filter((round) => round.match_outcome === "pending").length}판`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border bg-muted/25 px-2 py-3 text-center"
                  >
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {label}
                    </p>
                    <p className="mt-1 text-base font-bold sm:text-lg">{value}</p>
                  </div>
                ))}
              </div>
              <section
                aria-labelledby="balance-history-rounds-heading"
                className="space-y-3"
              >
                <h3 id="balance-history-rounds-heading" className="font-semibold">
                  {scope === "clan" ? "오늘 경기" : "경기 기록"}{" "}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {data?.rounds.length ?? 0}
                  </span>
                </h3>
                {data?.rounds.length ? (
                  data.rounds.map((round, index) => (
                    <details key={round.id} open={index === 0} className="group rounded-xl border" data-testid="balance-history-round">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                        <span className="shrink-0 font-bold">
                          {round.round_number}라운드
                          <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{timeLabel(round.opened_at)}</span>
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {round.resolved_map_label ?? "맵 미지정"}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            round.match_outcome === "team1" &&
                              "text-sky-600 dark:text-sky-300",
                            round.match_outcome === "team2" &&
                              "text-rose-600 dark:text-rose-300",
                          )}
                        >
                          {outcomeLabel(round)}
                        </span>
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="space-y-3 border-t p-3 [&_[data-board-slot]]:min-h-12 [&_[data-board-slot]]:py-2 sm:p-4">
                        <ClanBalanceRosterBoard
                          roster={round.roster}
                          pool={historyPool}
                          outcome={round.match_outcome}
                        />
                        <details className="rounded-lg bg-muted/30 p-3">
                          <summary className="cursor-pointer text-xs font-medium">
                            편성·추첨 이력{" "}
                            <span className="text-muted-foreground">
                              ({round.drawHistory.length})
                            </span>
                          </summary>
                          {round.drawHistory.length ? (
                            <ol className="mt-3 space-y-2">
                              {round.drawHistory.map((event, index) => (
                                <DrawAudit
                                  key={`${event.at}:${index}`}
                                  event={event}
                                  nickname={nickname}
                                />
                              ))}
                            </ol>
                          ) : (
                            <p className="mt-3 text-xs text-muted-foreground">
                              저장된 편성·추첨 이력이 없습니다.
                            </p>
                          )}
                        </details>
                      </div>
                    </details>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    아직 라운드가 없습니다.
                  </p>
                )}
              </section>
            </div>
            <section
              aria-labelledby="balance-history-stats-heading"
              className="min-w-0 space-y-3 rounded-xl border bg-muted/15 p-3 sm:p-4 lg:sticky lg:top-0"
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="balance-history-stats-heading"
                  className="font-semibold"
                >
                  참여자 통계
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                승·무·패가 확정된 경기만 집계합니다. 무승부는 연승·연패를
                끊으며, 대기·무효 경기와 쉬어 간 라운드는 집계하지 않습니다.
              </p>
              {stats.length ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[400px] text-xs tabular-nums">
                    <thead className="bg-muted/45 text-muted-foreground">
                      <tr>
                        <th scope="col" className="whitespace-nowrap px-3 py-3 text-left font-medium">참여자</th>
                        {STAT_COLUMNS.map((column) => {
                          const active = sort === column.key;
                          const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                          return <th
                            key={column.key}
                            scope="col"
                            aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                            className="whitespace-nowrap px-1 py-1 text-right font-medium"
                          >
                            <button
                              type="button"
                              className={cn("inline-flex min-h-9 w-full items-center justify-end gap-1 rounded-md px-2 py-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring", active && "text-foreground")}
                              aria-label={`${column.key === "wins" ? "승수" : column.label} ${active ? (sortDirection === "desc" ? "오름차순" : "내림차순") : "내림차순"}으로 정렬`}
                              onClick={() => changeSort(column.key)}
                            >
                              {column.label}
                              <Icon className={cn("size-3.5", !active && "opacity-45")} aria-hidden="true" />
                            </button>
                          </th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((member) => (
                        <tr key={member.userId} className="border-t">
                          <th
                            scope="row"
                            className="max-w-44 truncate px-3 py-3 text-left font-medium"
                            title={nickname(member.userId)}
                          >
                            {nickname(member.userId)}
                          </th>
                          <td className="px-3 py-3 text-right">
                            {member.appearances}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span aria-label={`${member.wins}승 ${member.draws}무 ${member.losses}패`}>{member.wins}/{member.draws}/{member.losses}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {member.winRate === null
                              ? "—"
                              : `${Math.round(member.winRate)}%`}
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-3 py-3 text-right",
                              member.currentStreak > 0 &&
                                "text-sky-600 dark:text-sky-300",
                              member.currentStreak < 0 &&
                                "text-rose-600 dark:text-rose-300",
                            )}
                          >
                            {member.currentStreak === 0
                              ? "—"
                              : `${Math.abs(member.currentStreak)}연${member.currentStreak > 0 ? "승" : "패"}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
                  아직 등록된 참여자가 없습니다.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

export function ClanBalanceHistoryDrawer({
  open,
  onOpenChange,
  ...props
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-4 data-[side=right]:w-full data-[side=right]:sm:max-w-[min(1180px,96vw)]">
        <SheetHeader className="shrink-0 px-4 pr-14 pb-0 sm:px-6 sm:pr-14">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-5" aria-hidden="true" />
            내전 기록
          </SheetTitle>
          <SheetDescription>
            {props.scope === "session" ? "이 깜짝 내전의 기록만 표시합니다. 세션 종료 시 모두 삭제됩니다." : "오늘의 경기 정보와 참여자 통계"}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <HistoryContent
            key={`${props.clanId}:${props.currentSeriesId ?? "latest"}`}
            {...props}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
