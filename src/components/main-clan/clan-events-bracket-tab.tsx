"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Crown,
  GitBranch,
  LockKeyhole,
  Plus,
  Shield,
  Trophy,
} from "lucide-react";
import {
  createBracketTournamentAction,
  deleteBracketTournamentDraftAction,
  updateBracketTeamLabelsAction,
} from "@/app/actions/bracket-tournaments";
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
import type { SerializedBracketTournament } from "@/lib/clan/load-bracket-tournaments";
import { cn } from "@/lib/utils";

function formatLabelKo(f: SerializedBracketTournament["format"]): string {
  if (f === "single_elim") return "싱글 엘리미네이션";
  if (f === "double_elim") return "더블 엘리미네이션";
  return "라운드 로빈";
}

function statusLabelKo(s: SerializedBracketTournament["status"]): string {
  if (s === "draft") return "초안";
  if (s === "in_progress") return "진행 중";
  if (s === "finished") return "종료";
  return "취소";
}

function BracketTeamSlotLabelsEditor({
  gameSlug,
  clanId,
  tournamentId,
  teamLabels,
  pending,
  onTransition,
}: {
  gameSlug: string;
  clanId: string;
  tournamentId: string;
  teamLabels: readonly string[];
  pending: boolean;
  onTransition: (cb: () => Promise<void>) => void;
}) {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onTransition(async () => {
      const r = await updateBracketTeamLabelsAction(
        gameSlug,
        clanId,
        tournamentId,
        fd,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("팀 슬롯 이름을 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <details className="bg-muted/20 mt-2 rounded-lg border px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium outline-none [&::-webkit-details-marker]:hidden [&::marker]:content-none">
        팀 슬롯 이름 편집
      </summary>
      <form
        data-testid={`bracket-team-labels-form-${tournamentId}`}
        className="mt-3 space-y-2"
        onSubmit={onSubmit}
      >
        {teamLabels.map((label, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <Label
              htmlFor={`tls-${tournamentId}-${idx}`}
              className="text-muted-foreground w-full max-w-[4.5rem] shrink-0 text-xs"
            >
              슬롯 {idx + 1}
            </Label>
            <Input
              id={`tls-${tournamentId}-${idx}`}
              name={`team_label_${idx}`}
              defaultValue={label}
              required
              minLength={1}
              maxLength={48}
              disabled={pending}
              className="min-w-[8rem] flex-1 font-mono text-xs"
              data-testid={`bracket-team-slot-input-${idx}`}
            />
          </div>
        ))}
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          팀 슬롯 저장
        </Button>
      </form>
    </details>
  );
}

export function ClanEventsBracketTab({
  gameSlug,
  clanId,
  tournaments,
  canManageEvents,
  planIsPremium,
}: {
  gameSlug: string;
  clanId: string;
  tournaments: SerializedBracketTournament[];
  canManageEvents: boolean;
  planIsPremium: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const manageUrl = `/games/${gameSlug}/clan/${clanId}/manage#subscription`;

  function onCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await createBracketTournamentAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("대진표 초안을 저장했습니다.");
      setCreateOpen(false);
      form.reset();
      router.refresh();
    });
  }

  function onDeleteDraft(id: string) {
    if (!confirm("이 초안을 삭제할까요?")) return;
    start(async () => {
      const r = await deleteBracketTournamentDraftAction(gameSlug, clanId, id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제했습니다.");
      router.refresh();
    });
  }

  if (!planIsPremium) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border bg-card px-6 py-14 text-center"
        data-testid="clan-events-bracket-tab"
        data-has-premium="false"
      >
        <div className="mb-5 rounded-2xl bg-amber-500/10 p-5">
          <GitBranch className="size-8 text-amber-500" aria-hidden="true" />
        </div>
        <span className="mb-3 flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
          <LockKeyhole className="size-3" aria-hidden="true" />
          Premium
        </span>
        <p className="text-foreground text-base font-semibold">
          대진표 생성기는 Premium 플랜 전용입니다.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          대회 형식과 참가 팀을 정하고 우리 클랜만의 토너먼트를 준비해 보세요.
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
    );
  }

  return (
    <div
      className="space-y-6"
      data-testid="clan-events-bracket-tab"
      data-has-premium="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">
          대회 형식과 팀 이름을 설정해 초안을 준비하세요. 저장한 초안은 아래에서
          다시 편집할 수 있습니다.
        </p>
        {canManageEvents ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            대진표 초안 만들기
          </Button>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showCloseButton
          data-testid="bracket-create-draft-dialog"
        >
          <DialogHeader>
            <DialogTitle>대진표 초안</DialogTitle>
            <DialogDescription>
              대회 이름과 경기 형식, 참가 팀 수를 정하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bt-title">대회명</Label>
              <Input
                id="bt-title"
                name="title"
                required
                maxLength={120}
                placeholder="예: 5월 큐 시즌 나이트"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bt-format">형식</Label>
              <select
                id="bt-format"
                name="format"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                defaultValue="single_elim"
              >
                <option value="single_elim">싱글 엘리미네이션</option>
                <option value="double_elim">더블 엘리미네이션</option>
                <option value="round_robin">라운드 로빈</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bt-teams">팀 슬롯 수</Label>
              <select
                id="bt-teams"
                name="team_count"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                defaultValue="4"
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="16">16</option>
              </select>
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
                {pending ? "저장 중…" : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!tournaments.length ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed bg-card p-12 text-center text-sm">
          저장된 대진표 초안이 없습니다.
        </p>
      ) : (
        <ul
          className="space-y-3"
          aria-label="대진표 목록"
          data-testid="bracket-tournament-list"
        >
          {tournaments.map((t) => (
            <li
              key={t.id}
              className="bg-card overflow-hidden rounded-2xl border p-5 text-sm shadow-sm"
              data-testid={`bracket-tournament-row-${t.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Trophy
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    {t.title}
                  </h3>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">
                    {statusLabelKo(t.status)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatLabelKo(t.format)} · 팀 슬롯 {t.team_count} ·{" "}
                  {statusLabelKo(t.status)}
                </p>
                <BracketPreview tournament={t} />
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  수정{" "}
                  {new Date(t.updated_at).toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {canManageEvents && t.status === "draft" ? (
                  <BracketTeamSlotLabelsEditor
                    key={t.team_labels.join("|")}
                    gameSlug={gameSlug}
                    clanId={clanId}
                    tournamentId={t.id}
                    teamLabels={t.team_labels}
                    pending={pending}
                    onTransition={(cb) => {
                      start(cb);
                    }}
                  />
                ) : null}
              </div>
              {canManageEvents && t.status === "draft" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-muted-foreground"
                  disabled={pending}
                  onClick={() => onDeleteDraft(t.id)}
                >
                  삭제
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BracketPreview({
  tournament,
}: {
  tournament: SerializedBracketTournament;
}) {
  const pairs: string[][] = [];
  if (tournament.format === "round_robin") {
    for (let index = 0; index < tournament.team_labels.length; index += 1) {
      for (
        let opponent = index + 1;
        opponent < tournament.team_labels.length;
        opponent += 1
      ) {
        pairs.push([
          tournament.team_labels[index],
          tournament.team_labels[opponent],
        ]);
      }
    }
  } else {
    for (let index = 0; index < tournament.team_labels.length; index += 2) {
      pairs.push(tournament.team_labels.slice(index, index + 2));
    }
  }
  return (
    <div className="my-5 overflow-hidden rounded-xl border bg-muted/20">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-xs font-semibold">
        <GitBranch
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        {tournament.format === "round_robin"
          ? "팀별 대결 미리보기"
          : "1라운드 배치 미리보기"}
      </div>
      <div className="flex items-center gap-5 overflow-x-auto p-4">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pairs.map((pair, index) => (
            <div
              key={index}
              className="min-w-44 overflow-hidden rounded-lg border bg-card"
            >
              <div className="border-b bg-muted/25 px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
                MATCH {String(index + 1).padStart(2, "0")}
              </div>
              {pair.map((label, slot) => (
                <div
                  key={slot}
                  className="flex items-center gap-2 border-b px-3 py-2.5 last:border-0"
                >
                  <Shield
                    className={cn(
                      "size-3.5 shrink-0",
                      slot === 0 ? "text-sky-500" : "text-rose-500",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {tournament.format !== "round_robin" ? (
          <div className="hidden shrink-0 items-center gap-4 lg:flex">
            <ArrowRight
              className="size-4 text-muted-foreground/40"
              aria-hidden="true"
            />
            <div className="flex h-28 w-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.04]">
              <Crown className="size-6 text-amber-500/60" aria-hidden="true" />
              <span className="text-[11px] text-muted-foreground">
                우승 팀 미정
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <p className="border-t px-4 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
        저장한 팀 슬롯 순서에 따른 미리보기입니다. 경기 결과와 진출 팀은 아직
        기록되지 않았습니다.
      </p>
    </div>
  );
}
