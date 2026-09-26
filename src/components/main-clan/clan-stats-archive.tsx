"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, Crown, Crosshair, Shield, Plus, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClanStatsPageModel, ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { isoToKstYmd } from "@/lib/clan/stats/kst";
import { cn } from "@/lib/utils";
import { ArchiveDatePicker } from "./archive-date-picker";
import { ArchiveDayTable } from "./archive-day-table";

export function ClanStatsArchive({ archive, periodKey = "all", filters, mapFilter = "all", participantSearch = "" }: {
  archive: ClanStatsPageModel["archive"];
  periodKey?: string;
  filters?: ReactNode;
  mapFilter?: string;
  participantSearch?: string;
}) {
  const [selectedDay, setSelectedDay] = useState(() => archive.datesKst[0] ?? (periodKey === "all" ? isoToKstYmd(new Date().toISOString()) : periodKey + (periodKey.length === 4 ? "-01" : "") + "-01"));
  const dayRecords = archive.sampleByDate[selectedDay] ?? [];
  const term = participantSearch.trim().toLocaleLowerCase("ko");
  const records = dayRecords.filter((row) => (mapFilter === "all" || row.mapLabel === mapFilter) && (!term || row.players.some((player) => player.nickname.toLocaleLowerCase("ko").includes(term))));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3" aria-label="경기 기록 날짜 및 필터">
      <ArchiveDatePicker value={selectedDay} onChange={setSelectedDay} dates={archive.datesKst} periodKey={periodKey} />
      {filters}
    </div>
    <div className="grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {records.length ? <ArchiveRecords key={selectedDay} records={records} /> : <section aria-label="경기 상세" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
        <Swords className="size-7 text-muted-foreground/30" aria-hidden="true" />
        <p role="status" className="text-sm text-muted-foreground">{dayRecords.length ? "선택한 조건에 맞는 경기가 없습니다." : "이 날짜에는 기록된 경기가 없습니다."}</p>
        <p className="text-xs text-muted-foreground">{dayRecords.length ? "맵 또는 참가자 필터를 변경해 보세요." : "날짜를 눌러 다른 날의 기록을 확인하세요."}</p>
      </section>}
      <ArchiveDayTable records={dayRecords} />
    </div>
  </div>;
}

function ArchiveRecords({ records }: { records: ClanArchiveMatch[] }) {
  const [activeId, setActiveId] = useState(records[0].id);
  const activeIndex = Math.max(
    0,
    records.findIndex((record) => record.id === activeId),
  );
  const match = records[activeIndex];
  const typeLabels: Record<string, string> = {
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
  return (
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
              {match.matchType !== "intra" && <span className="text-[10px] font-semibold text-muted-foreground">
                {typeLabels[match.matchType] ?? match.matchType}
              </span>}
              <h5 className="flex items-center gap-1.5 text-sm font-semibold">
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
          <div className="space-y-4">
            {([1, 2] as const).map((team) => (
              <div key={team} className="min-w-0">
                <div
                  className={cn(
                    "mb-2 flex items-center gap-1.5 text-xs font-bold",
                    team === 1
                      ? "text-sky-600 dark:text-sky-300"
                      : "text-rose-600 dark:text-rose-300",
                  )}
                >
                  <Crown className={cn("size-3.5", match.winnerTeam !== team && "invisible")} aria-label={match.winnerTeam === team ? "승리 팀" : undefined} />
                  <span>{team === 1 ? "블루 팀" : "레드 팀"}</span>
                </div>
                <ul aria-label={team === 1 ? "블루 팀 명단" : "레드 팀 명단"} className="grid grid-cols-5 gap-1.5">
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
                            "flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border px-1 py-2 text-center text-[10px]",
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
                            className="w-full break-all font-medium leading-relaxed"
                            title={player.nickname}
                          >
                            {player.nickname}
                          </span>
                        </li>
                      );
                    })}
                  {!match.players.some((player) => player.team === team) ? (
                    <li className="col-span-5 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
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
            {new Date(match.occurredAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </section>
  );
}
