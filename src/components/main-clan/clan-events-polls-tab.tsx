"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Clock, Plus, Vote } from "lucide-react";
import { toast } from "sonner";
import {
  closeClanPollAction,
  voteClanPollAction,
} from "@/app/actions/clan-polls";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { Button } from "@/components/ui/button";
import { ClanPollCreateDialog } from "@/components/main-clan/clan-poll-create-dialog";
import { cn } from "@/lib/utils";

function pollIsOpen(p: SerializedClanPoll, now = Date.now()): boolean {
  if (p.closed_at != null) return false;
  return new Date(p.deadline_at).getTime() > now;
}

function totalVotes(p: SerializedClanPoll): number {
  return p.options.reduce((s, o) => s + o.vote_count, 0);
}

export function ClanEventsPollsTab({
  gameSlug,
  clanId,
  polls,
  canManagePolls,
  viewerUserId,
  initialPollId,
}: {
  gameSlug: string;
  clanId: string;
  polls: SerializedClanPoll[];
  canManagePolls: boolean;
  viewerUserId: string | null;
  initialPollId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!initialPollId) return;
    const target = document.getElementById(`poll-${initialPollId}`);
    target?.scrollIntoView({ block: "center", behavior: "instant" });
    target?.focus({ preventScroll: true });
  }, [initialPollId]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { openPolls, closedPolls } = useMemo(() => {
    const open: SerializedClanPoll[] = [];
    const closed: SerializedClanPoll[] = [];
    for (const p of polls) {
      if (pollIsOpen(p, now)) open.push(p);
      else closed.push(p);
    }
    return { openPolls: open, closedPolls: closed };
  }, [polls, now]);

  function onVoteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await voteClanPollAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("투표했습니다.");
      router.refresh();
    });
  }

  function onClosePoll(pollId: string) {
    if (!confirm("이 투표를 지금 종료할까요?")) return;
    start(async () => {
      const r = await closeClanPollAction(gameSlug, clanId, pollId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("투표를 종료했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          내전 시간부터 다음 이벤트까지, 클랜의 다음 결정을 함께 정해보세요.
        </p>
        {canManagePolls ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            투표 만들기
          </Button>
        ) : null}
      </div>

      {createOpen ? (
        <ClanPollCreateDialog
          gameSlug={gameSlug}
          clanId={clanId}
          onOpenChange={setCreateOpen}
        />
      ) : null}

      {!polls.length ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed bg-card p-12 text-center text-sm">
          등록된 투표가 없습니다.
          {canManagePolls ? " 위 버튼으로 새 투표를 만들 수 있습니다." : ""}
        </p>
      ) : null}

      {openPolls.length ? (
        <section className="space-y-4" aria-label="진행 중인 투표">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <Vote className="size-4 text-primary" aria-hidden="true" />
            진행 중{" "}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {openPolls.length}
            </span>
          </h3>
          <ul className="grid items-start gap-4 xl:grid-cols-2">
            {openPolls.map((p) => (
              <li
                key={p.id}
                id={`poll-${p.id}`}
                tabIndex={-1}
                className="bg-card rounded-2xl border p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{p.title}</p>
                    <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <Clock className="mr-1 size-3" aria-hidden="true" />
                      마감{" "}
                      {new Date(p.deadline_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        hour12: false,
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {p.anonymous ? " · 익명" : ""}
                      {p.multiple_choice ? " · 복수 선택" : ""}
                    </p>
                  </div>
                  {canManagePolls ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => onClosePoll(p.id)}
                    >
                      종료
                    </Button>
                  ) : null}
                </div>

                <PollResultBars poll={p} className="mt-4" />

                {viewerUserId ? (
                  pollIsOpen(p, now) ? (
                    <form
                      key={`vote-${p.id}-${p.my_option_ids.slice().sort().join(",")}`}
                      onSubmit={onVoteSubmit}
                      className="mt-4 space-y-3 border-t pt-4"
                    >
                      <input type="hidden" name="poll_id" value={p.id} />
                      <fieldset className="space-y-2">
                        <legend className="text-muted-foreground mb-2 text-xs">
                          {p.multiple_choice
                            ? "해당되는 항목을 모두 선택"
                            : "한 가지만 선택"}
                        </legend>
                        {p.options.map((o) => {
                          const inputType = p.multiple_choice
                            ? "checkbox"
                            : "radio";
                          return (
                            <label
                              key={o.id}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <input
                                type={inputType}
                                className="accent-primary"
                                disabled={pending}
                                name="option_id"
                                value={o.id}
                                defaultChecked={
                                  p.my_option_ids.includes(o.id) || undefined
                                }
                              />
                              {o.label}
                            </label>
                          );
                        })}
                      </fieldset>
                      <Button type="submit" size="sm" disabled={pending}>
                        <Check className="size-3.5" aria-hidden="true" />
                        {p.my_option_ids.length ? "투표 변경" : "투표하기"}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-xs">
                      마감되어 투표할 수 없습니다.
                    </p>
                  )
                ) : (
                  <p className="text-muted-foreground mt-3 text-xs">
                    로그인 후 투표할 수 있습니다.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {closedPolls.length ? (
        <section className="space-y-4 opacity-90" aria-label="종료된 투표">
          <h3 className="text-xs font-semibold text-muted-foreground">
            종료됨{" "}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
              {closedPolls.length}
            </span>
          </h3>
          <ul className="space-y-4">
            {closedPolls.map((p) => (
              <li key={p.id} id={`poll-${p.id}`} tabIndex={-1} className="rounded-2xl border bg-muted/15 p-5">
                <p className="font-medium">{p.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  마감{" "}
                  {new Date(p.deadline_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    hour12: false,
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <PollResultBars poll={p} className="mt-3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PollResultBars({
  poll,
  className,
}: {
  poll: SerializedClanPoll;
  className?: string;
}) {
  const total = totalVotes(poll);
  return (
    <div className={cn("space-y-2", className)}>
      {poll.options.map((o) => {
        const pct = total > 0 ? Math.round((o.vote_count / total) * 100) : 0;
        return (
          <div key={o.id}>
            <div className="mb-1.5 flex justify-between gap-3 text-xs">
              <span>{o.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {o.vote_count}표 ({pct}%)
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary/65 h-full rounded-full transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs tabular-nums">총 {total}표</p>
    </div>
  );
}
