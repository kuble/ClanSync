"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as GuideDialog } from "@base-ui/react/dialog";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, History, MoreHorizontal, Plus, Repeat2, UsersRound, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  cancelBalanceRoomAction,
  createBalanceRoomAction,
  delegateBalanceRoomAction,
  openBalanceRoomAction,
  setBalanceRoomRsvpAction,
  setBalanceRoomScheduleEnabledAction,
  updateBalanceRoomAction,
} from "@/app/actions/clan-balance-rooms";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ClanBalanceHistoryDrawer } from "./clan-balance-history-drawer";

type RoomKind = "regular" | "flash";
type RsvpResponse = "going" | "maybe" | "no";
export type LobbyRoom = {
  id: string;
  kind: RoomKind;
  title: string;
  created_by: string;
  scheduled_at: string;
  status: "scheduled" | "open" | "closed" | "cancelled";
  series_id: string | null;
  schedule_id: string | null;
  rsvp_days: number | null;
  delegated_to: string | null;
  creatorNickname: string;
  delegateNickname?: string | null;
  rsvpCounts: Record<RsvpResponse, number>;
  myRsvp: RsvpResponse | null;
  roundNumber?: number | null;
  repeatEveryDays?: number | null;
  scheduleEnabled?: boolean;
};
type Member = { user_id: string; nickname: string; role: string };
type ActionResult = { ok: true } | { ok: false; error: string };
const field = "mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
const STATUS = { scheduled: "예약", open: "진행 중", closed: "종료", cancelled: "취소" };
const RSVP: { value: RsvpResponse; label: string }[] = [{ value: "going", label: "참석" }, { value: "maybe", label: "미정" }, { value: "no", label: "불참" }];

function kstInput(iso: string | number) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
function displayStart(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function ClanBalanceLobby({ gameSlug, clanId, userId, clanRole, rooms, members, serverNow }: {
  gameSlug: string;
  clanId: string;
  userId: string;
  clanRole: string;
  rooms: readonly LobbyRoom[];
  members: readonly Member[];
  serverNow: number;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, start] = useTransition();
  const staff = clanRole === "leader" || clanRole === "officer";
  const canCreate = staff || clanRole === "member";
  const active = rooms.filter((room) => room.status === "open" || room.status === "scheduled");
  const ended = rooms.filter((room) => room.status === "closed" || room.status === "cancelled");
  const detail = rooms.find((room) => room.id === detailId);
  const roomPath = (id: string) => `/games/${gameSlug}/clan/${clanId}/balance?room=${id}`;

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 5_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  function run(action: () => Promise<ActionResult>, message: string, after?: () => void) {
    start(async () => {
      try {
        const result = await action();
        if (!result.ok) { toast.error(result.error); return; }
        toast.success(message);
        after?.();
        router.refresh();
      } catch { toast.error("요청을 처리하지 못했습니다. 다시 시도하세요."); }
    });
  }

  function row(room: LobbyRoom) {
    const endedRoom = room.status === "closed" || room.status === "cancelled";
    const KindIcon = room.kind === "regular" ? CalendarDays : Zap;
    return (
      <li key={room.id} data-testid="balance-lobby-room" data-room-id={room.id} className={cn("flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5", endedRoom && "opacity-65")}>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", room.kind === "regular" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}><KindIcon className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button type="button" onClick={() => setDetailId(room.id)} className="truncate text-left text-sm font-semibold hover:underline">{room.title}</button>
            <span className="text-[10px] text-muted-foreground">{room.kind === "regular" ? "정규" : "깜짝"}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", room.status === "open" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{STATUS[room.status]}{room.status === "open" && room.roundNumber ? ` · 라운드 ${room.roundNumber}` : ""}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden="true" /><time dateTime={room.scheduled_at}>{displayStart(room.scheduled_at)}</time></span>
            <span>{room.delegateNickname ?? room.creatorNickname}</span>
            {room.schedule_id && room.scheduleEnabled !== false ? <span className="inline-flex items-center gap-1"><Repeat2 className="size-3" aria-hidden="true" />{room.repeatEveryDays === 7 || !room.repeatEveryDays ? "매주" : `${room.repeatEveryDays}일마다`}</span> : null}
            {room.kind === "flash" && room.rsvp_days !== null ? <span className="inline-flex items-center gap-1"><UsersRound className="size-3" aria-hidden="true" />참석 {room.rsvpCounts.going} · 미정 {room.rsvpCounts.maybe}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {room.status === "open" && room.series_id ? (
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={roomPath(room.id)}>입장<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
          ) : room.status === "scheduled" ? <Button size="sm" variant="outline" onClick={() => setDetailId(room.id)}>예약 보기</Button> : null}
          <Button size="icon-sm" variant="ghost" aria-label={`${room.title} 방 정보`} title="방 정보" onClick={() => setDetailId(room.id)}><MoreHorizontal className="size-4" aria-hidden="true" /></Button>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-4" aria-label="내전 로비" data-testid="clan-balance-lobby">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2"><h2 className="text-lg font-bold">내전 로비</h2><span className="text-xs tabular-nums text-muted-foreground">{active.length}</span></div>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="내전 기록" title="내전 기록" onClick={() => setHistoryOpen(true)}><History className="size-4" aria-hidden="true" /></Button>
          <Button size="icon-sm" variant="ghost" aria-label="로비 안내" title="로비 안내" onClick={() => setGuideOpen(true)}><CircleHelp className="size-4" aria-hidden="true" /></Button>
          {canCreate ? <Button size="icon-sm" aria-label="내전 추가" title="내전 추가" data-lobby-guide="add" onClick={() => setCreateOpen(true)}><Plus className="size-4" aria-hidden="true" /></Button> : null}
        </div>
      </div>
      <div data-lobby-guide="list" className="overflow-hidden rounded-xl border bg-card">
        {active.length ? <ul aria-label="진행·예약 내전" className="divide-y">{active.map(row)}</ul> : (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-4 py-7 text-center">
            <CalendarDays className="size-6 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">아직 열린 내전이 없습니다.</p>
            {canCreate ? <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>첫 내전 만들기</Button> : null}
          </div>
        )}
      </div>
      {ended.length ? <div>
        <button type="button" aria-expanded={showEnded} onClick={() => setShowEnded(!showEnded)} className="flex items-center gap-2 py-1 text-xs text-muted-foreground">종료된 내전 {ended.length}<ChevronDown className={cn("size-3.5 transition-transform", showEnded && "rotate-180")} aria-hidden="true" /></button>
        {showEnded ? <ul aria-label="종료·취소 내전" className="mt-2 divide-y rounded-xl border">{ended.map(row)}</ul> : null}
      </div> : null}
      {createOpen ? <CreateRoomSheet staff={staff} serverNow={serverNow} pending={pending} onClose={() => setCreateOpen(false)} onSubmit={(input) => run(() => createBalanceRoomAction(gameSlug, clanId, input), "내전이 추가되었습니다.", () => setCreateOpen(false))} /> : null}
      {detail ? <RoomDetailSheet key={`${detail.id}:${detail.status}:${detail.scheduled_at}:${detail.title}`} room={detail} members={members} serverNow={serverNow} userId={userId} canRsvp={canCreate} leader={clanRole === "leader"} canManage={staff || (detail.kind === "flash" && detail.created_by === userId && canCreate)} pending={pending} onClose={() => setDetailId(null)}
        onUpdate={(input) => run(() => updateBalanceRoomAction(gameSlug, clanId, detail.id, input), "예약이 변경되었습니다.", () => setDetailId(null))}
        onOpen={() => run(() => openBalanceRoomAction(gameSlug, clanId, detail.id), "내전이 열렸습니다.", () => router.push(roomPath(detail.id)))}
        onCancel={() => run(() => cancelBalanceRoomAction(gameSlug, clanId, detail.id), "내전이 취소되었습니다.", () => setDetailId(null))}
        onDelegate={(id) => run(() => delegateBalanceRoomAction(gameSlug, clanId, detail.id, id), id ? "진행 운영진이 지정되었습니다." : "위임이 해제되었습니다.")}
        onSchedule={(enabled) => run(() => setBalanceRoomScheduleEnabledAction(gameSlug, clanId, detail.schedule_id!, enabled), enabled ? "반복 예약이 켜졌습니다." : "반복 예약이 중지되었습니다.")}
        onRsvp={(response) => run(() => setBalanceRoomRsvpAction(gameSlug, clanId, detail.id, response), "참석 응답이 저장되었습니다.")}
      /> : null}
      {guideOpen ? <LobbyGuide canCreate={canCreate} onClose={() => setGuideOpen(false)} /> : null}
      <ClanBalanceHistoryDrawer gameSlug={gameSlug} clanId={clanId} currentSeriesId={null} pool={members} open={historyOpen} onOpenChange={setHistoryOpen} />
    </section>
  );
}

type CreateInput = { kind: RoomKind; title: string; scheduledAt?: string | null; rsvpDays?: number | null; repeatEveryDays?: number | null };
function CreateRoomSheet({ staff, serverNow, pending, onClose, onSubmit }: { staff: boolean; serverNow: number; pending: boolean; onClose: () => void; onSubmit: (input: CreateInput) => void }) {
  const [kind, setKind] = useState<RoomKind>(staff ? "regular" : "flash");
  const [title, setTitle] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [date, setDate] = useState(kstInput(serverNow + 60 * 60 * 1000));
  const [weekly, setWeekly] = useState(false);
  const [rsvp, setRsvp] = useState(false);
  const [days, setDays] = useState(3);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ kind, title: title.trim(), scheduledAt: scheduled ? `${date}:00+09:00` : null, rsvpDays: kind === "flash" && scheduled && rsvp ? days : null, repeatEveryDays: kind === "regular" && scheduled && weekly ? 7 : null });
  }
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" showCloseButton={!pending}>
        <SheetHeader><SheetTitle>내전 만들기</SheetTitle><SheetDescription className="text-xs">{staff ? "정규 내전과 깜짝 내전을 열거나 예약하세요." : "직접 진행할 깜짝 내전을 열거나 예약하세요."}</SheetDescription></SheetHeader>
        <form onSubmit={submit} className="space-y-5 px-4 pb-5">
          <fieldset disabled={pending} className="space-y-5">
            <fieldset><legend className="text-xs font-semibold">종류</legend><div className="mt-2 grid grid-cols-2 gap-2">{([{ value: "regular", label: "정규 내전", icon: CalendarDays }, { value: "flash", label: "깜짝 내전", icon: Zap }] as const).map(({ value, label, icon: Icon }) => <label key={value} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", kind === value && "border-primary bg-primary/5", value === "regular" && !staff && "opacity-40")}><input type="radio" name="room-kind" value={value} checked={kind === value} disabled={value === "regular" && !staff} onChange={() => setKind(value)} className="accent-primary" /><Icon className="size-4" aria-hidden="true" />{label}</label>)}</div></fieldset>
            <label className="block text-xs font-semibold">내전 이름<input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} className={field} placeholder={kind === "regular" ? "금요일 정규 내전" : "오늘 저녁 깜짝"} /></label>
            <fieldset><legend className="text-xs font-semibold">시작</legend><div className="mt-2 flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="radio" name="room-start" checked={!scheduled} onChange={() => setScheduled(false)} className="accent-primary" />지금</label><label className="flex items-center gap-2"><input type="radio" name="room-start" checked={scheduled} onChange={() => setScheduled(true)} className="accent-primary" />예약</label></div></fieldset>
            {scheduled ? <label className="block text-xs font-semibold">예약 시각 (한국 시간)<input type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} className={field} /></label> : null}
            {scheduled && kind === "regular" ? <label className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm"><span className="flex items-center gap-2"><Repeat2 className="size-4" aria-hidden="true" />매주 같은 요일·시각</span><input type="checkbox" checked={weekly} onChange={(event) => setWeekly(event.target.checked)} className="size-4 accent-primary" /></label> : null}
            {scheduled && kind === "flash" ? <RsvpFields enabled={rsvp} days={days} onEnabled={setRsvp} onDays={setDays} /> : null}
          </fieldset>
          <Button type="submit" className="w-full" disabled={pending || !title.trim()}>{pending ? "만드는 중…" : "내전 만들기"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function RsvpFields({ enabled, days, onEnabled, onDays }: { enabled: boolean; days: number; onEnabled: (value: boolean) => void; onDays: (value: number) => void }) {
  return <div className="space-y-3 rounded-lg bg-muted/40 p-3"><label className="flex items-center justify-between text-sm">참석 응답 받기<input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} className="size-4 accent-primary" /></label>{enabled ? <><label className="flex items-center justify-between gap-3 text-xs">시작 며칠 전부터<input type="number" aria-label="참석 응답 시작 일수" min={1} max={30} step={1} required value={days} onChange={(event) => onDays(Number(event.target.value))} className="h-9 w-20 rounded-lg border bg-background px-2 text-right" /></label><p className="text-[11px] text-muted-foreground">응답은 출전 명단에 자동 등록되지 않습니다.</p></> : null}</div>;
}

type UpdateInput = { title: string; scheduledAt: string; rsvpDays: number | null };
function RoomDetailSheet({ room, members, serverNow, canRsvp, leader, canManage, pending, onClose, onUpdate, onOpen, onCancel, onDelegate, onSchedule, onRsvp }: {
  room: LobbyRoom; members: readonly Member[]; serverNow: number; userId: string; canRsvp: boolean; leader: boolean; canManage: boolean; pending: boolean;
  onClose: () => void; onUpdate: (input: UpdateInput) => void; onOpen: () => void; onCancel: () => void; onDelegate: (id: string | null) => void; onSchedule: (enabled: boolean) => void; onRsvp: (response: RsvpResponse) => void;
}) {
  const [title, setTitle] = useState(room.title);
  const [date, setDate] = useState(kstInput(room.scheduled_at));
  const [rsvp, setRsvp] = useState(room.rsvp_days !== null);
  const [days, setDays] = useState(room.rsvp_days ?? 3);
  const [delegate, setDelegate] = useState(room.delegated_to ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const ended = room.status === "closed" || room.status === "cancelled";
  const editable = canManage && room.status === "scheduled";
  const rsvpStart = room.rsvp_days === null ? null : Date.parse(room.scheduled_at) - room.rsvp_days * 86_400_000;
  const rsvpOpen = !ended && room.status === "scheduled" && rsvpStart !== null && serverNow >= rsvpStart && serverNow < Date.parse(room.scheduled_at);
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onUpdate({ title: title.trim(), scheduledAt: `${date}:00+09:00`, rsvpDays: room.kind === "flash" && rsvp ? days : null }); }
  return (
    <Sheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" showCloseButton={!pending}>
        <SheetHeader><SheetTitle>내전 정보</SheetTitle><SheetDescription className="text-xs">{room.kind === "regular" ? "정규" : "깜짝"} · {STATUS[room.status]} · {room.creatorNickname}</SheetDescription></SheetHeader>
        <div className="space-y-6 px-4 pb-5">
          {editable ? <form onSubmit={save} className="space-y-4"><fieldset disabled={pending} className="space-y-4"><label className="block text-xs font-semibold">내전 이름<input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label><label className="block text-xs font-semibold">예약 시각 (한국 시간)<input type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} className={field} /></label>{room.kind === "flash" ? <RsvpFields enabled={rsvp} days={days} onEnabled={setRsvp} onDays={setDays} /> : null}</fieldset><Button type="submit" variant="outline" className="w-full" disabled={pending || !title.trim()}>예약 변경 저장</Button></form> : <div className="space-y-2"><h3 className="font-semibold">{room.title}</h3><p className="text-xs text-muted-foreground">{displayStart(room.scheduled_at)} · 한국 시간</p></div>}
          {room.kind === "flash" && room.rsvp_days !== null ? <section className="space-y-3 border-t pt-4" aria-label="참석 응답"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">참석 응답</h4><span className="text-xs text-muted-foreground">{Object.values(room.rsvpCounts).reduce((a, b) => a + b, 0)}명 응답</span></div><div className="grid grid-cols-3 gap-2">{RSVP.map(({ value, label }) => <Button key={value} size="sm" variant={room.myRsvp === value ? "default" : "outline"} aria-pressed={room.myRsvp === value} disabled={pending || !canRsvp || !rsvpOpen} onClick={() => onRsvp(value)}>{room.myRsvp === value ? <Check className="size-3" aria-hidden="true" /> : null}{label} {room.rsvpCounts[value]}</Button>)}</div><p className="text-[11px] text-muted-foreground">{rsvpOpen ? "응답은 출전 명단에 자동 등록되지 않습니다." : rsvpStart !== null && serverNow < rsvpStart ? `${displayStart(new Date(rsvpStart).toISOString())}부터 응답할 수 있습니다.` : "참석 응답이 마감되었습니다."}</p></section> : null}
          {leader && room.kind === "regular" && !ended ? <section className="space-y-3 border-t pt-4"><label className="block text-xs font-semibold">임시 진행 운영진<select value={delegate} onChange={(event) => setDelegate(event.target.value)} disabled={pending} className={field}><option value="">위임 없음</option>{members.filter((member) => member.role === "officer").map((member) => <option key={member.user_id} value={member.user_id}>{member.nickname}</option>)}</select></label><p className="text-[11px] text-muted-foreground">이 방이 종료되면 위임이 해제됩니다.</p><Button variant="outline" size="sm" disabled={pending || delegate === (room.delegated_to ?? "")} onClick={() => onDelegate(delegate || null)}>{delegate ? "진행 운영진 지정" : "위임 해제"}</Button></section> : room.delegateNickname ? <p className="text-xs text-muted-foreground">진행 운영진 · {room.delegateNickname}</p> : null}
          {canManage && room.schedule_id ? <label className="flex items-center justify-between border-t pt-4 text-sm"><span className="flex items-center gap-2"><Repeat2 className="size-4" aria-hidden="true" />반복 예약 유지</span><input type="checkbox" checked={room.scheduleEnabled !== false} disabled={pending} onChange={(event) => onSchedule(event.target.checked)} className="size-4 accent-primary" /></label> : null}
          {canManage && room.status === "scheduled" ? <div className="space-y-3 border-t pt-4"><Button className="w-full" disabled={pending} onClick={onOpen}>지금 열기<ArrowUpRight className="size-4" aria-hidden="true" /></Button>{confirmCancel ? <div className="rounded-lg border border-destructive/30 p-3"><p className="text-xs">이 내전 예약을 취소할까요?</p><div className="mt-3 flex justify-end gap-2"><Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmCancel(false)}>돌아가기</Button><Button variant="destructive" size="sm" disabled={pending} onClick={onCancel}>취소 확정</Button></div></div> : <Button variant="ghost" className="w-full text-muted-foreground" disabled={pending} onClick={() => setConfirmCancel(true)}>이번 내전 취소</Button>}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LobbyGuide({ canCreate, onClose }: { canCreate: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const steps = canCreate ? [
    { target: "add", title: "내전 추가", text: "+에서 지금 열거나 예약할 내전을 만드세요. 깜짝 내전은 클랜원이 직접 진행할 수 있습니다." },
    { target: "list", title: "목록에서 입장", text: "열린 내전은 입장으로, 예약 내전은 예약 보기로 확인하세요. 참석 응답과 진행 설정도 예약 정보에 있습니다." },
  ] : [{ target: "list", title: "목록에서 입장", text: "열린 내전의 입장을 누르면 해당 내전 화면으로 이동합니다. 예약 보기에서 시작 시각을 확인할 수 있습니다." }];
  const current = steps[step];
  useEffect(() => {
    const target = document.querySelector(`[data-lobby-guide="${current.target}"]`);
    target?.scrollIntoView({ block: "center", behavior: "instant" });
    const measure = () => { const box = target?.getBoundingClientRect(); setRect(box ? { top: Math.max(8, box.top - 5), left: Math.max(8, box.left - 5), width: Math.min(box.width + 10, window.innerWidth - 16), height: Math.min(box.height + 10, window.innerHeight - 16) } : null); };
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [current.target]);
  return <GuideDialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><GuideDialog.Portal><GuideDialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />{rect ? <div aria-hidden="true" className="pointer-events-none fixed z-50 rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-transparent" style={rect} /> : null}<GuideDialog.Popup className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-background p-5 shadow-2xl outline-none"><p className="mb-2 text-xs text-muted-foreground">{step + 1} / {steps.length}</p><GuideDialog.Title className="font-semibold">{current.title}</GuideDialog.Title><GuideDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.text}</GuideDialog.Description><div className="mt-4 flex justify-between"><Button variant="ghost" size="sm" onClick={onClose}>닫기</Button><Button size="sm" onClick={() => step + 1 === steps.length ? onClose() : setStep(step + 1)}>{step + 1 === steps.length ? "완료" : "다음"}</Button></div></GuideDialog.Popup></GuideDialog.Portal></GuideDialog.Root>;
}
