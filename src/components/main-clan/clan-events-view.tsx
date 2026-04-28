"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelClanEventAction,
  listClanEventRsvpAttendeesAction,
  toggleClanEventRsvpAction,
  updateClanEventAction,
} from "@/app/actions/clan-events";
import { CreateClanEventForm } from "@/components/main-clan/create-clan-event-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  expandClanEventsForMonth,
  repeatSummaryKo,
} from "@/lib/clan/expand-clan-event-occurrences";
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
}: {
  gameSlug: string;
  clanId: string;
  events: SerializedClanEvent[];
  canManageEvents: boolean;
  planIsPremium: boolean;
  viewerUserId: string | null;
  myRsvpGoingKeys: readonly string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState(() =>
    dateKeyLocalFromDate(new Date()),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeOccurrence, setActiveOccurrence] =
    useState<ClanEventOccurrenceVm | null>(null);

  const [rsvpAttendees, setRsvpAttendees] = useState<
    { userId: string; nickname: string }[] | null
  >(null);

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
      setRsvpAttendees(null);
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
      if (r.ok) setRsvpAttendees(r.attendees);
      else setRsvpAttendees([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, activeOccurrence, canManageEvents, gameSlug, clanId]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRepeat, setEditRepeat] = useState<SerializedClanEvent["repeat"]>(
    "none",
  );

  const occurrences = useMemo(
    () => expandClanEventsForMonth(events, cursor.y, cursor.m),
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

  function openDetail(occurrence: ClanEventOccurrenceVm) {
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
        "이 일정 템플릿 전체를 취소할까요? 반복 일정의 모든 표시가 사라집니다.",
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

  const manageUrl = `/games/${gameSlug}/clan/${clanId}/manage#subscription`;

  return (
    <Tabs defaultValue="calendar" className="gap-6">
      <TabsList variant="line" className="w-full min-w-0 flex-wrap justify-start">
        <TabsTrigger value="calendar">캘린더</TabsTrigger>
        <TabsTrigger value="bracket">
          대진표 생성기{" "}
          <span className="text-muted-foreground text-xs font-normal">
            Premium
          </span>
        </TabsTrigger>
        <TabsTrigger value="polls">투표</TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="space-y-8">
        <p className="text-muted-foreground text-sm">
          날짜를 선택하면 해당 날짜의 일정만 아래에 표시됩니다. 점 색: 보라=내전
          · 초록=스크림 · 주황=이벤트. 반복 일정은 D-EVENTS-02 규칙으로 펼칩니다.
        </p>

        {canManageEvents ? (
          <CreateClanEventForm gameSlug={gameSlug} clanId={clanId} />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              aria-label="이전 달"
            >
              ‹
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftMonth(1)}
              aria-label="다음 달"
            >
              ›
            </Button>
          </div>
        </div>

        <div
          className="border-border overflow-x-auto rounded-xl border"
          role="grid"
          aria-label="월간 캘린더"
        >
          <div className="grid grid-cols-7 gap-px bg-border p-px">
            {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
              <div
                key={w}
                className="bg-muted/50 text-muted-foreground px-1 py-2 text-center text-xs font-medium"
              >
                {w}
              </div>
            ))}
            {cells.map(({ date, inMonth }) => {
              const key = dateKeyLocalFromDate(date);
              const selected = key === selectedKey;
              const kinds = kindsOnDay(key, occurrences);
              return (
                <button
                  key={`${key}-${inMonth}-${date.getTime()}`}
                  type="button"
                  role="gridcell"
                  data-date={key}
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    "bg-background focus-visible:ring-ring min-h-[4.25rem] px-1 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    !inMonth && "text-muted-foreground/60",
                    selected &&
                      "ring-violet-500 ring-offset-background ring-2 ring-offset-2",
                  )}
                >
                  <span className="tabular-nums">{date.getDate()}</span>
                  <div className="mt-1 flex min-h-[6px] flex-wrap gap-0.5">
                    {kinds.map((k) => (
                      <span
                        key={k}
                        className={cn("size-1.5 rounded-full", kindDotClass(k))}
                        title={kindLabel(k)}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <section className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{selectedDateTitle} 일정</h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {slotOccurrences.length}건
            </span>
          </div>
          {!slotOccurrences.length ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              이 날짜에는 등록된 일정이 없습니다.
              {canManageEvents
                ? " 운영진은 위에서 일정을 추가할 수 있습니다."
                : ""}
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {slotOccurrences.map((o) => (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => openDetail(o)}
                    className="bg-card hover:bg-muted/40 w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition-colors"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{o.template.title}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        {o.template.kind === "scrim" &&
                        goingKeySet.has(
                          clanEventRsvpKey(o.template.id, o.instanceIdx),
                        ) ? (
                          <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded px-1.5 py-0.5 text-[10px] font-medium">
                            참가 중
                          </span>
                        ) : null}
                        <span className="text-muted-foreground text-xs">
                          {kindLabel(o.template.kind)}
                        </span>
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {o.displayAt.toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {o.template.place ? ` · ${o.template.place}` : ""}
                      {o.template.repeat !== "none" ? (
                        <span className="text-muted-foreground ml-2">
                          · {repeatSummaryKo(o.template)}
                        </span>
                      ) : null}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="bracket" className="space-y-4">
        {!planIsPremium ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-foreground text-sm font-medium">
              대진표 생성기는 Premium 플랜 전용입니다.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              클랜 플랜을 업그레이드하면 4단계 마법사로 토너먼트를 구성할 수
              있습니다 (D-EVENTS-05 · 클랜 내 이벤트 전용).
            </p>
            <Link
              href={manageUrl}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "mt-4 inline-flex",
              )}
            >
              플랜·구독 보기
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Premium에서 대진표 세부 생성·코인 연동은 이후 작업에서
              연결됩니다. 운영진은 추후 마법사로 팀 구성·시드·결과 입력을
              진행합니다.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="polls" className="space-y-4">
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          현재 진행 중인 투표가 없습니다. 투표 생성·알림 스케줄은 Phase 2
          후속에서 clan_polls · notification_log 와 연결합니다.
        </p>
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
                      템플릿 기준일:{" "}
                      {new Date(activeOccurrence.template.start_at).toLocaleString(
                        "ko-KR",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
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
                      : "스크림 자동 등록 (D-EVENTS-01)"}
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
                        <li key={a.userId} className="flex justify-between gap-2">
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
                        setEditRepeat(activeOccurrence.template.repeat ?? "none");
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
                  defaultValue={isoToDatetimeLocal(activeOccurrence.template.start_at)}
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
