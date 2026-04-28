"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  closeClanPollAction,
  createClanPollAction,
  voteClanPollAction,
} from "@/app/actions/clan-polls";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function pollIsOpen(p: SerializedClanPoll): boolean {
  if (p.closed_at != null) return false;
  return new Date(p.deadline_at).getTime() > Date.now();
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
}: {
  gameSlug: string;
  clanId: string;
  polls: SerializedClanPoll[];
  canManagePolls: boolean;
  viewerUserId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [optionInputs, setOptionInputs] = useState(["", ""]);

  const { openPolls, closedPolls } = useMemo(() => {
    const open: SerializedClanPoll[] = [];
    const closed: SerializedClanPoll[] = [];
    for (const p of polls) {
      if (pollIsOpen(p)) open.push(p);
      else closed.push(p);
    }
    return { openPolls: open, closedPolls: closed };
  }, [polls]);

  function addOptionRow() {
    if (optionInputs.length >= 12) return;
    setOptionInputs((rows) => [...rows, ""]);
  }

  function onCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    optionInputs.forEach((t) => {
      if (t.trim()) fd.append("option_label", t.trim());
    });
    start(async () => {
      const r = await createClanPollAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("투표를 만들었습니다.");
      setCreateOpen(false);
      setOptionInputs(["", ""]);
      form.reset();
      router.refresh();
    });
  }

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

  const [createDeadlineDefault] = useState(() => {
    const d = new Date(Date.now() + 48 * 3600000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          진행 중 투표에 참여합니다. 알림 스케줄(D-EVENTS-04)은 후속에서
          연결합니다.
        </p>
        {canManagePolls ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCreateOpen(true)}
          >
            투표 만들기
          </Button>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>투표 만들기</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poll-title">제목</Label>
              <Input
                id="poll-title"
                name="title"
                required
                maxLength={120}
                placeholder="예: 다음 금요일 내전 시간"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-deadline">마감 (로컬 시각)</Label>
              <Input
                id="poll-deadline"
                name="deadline_local"
                type="datetime-local"
                required
                defaultValue={createDeadlineDefault}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="anonymous" />
                익명 투표
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="multiple_choice" />
                복수 선택 허용
              </label>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">선택지 (2~12개)</span>
              {optionInputs.map((_, i) => (
                <Input
                  key={i}
                  value={optionInputs[i]}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    setOptionInputs((rows) => {
                      const next = [...rows];
                      next[i] = v;
                      return next;
                    });
                  }}
                  maxLength={80}
                  placeholder={`선택지 ${i + 1}`}
                  aria-label={`선택지 ${i + 1}`}
                />
              ))}
              {optionInputs.length < 12 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOptionRow}
                >
                  선택지 추가
                </Button>
              ) : null}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "만드는 중…" : "만들기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!polls.length ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          등록된 투표가 없습니다.
          {canManagePolls ? " 위 버튼으로 새 투표를 만들 수 있습니다." : ""}
        </p>
      ) : null}

      {openPolls.length ? (
        <section className="space-y-4" aria-label="진행 중인 투표">
          <h3 className="text-sm font-medium">진행 중</h3>
          <ul className="space-y-4">
            {openPolls.map((p) => (
              <li
                key={p.id}
                className="bg-card rounded-xl border p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      마감{" "}
                      {new Date(p.deadline_at).toLocaleString("ko-KR", {
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
                  pollIsOpen(p) ? (
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
                        투표하기
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
          <h3 className="text-sm font-medium text-muted-foreground">종료됨</h3>
          <ul className="space-y-4">
            {closedPolls.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-dashed p-4"
              >
                <p className="font-medium">{p.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  마감{" "}
                  {new Date(p.deadline_at).toLocaleString("ko-KR", {
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
            <div className="mb-0.5 flex justify-between text-xs">
              <span>{o.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {o.vote_count}표 ({pct}%)
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary/70 h-full rounded-full transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs tabular-nums">
        총 {total}표
      </p>
    </div>
  );
}
