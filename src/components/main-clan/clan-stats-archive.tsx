"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Crown,
  Crosshair,
  Shield,
  Plus,
  Trophy,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ClanStatsPageModel,
  ClanArchiveMatch,
} from "@/lib/clan/stats/load-clan-stats";
import { isoToKstYmd } from "@/lib/clan/stats/kst";
import { StatsScrollArea } from "./stats-scroll-area";
import { cn } from "@/lib/utils";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function ClanStatsArchive({
  archive,
}: {
  archive: ClanStatsPageModel["archive"];
}) {
  const [selectedDay, setSelectedDay] = useState(
    () => archive.datesKst[0] ?? isoToKstYmd(new Date().toISOString()),
  );
  const [cursor, setCursor] = useState(() => parseDay(selectedDay));
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<string | null>(null);
  const monday = new Date(cursor);
  monday.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
  const hasRecord = new Set(archive.datesKst);
  const records = archive.sampleByDate[selectedDay] ?? [];

  useEffect(() => {
    if (focusRef.current)
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-archive-date="${focusRef.current}"]`,
        )
        ?.focus();
    focusRef.current = null;
  }, [selectedDay, cursor]);

  function selectDay(day: Date, focus = false) {
    const key = dateKey(day);
    if (focus) focusRef.current = key;
    setSelectedDay(key);
    setCursor(day);
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border bg-muted/15">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="경기 기록 이전 주"
            onClick={() => {
              const day = new Date(cursor);
              day.setDate(day.getDate() - 7);
              selectDay(day);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <h4 className="text-sm font-semibold">
            {monday.toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            — {days[6].getMonth() + 1}월 {days[6].getDate()}일
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="경기 기록 다음 주"
            onClick={() => {
              const day = new Date(cursor);
              day.setDate(day.getDate() + 7);
              selectDay(day);
            }}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div
          ref={calendarRef}
          role="grid"
          aria-label="경기 기록 날짜 선택"
          className="px-3 pb-4"
        >
          <div role="row" className="grid grid-cols-7">
            {["월", "화", "수", "목", "금", "토", "일"].map((label) => (
              <span
                key={label}
                role="columnheader"
                className="py-2 text-center text-[10px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
          {[0].map((week) => (
            <div role="row" key={week} className="grid grid-cols-7">
              {days.map((day) => {
                const key = dateKey(day);
                return (
                  <div
                    key={key}
                    role="gridcell"
                    aria-selected={selectedDay === key}
                  >
                    <button
                      type="button"
                      data-archive-date={key}
                      aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일${hasRecord.has(key) ? " 경기 기록 있음" : ""}`}
                      tabIndex={selectedDay === key ? 0 : -1}
                      onClick={() => selectDay(day)}
                      onKeyDown={(event) => {
                        const offset = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        }[event.key];
                        if (offset) {
                          event.preventDefault();
                          const next = new Date(day);
                          next.setDate(day.getDate() + offset);
                          selectDay(next, true);
                        }
                      }}
                      className={cn(
                        "flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg text-xs tabular-nums hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                        selectedDay === key &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      <span>{day.getDate()}</span>
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          hasRecord.has(key)
                            ? selectedDay === key
                              ? "bg-primary-foreground"
                              : "bg-primary"
                            : "bg-transparent",
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="border-t px-4 py-3 text-[10px] text-muted-foreground">
          점이 표시된 날짜에 경기 기록이 있습니다. 날짜는 한국 시간 기준으로
          표시합니다.
        </p>
      </section>
      <section className="min-w-0 space-y-4" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            {parseDay(selectedDay).toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </h4>
          <span className="text-xs text-muted-foreground">
            {records.length}경기
          </span>
        </div>
        {records.length ? (
          <ArchiveRecords key={selectedDay} records={records} />
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <Swords
              className="size-7 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              이 날짜에는 기록된 경기가 없습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              캘린더에서 다른 날짜를 선택해 보세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ArchiveRecords({ records }: { records: ClanArchiveMatch[] }) {
  const [activeId, setActiveId] = useState(records[0].id);
  const activeIndex = Math.max(
    0,
    records.findIndex((record) => record.id === activeId),
  );
  const match = records[activeIndex];
  const typeLabels: Record<string, string> = {
    intra: "내전",
    scrim: "스크림",
    event: "이벤트",
  };
  const outcomes = {
    team1: "블루 팀 승리",
    team2: "레드 팀 승리",
    draw: "무승부",
    void: "무효 · 재경기",
    unrecorded: "결과 미기록",
  };
  const totals = new Map<
    string,
    { nickname: string; wins: number; losses: number; draws: number }
  >();
  for (const record of records) {
    if (
      record.matchType !== "intra" ||
      record.outcome === "void" ||
      record.outcome === "unrecorded"
    )
      continue;
    for (const player of record.players) {
      const total = totals.get(player.userId) ?? {
        nickname: player.nickname,
        wins: 0,
        losses: 0,
        draws: 0,
      };
      if (record.outcome === "draw") total.draws += 1;
      else if (record.winnerTeam === player.team) total.wins += 1;
      else total.losses += 1;
      totals.set(player.userId, total);
    }
  }
  const ranking = [...totals.entries()]
    .map(([userId, total]) => ({
      userId,
      ...total,
      rate:
        total.wins + total.losses
          ? total.wins / (total.wins + total.losses)
          : null,
    }))
    .sort(
      (a, b) =>
        (b.rate ?? -1) - (a.rate ?? -1) ||
        b.wins - a.wins ||
        a.userId.localeCompare(b.userId),
    );
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
      <section
        className="min-w-0 overflow-hidden rounded-xl border bg-card"
        aria-label="경기 상세"
      >
        <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
          <h5 className="text-xs font-semibold">경기 기록</h5>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="이전 경기"
              disabled={activeIndex === 0}
              onClick={() => setActiveId(records[activeIndex - 1].id)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {activeIndex + 1} / {records.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="다음 경기"
              disabled={activeIndex >= records.length - 1}
              onClick={() => setActiveId(records[activeIndex + 1].id)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="space-y-5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {typeLabels[match.matchType] ?? match.matchType}
              </span>
              <h5 className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {match.mapLabel ?? "맵 미기록"}
              </h5>
            </div>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                match.outcome === "team1"
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : match.outcome === "team2"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {match.winnerTeam ? (
                <Crown className="size-3" aria-hidden="true" />
              ) : null}
              {outcomes[match.outcome]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([1, 2] as const).map((team) => (
              <div key={team} className="min-w-0">
                <div
                  className={cn(
                    "mb-3 flex items-center justify-center gap-1.5 text-xs font-bold",
                    team === 1
                      ? "text-sky-600 dark:text-sky-300"
                      : "text-rose-600 dark:text-rose-300",
                  )}
                >
                  {match.winnerTeam === team ? (
                    <Crown className="size-3.5" aria-hidden="true" />
                  ) : null}
                  {team === 1 ? "블루 팀" : "레드 팀"}
                </div>
                <ul className="space-y-2">
                  {match.players
                    .filter((player) => player.team === team)
                    .map((player) => {
                      const Icon =
                        player.role === "tank"
                          ? Shield
                          : player.role === "dmg"
                            ? Crosshair
                            : player.role === "sup"
                              ? Plus
                              : null;
                      return (
                        <li
                          key={player.userId}
                          className={cn(
                            "flex min-h-14 min-w-0 items-center gap-2 rounded-lg border px-2 py-2.5 text-xs",
                            team === 1
                              ? "border-sky-500/25 bg-sky-500/[0.04]"
                              : "border-rose-500/25 bg-rose-500/[0.04]",
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label={
                                player.role === "tank"
                                  ? "탱커"
                                  : player.role === "dmg"
                                    ? "딜러"
                                    : "힐러"
                              }
                            />
                          ) : null}
                          <span
                            className="min-w-0 flex-1 truncate font-medium"
                            title={player.nickname}
                          >
                            {player.nickname}
                          </span>
                          {player.m !== null ? (
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              M {player.m}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  {!match.players.some((player) => player.team === team) ? (
                    <li className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      출전자 기록 없음
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-1.5 border-t pt-3 text-[10px] text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {match.source === "balance" ? "결과 확정" : "경기 시간"} ·{" "}
            {new Date(match.playedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </section>
      <aside
        className="overflow-hidden rounded-xl border bg-muted/15"
        aria-label="선택한 날짜 내전 승률 순위"
      >
        <h5 className="flex items-center gap-2 border-b px-4 py-3 text-xs font-semibold">
          <Trophy className="size-4 text-amber-500" aria-hidden="true" />
          이날의 내전 승률
        </h5>
        {ranking.length ? (
          <StatsScrollArea label="이날의 내전 승률 목록" className="max-h-80"><ol className="divide-y">
            {ranking.map((row, index) => (
              <li
                key={row.userId}
                className="flex min-w-0 items-center gap-2 px-4 py-3"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    index === 0
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{row.nickname}</p>
                  <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                    {row.wins}승 / {row.draws}무 / {row.losses}패
                  </p>
                </div>
                <strong className="text-xs tabular-nums">
                  {row.rate === null
                    ? "—"
                    : Math.round(row.rate * 1000) / 10 + "%"}
                </strong>
              </li>
            ))}
          </ol></StatsScrollArea>
        ) : (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            집계할 내전 결과가 없습니다.
          </p>
        )}
        <p className="border-t px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
          무승부는 승률 계산에서 제외합니다. 무효 경기와 결과 미기록 경기는
          순위에 포함되지 않습니다.
        </p>
      </aside>
    </div>
  );
}
