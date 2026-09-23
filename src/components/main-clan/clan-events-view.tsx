"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  Plus,
  Repeat2,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelClanEventAction,
  listClanEventRsvpAttendeesAction,
  toggleClanEventRsvpAction,
  updateClanEventAction,
} from "@/app/actions/clan-events";
import { ClanEventsBracketTab } from "@/components/main-clan/clan-events-bracket-tab";
import { ClanEventsPollsTab } from "@/components/main-clan/clan-events-polls-tab";
import { CreateClanEventForm } from "@/components/main-clan/create-clan-event-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ClanEventOccurrenceVm,
  SerializedClanEvent,
} from "@/lib/clan/expand-clan-event-occurrences";
import {
  clanEventRsvpKey,
  dateKeyLocalFromDate,
  expandClanEventsForLocalCalendarMonth,
  repeatSummaryKo,
} from "@/lib/clan/expand-clan-event-occurrences";
import type { SerializedBracketTournament } from "@/lib/clan/load-bracket-tournaments";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { cn } from "@/lib/utils";

const WD_EDIT_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function kindLabel(kind: string): string {
  if (kind === "intra") return "내전";
  if (kind === "scrim") return "스크림";
  return "이벤트";
}

function kindDotClass(kind: string): string {
  if (kind === "intra") return "bg-violet-500";
  if (kind === "scrim") return "bg-emerald-500";
  return "bg-orange-500";
}

function buildCalendarCells(
  year: number,
  month: number,
): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < pad; i++) {
    const dayNum = i - pad + 1;
    cells.push({ date: new Date(year, month, dayNum), inMonth: false });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const n = new Date(last);
    n.setDate(n.getDate() + 1);
    cells.push({ date: n, inMonth: false });
  }
  return cells;
}

function kindsOnDay(
  dayKey: string,
  occurrences: ClanEventOccurrenceVm[],
): string[] {
  const seen = new Set<string>();
  const order = ["intra", "scrim", "event"];
  for (const o of occurrences) {
    if (dateKeyLocalFromDate(o.displayAt) !== dayKey) continue;
    seen.add(o.template.kind);
  }
  return order.filter((k) => seen.has(k));
}

export function ClanEventsView({
  gameSlug,
  clanId,
  events,
  canManageEvents,
  planIsPremium,
  viewerUserId,
  myRsvpGoingKeys,
  polls,
  bracketTournaments,
  initialTab = "calendar",
}: {
  gameSlug: string;
  clanId: string;
  events: SerializedClanEvent[];
  canManageEvents: boolean;
  planIsPremium: boolean;
  viewerUserId: string | null;
  myRsvpGoingKeys: readonly string[];
  polls: SerializedClanPoll[];
  bracketTournaments: SerializedBracketTournament[];
  initialTab?: "calendar" | "bracket" | "polls";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusDateRef = useRef<string | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(() =>
    dateKeyLocalFromDate(new Date()),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeOccurrence, setActiveOccurrence] =
    useState<ClanEventOccurrenceVm | null>(null);

  const [rsvpResult, setRsvpResult] = useState<{
    key: string;
    attendees: { userId: string; nickname: string }[];
  } | null>(null);
  const rsvpAttendees =
    rsvpResult?.key === activeOccurrence?.key ? rsvpResult?.attendees : null;

  const goingKeySet = useMemo(
    () => new Set(myRsvpGoingKeys ?? []),
    [myRsvpGoingKeys],
  );

  useEffect(() => {
    if (
      !sheetOpen ||
      !activeOccurrence ||
      activeOccurrence.template.kind !== "scrim" ||
      !canManageEvents
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await listClanEventRsvpAttendeesAction(
        gameSlug,
        clanId,
        activeOccurrence.template.id,
        activeOccurrence.instanceIdx,
      );
      if (cancelled) return;
      setRsvpResult({
        key: activeOccurrence.key,
        attendees: r.ok ? r.attendees : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, activeOccurrence, canManageEvents, gameSlug, clanId]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRepeat, setEditRepeat] =
    useState<SerializedClanEvent["repeat"]>("none");

  const occurrences = useMemo(
    () => expandClanEventsForLocalCalendarMonth(events, cursor.y, cursor.m),
    [events, cursor.y, cursor.m],
  );

  const slotOccurrences = useMemo(
    () =>
      occurrences.filter(
        (o) => dateKeyLocalFromDate(o.displayAt) === selectedKey,
      ),
    [occurrences, selectedKey],
  );

  const cells = useMemo(
    () => buildCalendarCells(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  );

  const monthLabel = useMemo(
    () =>
      new Date(cursor.y, cursor.m, 1).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
      }),
    [cursor.y, cursor.m],
  );

  const selectedDateTitle = useMemo(() => {
    const [yy, mm, dd] = selectedKey.split("-").map(Number);
    const d = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
    return d.toLocaleDateString("ko-KR", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selectedKey]);

  function shiftMonth(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    const ny = d.getFullYear();
    const nm = d.getMonth();
    setCursor({ y: ny, m: nm });
    const parts = selectedKey.split("-").map(Number);
    const yy = parts[0] ?? ny;
    const mm = parts[1] ?? nm + 1;
    const dd = parts[2] ?? 1;
    const sel = new Date(yy, mm - 1, dd);
    if (sel.getFullYear() !== ny || sel.getMonth() !== nm) {
      setSelectedKey(dateKeyLocalFromDate(new Date(ny, nm, 1)));
    }
  }

  useEffect(() => {
    if (!focusDateRef.current) return;
    calendarRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-date="${focusDateRef.current}"]`,
      )
      ?.focus();
    focusDateRef.current = null;
  }, [cursor, selectedKey]);

  function selectCalendarDate(date: Date, focus = false) {
    const key = dateKeyLocalFromDate(date);
    if (focus) focusDateRef.current = key;
    setCursor({ y: date.getFullYear(), m: date.getMonth() });
    setSelectedKey(key);
  }

  function openDetail(occurrence: ClanEventOccurrenceVm) {
    setRsvpResult(null);
    setActiveOccurrence(occurrence);
    setSheetOpen(true);
  }

  function onRsvpToggle() {
    if (!activeOccurrence || activeOccurrence.template.kind !== "scrim") return;
    if (!viewerUserId) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    const k = clanEventRsvpKey(
      activeOccurrence.template.id,
      activeOccurrence.instanceIdx,
    );
    const going = goingKeySet.has(k);
    const okJoin = confirm(
      going
        ? "이 스크림 참가를 취소하시겠습니까?"
        : "이 스크림에 참가하시겠습니까? 참가 명단에 인게임 닉네임이 노출됩니다.",
    );
    if (!okJoin) return;

    start(async () => {
      const fd = new FormData();
      fd.set("event_id", activeOccurrence.template.id);
      fd.set("instance_idx", String(activeOccurrence.instanceIdx));
      const r = await toggleClanEventRsvpAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(going ? "참가를 취소했습니다." : "참가했습니다.");
      router.refresh();
    });
  }

  function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const local = String(fd.get("start_at_local") ?? "");
    if (local) {
      const d = new Date(local);
      if (!Number.isNaN(d.getTime())) {
        fd.set("start_at", d.toISOString());
      }
    }
    fd.set("repeat", editRepeat);
    start(async () => {
      const r = await updateClanEventAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 수정했습니다.");
      setEditOpen(false);
      setSheetOpen(false);
      setActiveOccurrence(null);
      router.refresh();
    });
  }

  function onCancelEvent() {
    if (!activeOccurrence) return;
    if (
      !confirm(
        "이 일정을 취소할까요? 반복 일정은 이후 모든 회차가 함께 취소됩니다.",
      )
    ) {
      return;
    }
    start(async () => {
      const r = await cancelClanEventAction(
        gameSlug,
        clanId,
        activeOccurrence.template.id,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 취소했습니다.");
      setSheetOpen(false);
      setActiveOccurrence(null);
      router.refresh();
    });
  }

  return (
    <Tabs defaultValue={initialTab} className="gap-5">
      <TabsList
        variant="line"
        className="w-full min-w-0 justify-start gap-2 border-b sm:gap-5"
        aria-label="클랜 이벤트 하위 탭"
      >
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarDays className="size-4" aria-hidden="true" />
          캘린더
        </TabsTrigger>
        <TabsTrigger value="bracket" className="gap-1.5">
          <GitBranch className="hidden size-4 sm:block" aria-hidden="true" />
          대진표 생성기{" "}
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
            Premium
          </span>
        </TabsTrigger>
        <TabsTrigger value="polls" className="gap-1.5">
          <Vote className="size-4" aria-hidden="true" />
          투표
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              aria-label="이전 달"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <h3 className="min-w-28 text-center text-base font-semibold">
              {monthLabel}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(1)}
              aria-label="다음 달"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectCalendarDate(new Date())}
            >
              오늘
            </Button>
          </div>
          {canManageEvents ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              일정 등록
            </Button>
          ) : null}
        </div>

        <div
          ref={calendarRef}
          role="grid"
          aria-label="월간 캘린더"
          className="overflow-hidden rounded-2xl border bg-card shadow-sm"
        >
          <div role="row" className="grid grid-cols-7 border-b bg-muted/30">
            {["월", "화", "수", "목", "금", "토", "일"].map(
              (weekday, index) => (
                <div
                  key={weekday}
                  role="columnheader"
                  className={cn(
                    "py-3 text-center text-[11px] font-semibold text-muted-foreground",
                    index === 5 && "text-sky-600 dark:text-sky-400",
                    index === 6 && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {weekday}
                </div>
              ),
            )}
          </div>
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <div
              key={week}
              role="row"
              className="grid grid-cols-7 border-b last:border-b-0"
            >
              {cells.slice(week * 7, week * 7 + 7).map(({ date, inMonth }) => {
                const key = dateKeyLocalFromDate(date);
                const selected = key === selectedKey;
                const today = key === dateKeyLocalFromDate(now);
                const dayOccurrences = occurrences.filter(
                  (o) => dateKeyLocalFromDate(o.displayAt) === key,
                );
                const kinds = kindsOnDay(key, occurrences);
                return (
                  <div
                    key={key}
                    role="gridcell"
                    aria-selected={selected}
                    className="min-w-0 border-r last:border-r-0"
                  >
                    <button
                      type="button"
                      data-date={key}
                      aria-current={today ? "date" : undefined}
                      aria-label={
                        date.toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        }) +
                        " · 일정 " +
                        dayOccurrences.length +
                        "건"
                      }
                      tabIndex={selected ? 0 : -1}
                      onClick={() => selectCalendarDate(date)}
                      onKeyDown={(event) => {
                        const offsets: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        };
                        if (event.key in offsets) {
                          event.preventDefault();
                          const target = new Date(date);
                          target.setDate(target.getDate() + offsets[event.key]);
                          selectCalendarDate(target, true);
                        } else if (
                          event.key === "Home" ||
                          event.key === "End"
                        ) {
                          event.preventDefault();
                          const target = new Date(date);
                          const position = (date.getDay() + 6) % 7;
                          target.setDate(
                            date.getDate() +
                              (event.key === "Home" ? -position : 6 - position),
                          );
                          selectCalendarDate(target, true);
                        }
                      }}
                      className={cn(
                        "flex min-h-20 w-full flex-col items-center gap-2 px-1 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-28 sm:items-start sm:px-3",
                        !inMonth && "bg-muted/20 text-muted-foreground/50",
                        selected &&
                          "bg-primary/[0.07] ring-1 ring-inset ring-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                          today &&
                            "bg-primary font-bold text-primary-foreground",
                          !today &&
                            date.getDay() === 0 &&
                            "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <span className="flex gap-1 sm:hidden">
                        {kinds.map((kind) => (
                          <span
                            key={kind}
                            className={cn(
                              "size-1.5 rounded-full",
                              kindDotClass(kind),
                            )}
                          />
                        ))}
                      </span>
                      <span className="hidden w-full space-y-1 text-left sm:block">
                        {dayOccurrences.slice(0, 2).map((o) => (
                          <span
                            key={o.key}
                            className="flex min-w-0 items-center gap-1.5 rounded bg-muted/40 px-1 py-0.5 text-[10px]"
                          >
                            <span
                              className={cn(
                                "size-1 shrink-0 rounded-full",
                                kindDotClass(o.template.kind),
                              )}
                            />
                            <span className="truncate">{o.template.title}</span>
                          </span>
                        ))}
                        {dayOccurrences.length > 2 ? (
                          <span className="block pl-1 text-[9px] text-muted-foreground">
                            +{dayOccurrences.length - 2}개 일정
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-4 text-[10px] text-muted-foreground">
          {["intra", "scrim", "event"].map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span
                className={cn("size-1.5 rounded-full", kindDotClass(kind))}
              />
              {kindLabel(kind)}
            </span>
          ))}
        </div>

        <section
          className="overflow-hidden rounded-xl border bg-card"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays
                className="size-4 text-primary"
                aria-hidden="true"
              />
              {selectedDateTitle} 일정
            </h3>
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold tabular-nums">
              {slotOccurrences.length}건
            </span>
          </div>
          {!slotOccurrences.length ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <CalendarDays
                className="size-7 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                이 날짜에는 등록된 일정이 없습니다.
              </p>
              {canManageEvents ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary"
                  onClick={() => setCreateOpen(true)}
                >
                  이 날짜에 일정 추가
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y" role="list">
              {slotOccurrences.map((o) => (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => openDetail(o)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex w-12 shrink-0 flex-col items-center gap-1 text-center text-xs font-semibold tabular-nums">
                      <Clock
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {o.displayAt.toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    <span
                      className={cn(
                        "h-10 w-0.5 shrink-0 rounded-full",
                        kindDotClass(o.template.kind),
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {kindLabel(o.template.kind)}
                        </span>
                        {o.template.kind === "scrim" &&
                        goingKeySet.has(
                          clanEventRsvpKey(o.template.id, o.instanceIdx),
                        ) ? (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            참가 중
                          </span>
                        ) : null}
                      </span>
                      <strong className="mt-1 block truncate text-sm font-semibold">
                        {o.template.title}
                      </strong>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {o.template.place ?? "장소 미정"}
                        {o.template.repeat !== "none" ? (
                          <span className="flex items-center gap-1">
                            <Repeat2 className="size-3" aria-hidden="true" />
                            {repeatSummaryKo(o.template)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canManageEvents ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>일정 등록</DialogTitle>
                <DialogDescription>
                  클랜 멤버와 함께할 내전이나 이벤트를 등록하세요.
                </DialogDescription>
              </DialogHeader>
              <CreateClanEventForm
                gameSlug={gameSlug}
                clanId={clanId}
                defaultDate={selectedKey}
                onCreated={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </TabsContent>

      <TabsContent value="bracket" className="space-y-4">
        <ClanEventsBracketTab
          gameSlug={gameSlug}
          clanId={clanId}
          tournaments={bracketTournaments}
          canManageEvents={canManageEvents}
          planIsPremium={planIsPremium}
        />
      </TabsContent>

      <TabsContent value="polls" className="space-y-4">
        <ClanEventsPollsTab
          gameSlug={gameSlug}
          clanId={clanId}
          polls={polls}
          canManagePolls={canManageEvents}
          viewerUserId={viewerUserId}
        />
      </TabsContent>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setActiveOccurrence(null);
        }}
      >
        <SheetContent side="right" className="w-full max-w-[min(420px,92vw)]">
          {activeOccurrence ? (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">
                  {kindLabel(activeOccurrence.template.kind)} ·{" "}
                  {activeOccurrence.template.title}
                </SheetTitle>
                <SheetDescription>
                  이 회차 시작:{" "}
                  {activeOccurrence.displayAt.toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {activeOccurrence.template.repeat !== "none" ? (
                    <span className="text-muted-foreground block text-xs">
                      첫 일정:{" "}
                      {new Date(
                        activeOccurrence.template.start_at,
                      ).toLocaleString("ko-KR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid gap-2 px-4 text-sm">
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted-foreground">반복</dt>
                  <dd>{repeatSummaryKo(activeOccurrence.template)}</dd>
                </div>
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted-foreground">장소·메모</dt>
                  <dd>{activeOccurrence.template.place?.trim() || "—"}</dd>
                </div>
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted-foreground">출처</dt>
                  <dd>
                    {activeOccurrence.template.source === "manual"
                      ? "수동 등록"
                      : "스크림 자동 등록"}
                  </dd>
                </div>
              </dl>

              {activeOccurrence.template.kind === "scrim" && viewerUserId ? (
                <div className="space-y-3 border-t px-4 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      참가 (스크림 전용)
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        goingKeySet.has(
                          clanEventRsvpKey(
                            activeOccurrence.template.id,
                            activeOccurrence.instanceIdx,
                          ),
                        )
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {goingKeySet.has(
                        clanEventRsvpKey(
                          activeOccurrence.template.id,
                          activeOccurrence.instanceIdx,
                        ),
                      )
                        ? "참가 중"
                        : "미참가"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant={
                      goingKeySet.has(
                        clanEventRsvpKey(
                          activeOccurrence.template.id,
                          activeOccurrence.instanceIdx,
                        ),
                      )
                        ? "secondary"
                        : "default"
                    }
                    className="w-full"
                    disabled={pending}
                    onClick={onRsvpToggle}
                  >
                    {goingKeySet.has(
                      clanEventRsvpKey(
                        activeOccurrence.template.id,
                        activeOccurrence.instanceIdx,
                      ),
                    )
                      ? "참가 취소"
                      : "참가"}
                  </Button>
                </div>
              ) : null}

              {canManageEvents &&
              activeOccurrence.template.kind === "scrim" &&
              rsvpAttendees ? (
                <div className="space-y-2 border-t px-4 pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      참가 명단 (운영진 전용)
                    </span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {rsvpAttendees.length}명
                    </span>
                  </div>
                  {rsvpAttendees.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      아직 참가한 사람이 없습니다.
                    </p>
                  ) : (
                    <ul className="max-h-[220px] space-y-1 overflow-y-auto text-sm">
                      {rsvpAttendees.map((a) => (
                        <li
                          key={a.userId}
                          className="flex justify-between gap-2"
                        >
                          <span>{a.nickname}</span>
                          {viewerUserId && a.userId === viewerUserId ? (
                            <span className="text-muted-foreground text-xs">
                              나
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {canManageEvents &&
              activeOccurrence.template.source === "scrim_auto" ? (
                <div className="px-4 pt-2">
                  <Link
                    href={`/games/${gameSlug}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-full sm:w-auto",
                    )}
                  >
                    스크림 홈으로 (상세 연결 예정)
                  </Link>
                </div>
              ) : null}

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                {canManageEvents &&
                activeOccurrence.template.source === "manual" ? (
                  <div className="flex w-full flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setEditRepeat(
                          activeOccurrence.template.repeat ?? "none",
                        );
                        setEditOpen(true);
                        setSheetOpen(false);
                      }}
                    >
                      편집
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      disabled={pending}
                      onClick={onCancelEvent}
                    >
                      일정 취소
                    </Button>
                  </div>
                ) : activeOccurrence.template.source !== "manual" ? (
                  <p className="text-muted-foreground text-xs">
                    스크림 등 자동 생성 일정은 읽기 전용입니다.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    편집·취소는 운영진만 가능합니다.
                  </p>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setActiveOccurrence(null);
        }}
      >
        {activeOccurrence ? (
          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>일정 편집</DialogTitle>
            </DialogHeader>
            <form onSubmit={onEditSubmit} className="space-y-4">
              <input
                type="hidden"
                name="event_id"
                value={activeOccurrence.template.id}
              />
              <div className="space-y-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={activeOccurrence.template.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kind">유형</Label>
                <select
                  id="edit-kind"
                  name="kind"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={
                    activeOccurrence.template.kind === "scrim"
                      ? "event"
                      : activeOccurrence.template.kind
                  }
                >
                  <option value="intra">내전</option>
                  <option value="event">이벤트</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-repeat">반복</Label>
                <select
                  id="edit-repeat"
                  value={editRepeat}
                  onChange={(ev) =>
                    setEditRepeat(
                      ev.target.value as SerializedClanEvent["repeat"],
                    )
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="none">없음 (일회)</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                </select>
              </div>
              {editRepeat === "weekly" ? (
                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    반복 요일
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((iso) => (
                      <label
                        key={iso}
                        className="flex cursor-pointer items-center gap-1.5 text-xs"
                      >
                        <input
                          type="checkbox"
                          name="repeat_weekday"
                          value={String(iso)}
                          defaultChecked={activeOccurrence.template.repeat_weekdays?.includes(
                            iso,
                          )}
                        />
                        {WD_EDIT_LABEL[iso - 1]}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="edit-start">시작 (로컬 시각)</Label>
                <Input
                  id="edit-start"
                  name="start_at_local"
                  type="datetime-local"
                  required
                  defaultValue={isoToDatetimeLocal(
                    activeOccurrence.template.start_at,
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-place">장소·메모 (선택)</Label>
                <Input
                  id="edit-place"
                  name="place"
                  maxLength={500}
                  defaultValue={activeOccurrence.template.place ?? ""}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditOpen(false)}
                >
                  닫기
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "저장 중…" : "저장"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </Tabs>
  );
}
