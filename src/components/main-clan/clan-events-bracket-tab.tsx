"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createBracketTournamentAction,
  deleteBracketTournamentDraftAction,
} from "@/app/actions/bracket-tournaments";
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
import type { SerializedBracketTournament } from "@/lib/clan/load-bracket-tournaments";
import { cn } from "@/lib/utils";

function formatLabelKo(
  f: SerializedBracketTournament["format"],
): string {
  if (f === "single_elim") return "싱글 엘리미네이션";
  if (f === "double_elim") return "더블 엘리미네이션";
  return "라운드 로빈";
}

function statusLabelKo(
  s: SerializedBracketTournament["status"],
): string {
  if (s === "draft") return "초안";
  if (s === "in_progress") return "진행 중";
  if (s === "finished") return "종료";
  return "취소";
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
      const r = await deleteBracketTournamentDraftAction(
        gameSlug,
        clanId,
        id,
      );
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
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-foreground text-sm font-medium">
          대진표 생성기는 Premium 플랜 전용입니다.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          클랜 플랜을 업그레이드하면 토너먼트 초안을 저장하고 이후 단계에서 팀·매치
          편집을 연결할 수 있습니다 (D-EVENTS-05).
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">
          Premium 클랜 전용 대진표 개최 초안을 저장합니다. 팀 로스터·시드·경기
          결과·코인 연동은 이후 작업에서 스냅샷·원장과 연결합니다.
        </p>
        {canManageEvents ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCreateOpen(true)}
          >
            대진표 초안 만들기
          </Button>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>대진표 초안</DialogTitle>
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
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          저장된 대진표 초안이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="대진표 목록">
          {tournaments.map((t) => (
            <li
              key={t.id}
              className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm"
            >
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatLabelKo(t.format)} · 팀 {t.team_count} ·{" "}
                  {statusLabelKo(t.status)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  수정{" "}
                  {new Date(t.updated_at).toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              {canManageEvents && t.status === "draft" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
