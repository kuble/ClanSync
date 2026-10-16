"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Clock, Plus, Vote } from "lucide-react";
import { toast } from "sonner";
import { closeClanPollAction, voteClanPollAction } from "@/app/actions/clan-polls";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClanPollCreateDialog } from "@/components/main-clan/clan-poll-create-dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { ClanPollResults } from "./clan-poll-results";
import { cn } from "@/lib/utils";

function pollIsOpen(poll: SerializedClanPoll, now: number) {
  return pollStatus(poll, now) === "active";
}

type PollStatus = "active" | "upcoming" | "ended";
const statusLabels = { active: "활성 투표", upcoming: "예정 투표", ended: "종료된 투표" } as const;
function pollStatus(poll: SerializedClanPoll, now: number): PollStatus {
  if (poll.closed_at || new Date(poll.deadline_at).getTime() <= now) return "ended";
  return new Date(poll.starts_at).getTime() > now ? "upcoming" : "active";
}

function totalVotes(poll: SerializedClanPoll) {
  return poll.options.reduce((total, option) => total + option.vote_count, 0);
}

function pollTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", hour12: false, dateStyle: "medium", timeStyle: "short",
  });
}

function remainingTime(poll: SerializedClanPoll, now: number) {
  const minutes = Math.ceil((new Date(poll.deadline_at).getTime() - now) / 60_000);
  if (minutes < 60) return `${minutes}분 후 마감`;
  if (minutes < 1440) return `${Math.ceil(minutes / 60)}시간 후 마감`;
  return `${Math.ceil(minutes / 1440)}일 후 마감`;
}

function PollModes({ poll }: { poll: SerializedClanPoll }) {
  return <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
    <span className="rounded-md bg-muted px-2 py-1">{poll.multiple_choice ? "다중 선택" : "단일 선택"}</span>
    <span>{poll.anonymous ? "익명 투표" : "공개 투표"}</span>
  </div>;
}

export function ClanEventsPollsTab({ gameSlug, clanId, polls, canManagePolls, viewerUserId, initialPollId }: {
  gameSlug: string; clanId: string; polls: SerializedClanPoll[];
  canManagePolls: boolean; viewerUserId: string | null; initialPollId?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(initialPollId ?? null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const [filter, setFilter] = useState<PollStatus>(() => {
    const initial = polls.find((poll) => poll.id === initialPollId);
    return initial ? pollStatus(initial, now) : polls.some((poll) => pollStatus(poll, now) === "active") ? "active" : polls.some((poll) => pollStatus(poll, now) === "upcoming") ? "upcoming" : "ended";
  });
  const items = polls.filter((poll) => pollStatus(poll, now) === filter);
  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <RubberSegment label="투표 상태" labelPosition="hidden" value={filter} onChange={setFilter} options={(["active", "upcoming", "ended"] as const).map((id) => ({ id, label: statusLabels[id], badge: <span className="opacity-70">{polls.filter((poll) => pollStatus(poll, now) === id).length}</span> }))} />
      {canManagePolls && <Button type="button" size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" aria-hidden />투표 만들기</Button>}
    </div>
    {createOpen && <ClanPollCreateDialog gameSlug={gameSlug} clanId={clanId} onCreated={(scheduled) => setFilter(scheduled ? "upcoming" : "active")} onOpenChange={setCreateOpen} />}
    <section aria-label={statusLabels[filter]} className="min-h-64">
      {items.length ? <ul className="grid gap-3 md:grid-cols-2">
        {items.map((poll) => {
          const status = pollStatus(poll, now), voted = poll.my_option_ids.length > 0;
          const action = status === "active" ? voted ? "내 투표 보기" : "투표하기" : status === "upcoming" ? "시작 예정 보기" : "결과 보기";
          const top = Math.max(0, ...poll.options.map((option) => option.vote_count));
          const leaders = poll.options.filter((option) => top > 0 && option.vote_count === top);
          return <li key={poll.id} id={`poll-${poll.id}`}>
            <button type="button" aria-haspopup="dialog" aria-label={`${poll.title} ${action}`} onClick={() => setSelectedPollId(poll.id)}
              className="group flex h-full w-full flex-col rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className={cn("inline-flex items-center gap-1.5 font-medium", status === "active" && "text-primary")}><span className={cn("size-1.5 rounded-full", status === "active" ? "bg-primary" : "bg-muted-foreground/50")} />{status === "active" ? "진행 중" : status === "upcoming" ? "시작 예정" : "종료"}</span>
                <span className="tabular-nums">{status === "active" ? remainingTime(poll, now) : status === "upcoming" ? `시작 ${pollTime(poll.starts_at)}` : pollTime(poll.closed_at ?? poll.deadline_at)}</span>
              </div>
              <h4 className="line-clamp-2 break-words text-base font-semibold leading-relaxed">{poll.title}</h4>
              <div className="mb-4 mt-2"><PollModes poll={poll} /></div>
              <p className="mb-4 line-clamp-1 min-h-5 break-words text-xs text-muted-foreground">{status === "ended" ? leaders.length ? `${leaders.length > 1 ? "공동 1위" : "최다 득표"} · ${leaders.map((option) => option.label).join(" · ")}` : "참여한 표가 없습니다." : poll.options.map((option) => option.label).join(" · ")}</p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">{voted ? <CheckCircle2 className="size-3.5 text-primary" aria-hidden /> : <Vote className="size-3.5" aria-hidden />}선택지 {poll.options.length}개 · 총 {totalVotes(poll)}표</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary">{action}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
              </div>
            </button>
          </li>;
        })}
      </ul> : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center"><Vote className="mb-3 size-6 text-muted-foreground" aria-hidden /><p className="text-sm text-muted-foreground">{filter === "active" ? "진행 중인 투표가 없습니다." : filter === "upcoming" ? "예정된 투표가 없습니다." : "종료된 투표가 없습니다."}</p></div>}
    </section>
    {selectedPoll && <PollDialog key={selectedPoll.id} poll={selectedPoll} gameSlug={gameSlug} clanId={clanId} now={now} canManage={canManagePolls} canVote={!!viewerUserId} onClose={() => setSelectedPollId(null)} />}
  </div>;
}

function PollDialog({ poll, gameSlug, clanId, now, canManage, canVote, onClose }: {
  poll: SerializedClanPoll; gameSlug: string; clanId: string; now: number;
  canManage: boolean; canVote: boolean; onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!poll.my_option_ids.length);
  const [picked, setPicked] = useState(poll.my_option_ids);
  const [error, setError] = useState("");
  const open = pollIsOpen(poll, now);
  const upcoming = pollStatus(poll, now) === "upcoming";
  const results = !open || !editing || !canVote;

  function editVote() {
    setPicked(poll.my_option_ids);
    setError("");
    setEditing(true);
  }

  function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !picked.length || !open) return;
    setError("");
    const data = new FormData(event.currentTarget);
    start(async () => {
      try {
        const result = await voteClanPollAction(gameSlug, clanId, data);
        if (!result.ok) { setError(result.error); return; }
        setEditing(false);
        toast.success("투표했습니다.");
      } catch { setError("투표를 저장하지 못했습니다. 선택한 항목을 유지했으니 다시 시도해 주세요."); }
    });
  }

  function closePoll() {
    if (pending || !confirm("이 투표를 지금 종료할까요?")) return;
    setError("");
    start(async () => {
      try {
        const result = await closeClanPollAction(gameSlug, clanId, poll.id);
        if (!result.ok) { setError(result.error); return; }
        toast.success("투표를 종료했습니다.");
      } catch { setError("투표를 종료하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }

  return <Dialog open onOpenChange={(value) => { if (!value && !pending) onClose(); }}>
    <DialogContent initialFocus={titleRef} showCloseButton={!pending} className="flex max-h-[min(90dvh,860px)] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b border-border p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-xs"><span className={cn("rounded-full px-2.5 py-1 font-medium", open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{open ? "진행 중인 투표" : upcoming ? "시작 예정" : "투표 종료"}</span>{open && poll.my_option_ids.length > 0 && <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3.5" aria-hidden />참여 완료</span>}</div>
        <DialogTitle ref={titleRef} tabIndex={-1} className="break-words pr-5 text-lg font-semibold leading-relaxed outline-none sm:text-xl">{poll.title}</DialogTitle>
        <DialogDescription className="text-xs leading-relaxed">{upcoming ? "시작" : open ? "마감" : "종료"} {pollTime(upcoming ? poll.starts_at : open ? poll.deadline_at : poll.closed_at ?? poll.deadline_at)}</DialogDescription>
        <PollModes poll={poll} />
      </DialogHeader>
      <form onSubmit={submitVote} className="flex min-h-0 flex-1 flex-col" aria-busy={pending}>
        <input type="hidden" name="poll_id" value={poll.id} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {upcoming ? <section className="space-y-4"><h3 className="inline-flex items-center gap-2 text-sm font-semibold"><Clock className="size-4 text-primary" aria-hidden />시작 시각부터 참여할 수 있습니다.</h3><p className="text-xs text-muted-foreground">마감 {pollTime(poll.deadline_at)}</p><ol className="divide-y divide-border">{poll.options.map((option) => <li key={option.id} className="py-3 text-sm">{option.label}</li>)}</ol></section> : results ? <ClanPollResults poll={poll} closed={!open} /> : <fieldset disabled={pending} className="space-y-3">
            <legend className="mb-3 text-sm font-semibold">{poll.multiple_choice ? "원하는 선택지를 모두 골라 주세요" : "한 가지를 골라 주세요"}</legend>
            {poll.options.map((option, index) => {
              const checked = picked.includes(option.id);
              return <label key={option.id} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring", checked ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40", pending && "cursor-wait opacity-70")}>
                <input type={poll.multiple_choice ? "checkbox" : "radio"} name="option_id" value={option.id} checked={checked} className="sr-only"
                  onChange={() => setPicked((current) => poll.multiple_choice ? checked ? current.filter((id) => id !== option.id) : [...current, option.id] : [option.id])} />
                <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center border", poll.multiple_choice ? "rounded-md" : "rounded-full", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}>{checked && <Check className="size-3.5" />}</span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed">{option.label}</span>
                <span aria-hidden className="shrink-0 text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              </label>;
            })}
            <p className="pt-1 text-xs text-muted-foreground">마감 전까지 선택을 변경할 수 있습니다.</p>
          </fieldset>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </div>
        <div className="shrink-0 space-y-3 border-t border-border bg-background p-5 sm:px-6">
          {!results ? <>
            <p aria-live="polite" className="text-xs text-muted-foreground">{picked.length ? `${picked.length}개 선택됨` : poll.multiple_choice ? "하나 이상의 선택지를 골라 주세요." : "선택지를 고르면 투표할 수 있어요."}</p>
            <div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => { setError(""); setEditing(false); }}>{poll.my_option_ids.length ? "변경 취소" : "현재 결과 보기"}</Button><Button type="submit" className="min-h-11 flex-1" disabled={pending || !picked.length}><Check className="size-4" aria-hidden />{pending ? "저장 중…" : poll.my_option_ids.length ? "변경 저장" : "투표하기"}</Button></div>
          </> : open && canVote ? <Button type="button" className="min-h-11 w-full" disabled={pending} onClick={editVote}>{poll.my_option_ids.length ? "투표 변경" : "투표하기"}<ArrowRight className="size-4" aria-hidden /></Button>
            : <Button type="button" variant="outline" className="min-h-11 w-full" disabled={pending} onClick={onClose}>목록으로</Button>}
          {poll.balance_room_id ? <Link href={`/games/${gameSlug}/clan/${clanId}/balance?room=${poll.balance_room_id}`} className="inline-flex items-center gap-1 text-xs text-primary">내전 정보<ArrowRight className="size-3" aria-hidden /></Link> : open && canManage && <div className="flex items-center justify-between gap-2 border-t border-border pt-3"><span className="text-[11px] text-muted-foreground">운영진 관리</span><Button type="button" variant="ghost" size="sm" disabled={pending} onClick={closePoll} className="text-muted-foreground">조기 종료</Button></div>}
          {!canVote && <p className="text-xs text-muted-foreground">로그인 후 투표할 수 있습니다.</p>}
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
