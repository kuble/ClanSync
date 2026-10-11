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
  MapPin,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
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
import { EventDiscordFields } from "@/components/main-clan/event-discord-fields";
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

function kindToneClass(kind: string): string {
  if (kind === "intra") return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  if (kind === "scrim") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
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
  notificationSettings,
  discordAvailable = false,
  discordChannelName,
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
  notificationSettings?: React.ReactNode;
  discordAvailable?: boolean;
  discordChannelName?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusDateRef = useRef<string | null>(null);
  const dayListRef = useRef<HTMLDivElement>(null);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const focusOccurrenceRef = useRef<string | null>(null);
  const wasShowingDetailRef = useRef(false);
  const now = new Date();
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(() =>
    dateKeyLocalFromDate(new Date()),
  );
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);

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
  }, [activeOccurrence, canManageEvents, gameSlug, clanId]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRepeat, setEditRepeat] =
    useState<SerializedClanEvent["repeat"]>("none");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const changePresentation = () => {
      setDayDrawerOpen(false);
      setSheetOpen(!desktop.matches && !!activeOccurrence && !editOpen);
    };
    desktop.addEventListener("change", changePresentation);
    return () => desktop.removeEventListener("change", changePresentation);
  }, [activeOccurrence, editOpen]);

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
  const activeSlotIndex = slotOccurrences.findIndex((o) => o.key === activeOccurrence?.key);

  useEffect(() => {
    if (activeOccurrence && !wasShowingDetailRef.current && window.matchMedia("(min-width: 1024px)").matches) {
      detailBackRef.current?.focus({ preventScroll: true });
    } else if (!activeOccurrence && focusOccurrenceRef.current) {
      const key = focusOccurrenceRef.current;
      Array.from(dayListRef.current?.querySelectorAll<HTMLButtonElement>("[data-event-key]") ?? [])
        .find((button) => button.dataset.eventKey === key)?.focus({ preventScroll: false });
      focusOccurrenceRef.current = null;
    }
    wasShowingDetailRef.current = !!activeOccurrence;
  }, [activeOccurrence]);

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
    setEditOpen(false);
    setActiveOccurrence(null);
    setSheetOpen(false);
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

  function selectCalendarDate(date: Date, focus = false, showSchedule = false) {
    const key = dateKeyLocalFromDate(date);
    if (focus) focusDateRef.current = key;
    setCursor({ y: date.getFullYear(), m: date.getMonth() });
    setSelectedKey(key);
    if (key !== selectedKey) {
      setEditOpen(false);
      setActiveOccurrence(null);
      setSheetOpen(false);
    }
    if (showSchedule && window.matchMedia("(max-width: 1023px)").matches) {
      setDayDrawerOpen(true);
    }
  }

  function openDetail(occurrence: ClanEventOccurrenceVm) {
    setEditOpen(false);
    setDayDrawerOpen(false);
    setRsvpResult(null);
    setActiveOccurrence(occurrence);
    setSheetOpen(window.matchMedia("(max-width: 1023px)").matches);
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

  const eventDetails = activeOccurrence ? (
    <>
      <div className="mx-5 flex items-center gap-3 rounded-xl border bg-background/50 px-4 py-3">
        <Clock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {activeOccurrence.displayAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeOccurrence.displayAt.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">시작</span>
      </div>
      <dl className="grid gap-5 px-5 text-sm">
        <div className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <dt className="col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
            <Repeat2 className="size-4" aria-hidden="true" />
            반복
          </dt>
          <dd className="col-start-2 leading-relaxed">
            {repeatSummaryKo(activeOccurrence.template)}
            {activeOccurrence.template.repeat !== "none" ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {new Date(activeOccurrence.template.start_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}부터
              </span>
            ) : null}
          </dd>
        </div>
        <div className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-1">
          <dt className="col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            장소·메모
          </dt>
          <dd className="col-start-2 break-words whitespace-pre-wrap leading-relaxed">
            {activeOccurrence.template.place?.trim() || "장소 미정"}
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

    </>
  ) : null;

  const eventActions = activeOccurrence ? (
      <SheetFooter className="mt-0 shrink-0 flex-col gap-2 border-t px-5 py-4 sm:flex-col">
        {canManageEvents &&
        activeOccurrence.template.source === "manual" ? (
          <div className="flex w-full flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setEditRepeat(
                  activeOccurrence.template.repeat ?? "none",
                );
                setEditOpen(true);
                setSheetOpen(false);
              }}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              편집
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={pending}
              onClick={onCancelEvent}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
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
  ) : null;

  const daySchedule = (
    <>
      {!slotOccurrences.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <CalendarDays
            className="size-7 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            이 날짜에는 등록된 일정이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 p-3" role="list" aria-label="날짜별 일정 목록">
          {slotOccurrences.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                data-event-key={o.key}
                onClick={() => openDetail(o)}
                aria-pressed={activeOccurrence?.key === o.key}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none",
                  activeOccurrence?.key === o.key && "border-primary/25 bg-primary/[0.08]",
                )}
              >
                <span className="w-11 shrink-0 text-sm font-semibold tabular-nums">
                  {o.displayAt.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
                <span
                  className={cn(
                    "h-8 w-0.5 shrink-0 rounded-full",
                    kindDotClass(o.template.kind),
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] leading-none font-medium", kindToneClass(o.template.kind))}>
                      {kindLabel(o.template.kind)}
                    </span>
                    {o.template.repeat !== "none" ? (
                      <Repeat2 className="size-3 text-muted-foreground" aria-label="반복 일정" />
                    ) : null}
                    {o.template.kind === "scrim" &&
                    goingKeySet.has(
                      clanEventRsvpKey(o.template.id, o.instanceIdx),
                    ) ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        참가 중
                      </span>
                    ) : null}
                  </span>
                  <strong className="mt-1 block truncate text-sm font-medium">
                    {o.template.title}
                  </strong>
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
    </>
  );

  return (
    <Tabs
      defaultValue={initialTab}
      className="gap-5"
      onValueChange={(tab) => {
        if (tab !== "calendar") {
          setEditOpen(false);
          setActiveOccurrence(null);
          setSheetOpen(false);
        }
      }}
    >
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
            <h3 className="min-w-32 text-center text-lg font-semibold tracking-tight">
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
          </div>
          <div className="flex items-center gap-2">
          {canManageEvents ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              일정 등록
            </Button>
          ) : null}
          {notificationSettings}
          </div>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
          <div className="min-w-0">
            <div
              ref={calendarRef}
              role="grid"
              aria-label="월간 캘린더"
              className="overflow-hidden rounded-2xl border bg-card"
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
                          onClick={() => selectCalendarDate(date, false, true)}
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
                            "flex h-20 w-full flex-col items-center gap-2 px-1 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:h-28 sm:items-start sm:gap-1 sm:px-2.5 sm:py-1.5",
                            !inMonth && "bg-muted/20 text-muted-foreground/50",
                            selected &&
                              "bg-primary/[0.08] ring-1 ring-inset ring-primary/40",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full text-[13px] font-medium tabular-nums sm:size-6 sm:shrink-0",
                              today &&
                                "bg-primary font-bold text-primary-foreground",
                              selected && !today && "bg-primary/15 font-semibold text-primary",
                              !today &&
                                !selected &&
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
                          <span className="hidden w-full space-y-0.5 text-left sm:block">
                            {dayOccurrences.slice(0, 2).map((o) => (
                              <span
                                key={o.key}
                                className={cn("flex min-w-0 items-start gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] leading-3", kindToneClass(o.template.kind))}
                                title={o.template.title}
                              >
                                <span
                                  className={cn(
                                    "mt-1 size-1 shrink-0 rounded-full",
                                    kindDotClass(o.template.kind),
                                  )}
                                />
                                <span className="line-clamp-2 min-w-0 flex-1 break-words">{o.template.title}</span>
                              </span>
                            ))}
                            {dayOccurrences.length > 2 ? (
                              <span className="block pl-1 text-[9px] leading-3 text-muted-foreground">
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
          </div>
          <div className="relative hidden min-w-0 lg:block">
          <section
            className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card"
            aria-label="선택한 날짜 일정"
            aria-live="polite"
          >
            <div className="shrink-0 border-b px-5 py-5">
              <h3 className="flex items-center gap-3" aria-label={`${selectedDateTitle} 일정`}>
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-3xl font-semibold tracking-tight text-primary tabular-nums" aria-hidden="true">
                  {Number(selectedKey.slice(-2))}
                </span>
                <span className="space-y-1">
                  <span className="block text-xs text-muted-foreground">
                    {Number(selectedKey.slice(5, 7))}월 {selectedDateTitle.split(" ").at(-1)}
                  </span>
                  <span className="block text-base font-semibold">일정</span>
                </span>
              </h3>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {activeOccurrence ? (
                <section aria-label="일정 상세" className="flex min-h-0 flex-1 flex-col bg-background/20">
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
                    <Button
                      ref={detailBackRef}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        focusOccurrenceRef.current = activeOccurrence.key;
                        setActiveOccurrence(null);
                      }}
                    >
                      <ChevronLeft className="size-3.5" aria-hidden="true" />
                      목록으로
                    </Button>
                    {slotOccurrences.length > 1 ? (
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="이전 일정" disabled={activeSlotIndex <= 0} onClick={() => openDetail(slotOccurrences[activeSlotIndex - 1])}>
                          <ChevronLeft className="size-4" aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="다음 일정" disabled={activeSlotIndex < 0 || activeSlotIndex >= slotOccurrences.length - 1} onClick={() => openDetail(slotOccurrences[activeSlotIndex + 1])}>
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain py-5" aria-label="일정 상세 내용">
                  <div className="space-y-3 px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-md px-2 py-1 text-[11px] font-medium", kindToneClass(activeOccurrence.template.kind))}>
                        {kindLabel(activeOccurrence.template.kind)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {activeOccurrence.template.source === "manual" ? "수동 등록" : "스크림 자동 등록"}
                      </span>
                    </div>
                    <h4 className="text-xl font-semibold break-words leading-snug tracking-tight" aria-label={`${kindLabel(activeOccurrence.template.kind)} · ${activeOccurrence.template.title}`}>
                      {activeOccurrence.template.title}
                    </h4>
                  </div>
                  {eventDetails}
                  </div>
                  {eventActions}
                </section>
              ) : (
                <div ref={dayListRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  {daySchedule}
                </div>
              )}
            </div>
          </section>
          </div>
          <div className="flex justify-end gap-4 text-[11px] text-muted-foreground lg:col-start-1">
            {["intra", "scrim", "event"].map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", kindDotClass(kind))} />
                {kindLabel(kind)}
              </span>
            ))}
          </div>
        </div>

        <Sheet open={dayDrawerOpen} onOpenChange={setDayDrawerOpen}>
          <SheetContent
            side="bottom"
            finalFocus={() =>
              calendarRef.current?.querySelector<HTMLButtonElement>(
                `[data-date="${selectedKey}"]`,
              )
            }
            className="max-h-[85dvh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none data-starting-style:translate-y-full data-ending-style:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
            />
            <SheetHeader className="shrink-0 border-b pr-12">
              <SheetTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                {selectedDateTitle} 일정
              </SheetTitle>
              <SheetDescription className="sr-only">등록된 일정을 시간순으로 확인하세요.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              {daySchedule}
            </div>
          </SheetContent>
        </Sheet>

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
                discordAvailable={discordAvailable}
                discordChannelName={discordChannelName}
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
          if (!o && sheetOpen) setActiveOccurrence(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none data-starting-style:translate-y-full data-ending-style:translate-y-full"
        >
          {activeOccurrence ? (
            <>
              <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
              <SheetHeader className="px-5 pt-0">
                <SheetTitle className="pr-8 text-xl font-semibold leading-snug tracking-tight">
                  {kindLabel(activeOccurrence.template.kind)} ·{" "}
                  {activeOccurrence.template.title}
                </SheetTitle>
                <SheetDescription>
                  {activeOccurrence.template.source === "manual" ? "수동 등록" : "스크림 자동 등록"}
                </SheetDescription>
              </SheetHeader>
              {eventDetails}
              {eventActions}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent showCloseButton className="max-h-[90vh] overflow-y-auto">
          {activeOccurrence ? (
            <>
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
              <EventDiscordFields available={discordAvailable} channelName={discordChannelName} value={activeOccurrence.template.discord_notify} />
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
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
