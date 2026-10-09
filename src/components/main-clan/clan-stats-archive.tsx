"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Clock, Crown, Crosshair, Shield, Plus, Pencil, Trash2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClanStatsPageModel, ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { isoToKstYmd } from "@/lib/clan/stats/kst";
import { cn } from "@/lib/utils";
import { ArchiveDatePicker } from "./archive-date-picker";
import { ArchiveDayTable } from "./archive-day-table";
import { StatsDetailLoader, type StatsDetailCache } from "./stats-detail-loader";
import { MatchRecordEditor } from "./match-record-editor";

export function ClanStatsArchive({ archive, clanId, canEdit = false, periodKey = "all", filters, mapFilter = "all", participantSearch = "" }: {
  archive: ClanStatsPageModel["archive"];
  clanId?: string;
  canEdit?: boolean;
  periodKey?: string;
  filters?: ReactNode;
  mapFilter?: string;
  participantSearch?: string;
}) {
  const router = useRouter();
  const [selection, setSelectedDay] = useState<string>();
  const [saved, setSaved] = useState<{ base: typeof archive; data: typeof archive }>();
  const current = saved?.base === archive ? saved.data : archive;
  const selectedDay = selection ?? current.datesKst[0] ?? isoToKstYmd(new Date().toISOString());
  const dayRecords = current.sampleByDate[selectedDay] ?? [];
  const { requests: cache } = useMemo(() => ({ current, requests: new Map() as StatsDetailCache }), [current]);
  const fetchDay = clanId && current.deferredDays && current.datesKst.includes(selectedDay) && !current.sampleByDate[selectedDay];
  const onSaved = (data: typeof archive, day: string) => { setSaved({ base: archive, data }); setSelectedDay(day); router.refresh(); };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3" aria-label="경기 기록 날짜 및 필터">
      <ArchiveDatePicker value={selectedDay} onChange={setSelectedDay} dates={current.datesKst} periodKey={periodKey} />
      {filters}
    </div>
    <StatsDetailLoader cache={cache} url={fetchDay ? `/api/clans/${clanId}/stats?section=archive&day=${selectedDay}` : undefined} initial={{ kind: "archive", archive: { ...current, sampleByDate: { [selectedDay]: dayRecords } } }}>
      {(detail, pending) => detail.kind === "archive" && <ArchiveDay dayRecords={detail.archive.sampleByDate[selectedDay] ?? []} mapFilter={mapFilter} participantSearch={participantSearch} pending={pending} editor={clanId && canEdit ? { clanId, day: selectedDay, members: current.members ?? [], onSaved, onReload: () => router.refresh() } : undefined} />}
    </StatsDetailLoader>
  </div>;
}

type EditorContext = { clanId: string; day: string; members: { userId: string; nickname: string }[]; onSaved: (archive: ClanStatsPageModel["archive"], day: string) => void; onReload: () => void };

function ArchiveDay({ dayRecords, mapFilter, participantSearch, pending, editor }: { dayRecords: ClanArchiveMatch[]; mapFilter: string; participantSearch: string; pending: boolean; editor?: EditorContext }) {
  const term = participantSearch.trim().toLocaleLowerCase("ko");
  const records = dayRecords.filter((row) => (mapFilter === "all" || row.mapLabel === mapFilter) && (!term || row.players.some((player) => player.nickname.toLocaleLowerCase("ko").includes(term))));
  return <div className="grid items-stretch gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ArchiveRecords records={records} editor={editor} pending={pending} emptyText={dayRecords.length ? "선택한 조건에 맞는 경기가 없습니다." : "이 날짜에는 기록된 경기가 없습니다."} />
      <ArchiveDayTable records={dayRecords} />
  </div>;
}

function ArchiveRecords({ records, editor, pending, emptyText }: { records: ClanArchiveMatch[]; editor?: EditorContext; pending: boolean; emptyText: string }) {
  const [activeId, setActiveId] = useState(records[0]?.id);
  const [editing, setEditing] = useState<{ mode: "create" | "update" | "delete"; match?: ClanArchiveMatch }>();
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
        className="flex h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
        aria-label="경기 상세"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 border-b bg-muted/20 px-2 py-2 sm:px-3">
          <h5 className="truncate text-xs font-semibold">경기 기록</h5>
          <div className="flex items-center gap-1" aria-label="경기 기록 이동">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 sm:size-8"
              aria-label="이전 경기"
              disabled={pending || activeIndex === 0}
              onClick={() => setActiveId(records[activeIndex - 1].id)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {records.length ? activeIndex + 1 : 0} / {records.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 sm:size-8"
              aria-label="다음 경기"
              disabled={pending || activeIndex >= records.length - 1}
              onClick={() => setActiveId(records[activeIndex + 1].id)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center justify-end sm:gap-0.5">
            {editor && <>
              <Button size="icon-sm" variant="ghost" className="size-6 sm:size-8" aria-label="기록 추가" title="기록 추가" disabled={pending} onClick={() => setEditing({ mode: "create" })}><Plus className="size-3.5" aria-hidden="true" /></Button>
              <Button size="icon-sm" variant="ghost" className="size-6 sm:size-8" aria-label="기록 수정" title="기록 수정" disabled={pending || !match?.revision} onClick={() => setEditing({ mode: "update", match })}><Pencil className="size-3.5" aria-hidden="true" /></Button>
              <Button size="icon-sm" variant="ghost" className="size-6 sm:size-8" aria-label="기록 제거" title="기록 제거" disabled={pending || !match?.revision} onClick={() => setEditing({ mode: "delete", match })}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
            </>}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-ring" tabIndex={0} aria-label="경기 상세 내용">
        {match ? <div className="space-y-5 p-4">
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
          <div className="grid grid-cols-2 gap-3">
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
                <ul aria-label={team === 1 ? "블루 팀 명단" : "레드 팀 명단"} className="grid grid-cols-1 gap-2">
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
                            "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-xs",
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
                            className="min-w-0 flex-1 break-all font-medium leading-relaxed"
                            title={player.nickname}
                          >
                            {player.nickname}
                          </span>
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
            {new Date(match.occurredAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div> : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"><Swords className="size-7 text-muted-foreground/30" aria-hidden="true" /><p role="status" className="text-sm text-muted-foreground">{pending ? "경기 기록을 불러오는 중…" : emptyText}</p></div>}
        </div>
        {editing && editor && <MatchRecordEditor key={`${editing.mode}:${editing.match?.id ?? "new"}`} {...editor} mode={editing.mode} match={editing.match} onClose={() => setEditing(undefined)} onReload={() => { setEditing(undefined); editor.onReload(); }} onSaved={(archive, day) => { setEditing(undefined); editor.onSaved(archive, day); }} />}
      </section>
  );
}
