"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import {
  resolveHeroBanAction,
  submitHeroBanVoteAction,
} from "@/app/actions/clan-balance-session";
import {
  OW_HEROES,
  owHeroLabel,
  tallyHeroBanVotes,
} from "@/lib/balance/ow-hero-ban";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useServerClock } from "@/lib/balance/use-server-clock";

const ROLE_LABEL = { tank: "탱커", dps: "공격", support: "지원" } as const;

export function ClanBalanceHeroBanClient({
  gameSlug,
  clanId,
  sessionId,
  deadlineIso,
  serverNow,
  myVote,
  allVotes,
  canResolve,
  isRosterParticipant,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  deadlineIso: string | null;
  serverNow: number;
  myVote: { pick_1: string; pick_2: string; pick_3: string } | null;
  allVotes: readonly { pick_1: string; pick_2: string; pick_3: string }[];
  canResolve: boolean;
  isRosterParticipant: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picks, setPicks] = useState([
    myVote?.pick_1 ?? "",
    myVote?.pick_2 ?? "",
    myVote?.pick_3 ?? "",
  ]);
  const deadlineMs = deadlineIso ? new Date(deadlineIso).getTime() : null;
  const now = useServerClock(serverNow, deadlineMs ?? 0, 250);
  const remainSec =
    deadlineMs === null
      ? null
      : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec === 0;
  const scores = tallyHeroBanVotes(allVotes);
  const topPreview = Object.entries(scores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
  const maxScore = topPreview[0]?.[1] ?? 1;

  function onSubmit() {
    if (!deadlineIso || expired || pending) return;
    start(async () => {
      const r = await submitHeroBanVoteAction(
        gameSlug,
        clanId,
        sessionId,
        picks[0]!,
        picks[1]!,
        picks[2]!,
        deadlineIso,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("영웅 밴 투표가 반영되었습니다.");
      router.refresh();
    });
  }
  function onResolve() {
    start(async () => {
      const r = await resolveHeroBanAction(gameSlug, clanId, sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("영웅 밴이 확정되었습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-base font-semibold">
            <Ban className="size-5 text-primary" aria-hidden="true" />
            이번 경기에서 제외할 영웅
          </h4>
          <p className="mt-2 text-xs text-muted-foreground">
            서로 다른 영웅 3명을 선택하세요. 순위에 따라 7 · 5 · 3점이
            반영됩니다.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-lg font-bold tabular-nums",
            expired
              ? "bg-muted text-muted-foreground"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
        >
          <Timer className="size-4" aria-hidden="true" />
          {remainSec === null ? "—" : expired ? "투표 종료" : remainSec + "s"}
        </span>
      </div>
      {isRosterParticipant ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {picks.map((pick, index) => (
            <label
              key={index}
              className={cn(
                "space-y-4 rounded-xl border p-4",
                pick ? "border-primary/30 bg-primary/[0.04]" : "bg-muted/15",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-xs font-semibold">{index + 1}순위</span>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                  +{[7, 5, 3][index]}점
                </span>
              </span>
              <span className="flex h-14 items-center justify-center rounded-lg bg-muted/30">
                <Ban
                  className="size-7 text-muted-foreground/40"
                  aria-hidden="true"
                />
              </span>
              <select
                aria-label={index + 1 + "순위 영웅"}
                className="h-10 w-full rounded-lg border bg-background px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={pick}
                disabled={pending || expired}
                onChange={(event) =>
                  setPicks((prev) =>
                    prev.map((value, i) =>
                      i === index
                        ? event.target.value
                        : value === event.target.value
                          ? ""
                          : value,
                    ),
                  )
                }
              >
                <option value="">영웅 선택</option>
                {(["tank", "dps", "support"] as const).map((role) => (
                  <optgroup key={role} label={ROLE_LABEL[role]}>
                    {OW_HEROES.filter(
                      (hero) =>
                        hero.role === role &&
                        (!picks.includes(hero.id) || pick === hero.id),
                    ).map((hero) => (
                      <option key={hero.id} value={hero.id}>
                        {hero.nameKo}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/10 p-5 text-xs leading-relaxed text-muted-foreground">
          현재 경기를 관전 중입니다. 영웅 밴 투표는 출전 라인업에 포함된
          참가자만 할 수 있습니다.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-4" aria-hidden="true" />
          {allVotes.length}명 제출{myVote ? " · 내 투표 반영됨" : ""}
        </p>
        {isRosterParticipant ? (
          <Button
            type="button"
            disabled={pending || expired || picks.some((pick) => !pick)}
            onClick={onSubmit}
          >
            <Check className="size-4" aria-hidden="true" />
            투표 반영
          </Button>
        ) : null}
      </div>
      <section className="rounded-xl border bg-muted/15 p-4">
        <h5 className="text-xs font-semibold">실시간 밴 투표 현황</h5>
        {topPreview.length ? (
          <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {topPreview.map(([id, score], index) => (
              <li key={id} className="space-y-1.5">
                <div className="flex justify-between gap-2 text-xs">
                  <span>
                    <span className="mr-2 text-muted-foreground">
                      {index + 1}
                    </span>
                    {owHeroLabel(id)}
                  </span>
                  <strong className="tabular-nums">{score}점</strong>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/70"
                    style={{
                      width: Math.round((score / maxScore) * 100) + "%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            아직 제출된 투표가 없습니다.
          </p>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          득표 순으로 역할당 최대 2명, 전체 최대 4명이 제외됩니다.
        </p>
        {canResolve ? (
          <Button
            type="button"
            disabled={pending || !expired}
            onClick={onResolve}
          >
            영웅 밴 확정
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            운영진의 확정을 기다리고 있습니다.
          </span>
        )}
      </div>
    </div>
  );
}
