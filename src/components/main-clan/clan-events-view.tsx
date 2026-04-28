"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelClanEventAction,
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
import { cn } from "@/lib/utils";

export type SerializedClanEvent = {
  id: string;
  title: string;
  kind: "intra" | "scrim" | "event";
  start_at: string;
  place: string | null;
  source: "manual" | "scrim_auto";
};

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function eventsForDateKey(events: SerializedClanEvent[], key: string) {
  return events
    .filter((e) => dateKeyLocal(new Date(e.start_at)) === key)
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
}

function defaultSelectedKey(
  events: SerializedClanEvent[],
  year: number,
  month: number,
): string {
  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() === month) {
    return dateKeyLocal(today);
  }
  const inMonth = events
    .map((e) => new Date(e.start_at))
    .filter((d) => d.getFullYear() === year && d.getMonth() === month)
    .sort((a, b) => a.getTime() - b.getTime());
  if (inMonth.length > 0) return dateKeyLocal(inMonth[0]);
  return dateKeyLocal(new Date(year, month, 1));
}

export function ClanEventsView({
  gameSlug,
  clanId,
  events,
  canManageEvents,
  planIsPremium,
}: {
  gameSlug: string;
  clanId: string;
  events: SerializedClanEvent[];
  canManageEvents: boolean;
  planIsPremium: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState(() =>
    defaultSelectedKey(events, now.getFullYear(), now.getMonth()),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<SerializedClanEvent | null>(
    null,
  );

  const [editOpen, setEditOpen] = useState(false);

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

  const slotEvents = useMemo(
    () => eventsForDateKey(events, selectedKey),
    [events, selectedKey],
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
      setSelectedKey(dateKeyLocal(new Date(ny, nm, 1)));
    }
  }

  function kindsOnDay(dayKey: string): string[] {
    const seen = new Set<string>();
    const order = ["intra", "scrim", "event"];
    for (const e of events) {
      if (dateKeyLocal(new Date(e.start_at)) !== dayKey) continue;
      seen.add(e.kind);
    }
    return order.filter((k) => seen.has(k));
  }

  function openDetail(ev: SerializedClanEvent) {
    setActiveEvent(ev);
    setSheetOpen(true);
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
    start(async () => {
      const r = await updateClanEventAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 수정했습니다.");
      setEditOpen(false);
      setSheetOpen(false);
      setActiveEvent(null);
      router.refresh();
    });
  }

  function onCancelEvent() {
    if (!activeEvent) return;
    if (!confirm("이 일정을 취소할까요? 취소된 일정은 목록에서 사라집니다.")) {
      return;
    }
    start(async () => {
      const r = await cancelClanEventAction(
        gameSlug,
        clanId,
        activeEvent.id,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 취소했습니다.");
      setSheetOpen(false);
      setActiveEvent(null);
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
          · 초록=스크림 · 주황=이벤트.
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
              const key = dateKeyLocal(date);
              const selected = key === selectedKey;
              const kinds = kindsOnDay(key);
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
              {slotEvents.length}건
            </span>
          </div>
          {!slotEvents.length ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              이 날짜에는 등록된 일정이 없습니다.
              {canManageEvents
                ? " 운영진은 위에서 일정을 추가할 수 있습니다."
                : ""}
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {slotEvents.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(ev)}
                    className="bg-card hover:bg-muted/40 w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition-colors"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {kindLabel(ev.kind)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(ev.start_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {ev.place ? ` · ${ev.place}` : ""}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-[min(420px,92vw)]">
          {activeEvent ? (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">
                  {kindLabel(activeEvent.kind)} · {activeEvent.title}
                </SheetTitle>
                <SheetDescription>
                  {new Date(activeEvent.start_at).toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid gap-2 px-4 text-sm">
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted-foreground">장소·메모</dt>
                  <dd>{activeEvent.place?.trim() || "—"}</dd>
                </div>
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <dt className="text-muted-foreground">출처</dt>
                  <dd>
                    {activeEvent.source === "manual"
                      ? "수동 등록"
                      : "스크림 자동 등록 (D-EVENTS-01)"}
                  </dd>
                </div>
              </dl>
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                {canManageEvents && activeEvent.source === "manual" ? (
                  <div className="flex w-full flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
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
                ) : activeEvent.source !== "manual" ? (
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
          if (!o) setActiveEvent(null);
        }}
      >
        {activeEvent ? (
          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>일정 편집</DialogTitle>
            </DialogHeader>
            <form onSubmit={onEditSubmit} className="space-y-4">
              <input type="hidden" name="event_id" value={activeEvent.id} />
              <div className="space-y-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={activeEvent.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kind">유형</Label>
                <select
                  id="edit-kind"
                  name="kind"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  defaultValue={activeEvent.kind === "scrim" ? "event" : activeEvent.kind}
                >
                  <option value="intra">내전</option>
                  <option value="event">이벤트</option>
                </select>
                <p className="text-muted-foreground text-xs">
                  기존에 스크림으로 저장된 항목은 내전/이벤트로 바꿀 수
                  있습니다. 향후 자동 일정과 합치면 스크림은 자동 생성만
                  사용합니다.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start">시작 (로컬 시각)</Label>
                <Input
                  id="edit-start"
                  name="start_at_local"
                  type="datetime-local"
                  required
                  defaultValue={isoToDatetimeLocal(activeEvent.start_at)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-place">장소·메모 (선택)</Label>
                <Input
                  id="edit-place"
                  name="place"
                  maxLength={500}
                  defaultValue={activeEvent.place ?? ""}
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
