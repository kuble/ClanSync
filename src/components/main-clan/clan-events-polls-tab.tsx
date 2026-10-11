"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Clock, Plus, Trophy, Vote } from "lucide-react";
import { toast } from "sonner";
import { closeClanPollAction, voteClanPollAction } from "@/app/actions/clan-polls";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClanPollCreateDialog } from "@/components/main-clan/clan-poll-create-dialog";
import { cn } from "@/lib/utils";

function pollIsOpen(poll: SerializedClanPoll, now: number) {
  return !poll.closed_at && new Date(poll.deadline_at).getTime() > now;
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
    <span className="rounded-md bg-muted px-2 py-1">{poll.multiple_choice ? "여러 개 선택" : "한 개 선택"}</span>
    {poll.anonymous && <span className="rounded-md bg-muted px-2 py-1">익명 투표</span>}
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

  const { openPolls, closedPolls } = useMemo(() => ({
    openPolls: polls.filter((poll) => pollIsOpen(poll, now)),
    closedPolls: polls.filter((poll) => !pollIsOpen(poll, now)),
  }), [polls, now]);
  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);

  function pollList(items: SerializedClanPoll[], open: boolean) {
    return <ul className="grid gap-3 md:grid-cols-2">
      {items.map((poll) => {
        const voted = poll.my_option_ids.length > 0;
        const total = totalVotes(poll);
        const top = Math.max(0, ...poll.options.map((option) => option.vote_count));
        const leaders = poll.options.filter((option) => top > 0 && option.vote_count === top);
        return <li key={poll.id} id={`poll-${poll.id}`}>
          <button type="button" aria-haspopup="dialog" aria-label={`${poll.title} ${open ? voted ? "내 투표 보기" : "투표하기" : "결과 보기"}`}
            onClick={() => setSelectedPollId(poll.id)}
            className="group flex h-full w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={cn("rounded-full px-2.5 py-1 font-medium", open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{open ? "진행 중" : "종료"}</span>
              {open && voted ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3.5" aria-hidden />참여 완료</span>
                : open ? <span className="text-muted-foreground">{remainingTime(poll, now)}</span> : null}
            </div>
            <h4 className="break-words text-base font-semibold leading-relaxed">{poll.title}</h4>
            <PollModes poll={poll} />
            <div className="min-h-12 rounded-xl bg-background/50 px-3 py-2.5 text-xs leading-relaxed">
              {open ? <p className="line-clamp-2 break-words text-muted-foreground">{poll.options.slice(0, 2).map((option) => option.label).join(" · ")}{poll.options.length > 2 ? ` 외 ${poll.options.length - 2}개` : ""}</p>
                : leaders.length ? <><p className="mb-1 flex items-center gap-1.5 font-medium text-primary"><Trophy className="size-3.5" aria-hidden />{leaders.length > 1 ? `공동 1위 · ${leaders.length}개 선택지` : "최다 득표"}</p><p className="line-clamp-2 break-words font-medium">{leaders.map((option) => option.label).join(" · ")}</p></>
                  : <p className="text-muted-foreground">참여한 표가 없습니다.</p>}
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground"><Clock className="mt-0.5 size-3 shrink-0" aria-hidden />{open ? "마감" : "종료"} {pollTime(open ? poll.deadline_at : poll.closed_at ?? poll.deadline_at)}</p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">선택지 {poll.options.length}개 · 총 {total}표</span>
              <span className="flex shrink-0 items-center gap-1.5 font-semibold text-primary">{open ? voted ? "내 투표 보기" : "투표하기" : "결과 보기"}<ArrowRight className="size-3.5" aria-hidden /></span>
            </div>
          </button>
        </li>;
      })}
    </ul>;
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">궁금한 투표를 열고, 우리 클랜의 다음 결정을 함께 정하세요.</p>
      {canManagePolls && <Button type="button" size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" aria-hidden />투표 만들기</Button>}
    </div>
    {createOpen && <ClanPollCreateDialog gameSlug={gameSlug} clanId={clanId} onOpenChange={setCreateOpen} />}
    {!polls.length && <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center"><Vote className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden /><p className="text-sm font-medium">아직 등록된 투표가 없습니다.</p><p className="mt-1 text-xs text-muted-foreground">{canManagePolls ? "투표 만들기로 클랜원에게 질문해 보세요." : "새로운 투표가 열리면 여기에서 참여할 수 있어요."}</p></div>}
    {openPolls.length > 0 && <section aria-label="진행 중인 투표" className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Vote className="size-4 text-primary" aria-hidden />진행 중<span className="text-xs font-normal text-muted-foreground">{openPolls.length}</span></h3>{pollList(openPolls, true)}</section>}
    {closedPolls.length > 0 && <section aria-label="종료된 투표" className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold">종료된 투표<span className="text-xs font-normal text-muted-foreground">{closedPolls.length}</span></h3>{pollList(closedPolls, false)}</section>}
    {selectedPoll && <PollDialog key={selectedPoll.id} poll={selectedPoll} gameSlug={gameSlug} clanId={clanId} now={now} canManage={canManagePolls} canVote={!!viewerUserId} onClose={() => setSelectedPollId(null)} />}
  </div>;
}

function PollDialog({ poll, gameSlug, clanId, now, canManage, canVote, onClose }: {
  poll: SerializedClanPoll; gameSlug: string; clanId: string; now: number;
  canManage: boolean; canVote: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!poll.my_option_ids.length);
  const [picked, setPicked] = useState(poll.my_option_ids);
  const [error, setError] = useState("");
  const open = pollIsOpen(poll, now);
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
        router.refresh();
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
        router.refresh();
      } catch { setError("투표를 종료하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }

  return <Dialog open onOpenChange={(value) => { if (!value && !pending) onClose(); }}>
    <DialogContent showCloseButton={!pending} className="flex max-h-[min(90dvh,860px)] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b border-border p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-xs"><span className={cn("rounded-full px-2.5 py-1 font-medium", open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{open ? "진행 중인 투표" : "투표 종료"}</span>{open && poll.my_option_ids.length > 0 && <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3.5" aria-hidden />참여 완료</span>}</div>
        <DialogTitle className="break-words pr-5 text-lg font-semibold leading-relaxed sm:text-xl">{poll.title}</DialogTitle>
        <DialogDescription className="text-xs leading-relaxed">{open ? "마감" : "종료"} {pollTime(open ? poll.deadline_at : poll.closed_at ?? poll.deadline_at)}</DialogDescription>
        <PollModes poll={poll} />
      </DialogHeader>
      <form onSubmit={submitVote} className="flex min-h-0 flex-1 flex-col" aria-busy={pending}>
        <input type="hidden" name="poll_id" value={poll.id} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {results ? <PollResults poll={poll} closed={!open} /> : <fieldset disabled={pending} className="space-y-3">
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
          {open && canManage && <div className="flex items-center justify-between gap-2 border-t border-border pt-3"><span className="text-[11px] text-muted-foreground">운영진 관리</span><Button type="button" variant="ghost" size="sm" disabled={pending} onClick={closePoll} className="text-muted-foreground">조기 종료</Button></div>}
          {!canVote && <p className="text-xs text-muted-foreground">로그인 후 투표할 수 있습니다.</p>}
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

function PollResults({ poll, closed }: { poll: SerializedClanPoll; closed: boolean }) {
  const total = totalVotes(poll);
  const highest = Math.max(0, ...poll.options.map((option) => option.vote_count));
  const leaders = poll.options.filter((option) => highest > 0 && option.vote_count === highest);
  const options = closed ? [...poll.options].sort((a, b) => b.vote_count - a.vote_count || a.sort_order - b.sort_order) : poll.options;
  return <section aria-label="투표 결과" className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{closed ? "최종 결과" : "현재 결과"}</h3><span className="text-xs tabular-nums text-muted-foreground">총 {total}표</span></div>
    {!total && <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">{closed ? "참여한 표가 없습니다." : "아직 투표한 사람이 없습니다. 첫 표를 남겨 보세요."}</p>}
    <ol className="space-y-3">
      {options.map((option) => {
        const percent = total ? Math.round(option.vote_count / total * 100) : 0;
        const winner = closed && highest > 0 && option.vote_count === highest;
        const mine = poll.my_option_ids.includes(option.id);
        return <li key={option.id} className={cn("relative isolate overflow-hidden rounded-xl border p-4", winner ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
          <div aria-hidden className={cn("absolute inset-y-0 left-0 -z-10", winner ? "bg-primary/15" : "bg-muted/50")} style={{ width: `${percent}%` }} />
          {(winner || mine) && <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
            {winner && <span className="flex items-center gap-1 font-semibold text-primary"><Trophy className="size-3.5" aria-hidden />{leaders.length > 1 ? "공동 1위" : "최다 득표"}</span>}
            {mine && <span className="flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-primary"><Check className="size-3" aria-hidden />내 선택</span>}
          </div>}
          <div className="flex items-start justify-between gap-4"><p className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed">{option.label}</p><div className="shrink-0 text-right"><p className={cn("text-base font-semibold tabular-nums", winner && "text-primary")}>{percent}%</p><p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{option.vote_count}표</p></div></div>
        </li>;
      })}
    </ol>
    {poll.multiple_choice && <p className="text-[11px] leading-relaxed text-muted-foreground">여러 개를 선택할 수 있는 투표입니다. 비율은 전체 선택 수를 기준으로 표시합니다.</p>}
  </section>;
}
