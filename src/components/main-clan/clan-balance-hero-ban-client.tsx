"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  resolveHeroBanAction,
  submitHeroBanVoteAction,
} from "@/app/actions/clan-balance-session";
import {
  OW_HEROES,
  type OwHero,
  type OwHeroRole,
  owHeroLabel,
  tallyHeroBanVotes,
} from "@/lib/balance/ow-hero-ban";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function optionsExcluding(
  exclude: Set<string>,
): { role: OwHeroRole; heroes: OwHero[] }[] {
  const byRole: Record<OwHeroRole, OwHero[]> = {
    tank: [],
    dps: [],
    support: [],
  };
  for (const h of OW_HEROES) {
    if (exclude.has(h.id)) continue;
    byRole[h.role].push(h);
  }
  return (["tank", "dps", "support"] as const).map((role) => ({
    role,
    heroes: byRole[role],
  }));
}

export function ClanBalanceHeroBanClient({
  gameSlug,
  clanId,
  sessionId,
  deadlineIso,
  myVote,
  allVotes,
  canResolve,
  isRosterParticipant,
  syncKey,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  deadlineIso: string | null;
  myVote: { pick_1: string; pick_2: string; pick_3: string } | null;
  allVotes: readonly {
    pick_1: string;
    pick_2: string;
    pick_3: string;
  }[];
  canResolve: boolean;
  isRosterParticipant: boolean;
  syncKey: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [p1, setP1] = useState(myVote?.pick_1 ?? "");
  const [p2, setP2] = useState(myVote?.pick_2 ?? "");
  const [p3, setP3] = useState(myVote?.pick_3 ?? "");

  useEffect(() => {
    setP1(myVote?.pick_1 ?? "");
    setP2(myVote?.pick_2 ?? "");
    setP3(myVote?.pick_3 ?? "");
  }, [syncKey, myVote?.pick_1, myVote?.pick_2, myVote?.pick_3]);

  const deadlineMs = useMemo(
    () => (deadlineIso ? new Date(deadlineIso).getTime() : null),
    [deadlineIso],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remainSec =
    deadlineMs === null
      ? null
      : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec !== null && remainSec <= 0;

  const scores = useMemo(() => tallyHeroBanVotes(allVotes), [allVotes]);
  const topPreview = useMemo(() => {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [scores]);

  function onSubmit() {
    start(async () => {
      const r = await submitHeroBanVoteAction(
        gameSlug,
        clanId,
        sessionId,
        p1,
        p2,
        p3,
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

  const ex1 = new Set(p1 ? [p1] : []);
  const ex2 = new Set([p1, p2].filter(Boolean));
  const groups1 = optionsExcluding(new Set());
  const groups2 = optionsExcluding(ex1);
  const groups3 = optionsExcluding(ex2);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          1·2·3순위에 각각 다른 영웅을 고릅니다(가중 7·5·3). 제한 시간{" "}
          <span className="font-medium tabular-nums text-foreground">
            {deadlineMs === null
              ? "—"
              : expired
                ? "종료"
                : `${remainSec}s`}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          제출 {allVotes.length}명
        </p>
      </div>

      {isRosterParticipant ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">1순위 (+7)</span>
            <select
              className={cn(
                "border-input bg-background h-10 rounded-md border px-2 text-sm",
              )}
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              disabled={pending}
            >
              <option value="">선택</option>
              {groups1.map(({ role, heroes }) => (
                <optgroup
                  key={role}
                  label={
                    role === "tank"
                      ? "탱커"
                      : role === "dps"
                        ? "공격"
                        : "지원"
                  }
                >
                  {heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nameKo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">2순위 (+5)</span>
            <select
              className={cn(
                "border-input bg-background h-10 rounded-md border px-2 text-sm",
              )}
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              disabled={pending}
            >
              <option value="">선택</option>
              {groups2.map(({ role, heroes }) => (
                <optgroup
                  key={role}
                  label={
                    role === "tank"
                      ? "탱커"
                      : role === "dps"
                        ? "공격"
                        : "지원"
                  }
                >
                  {heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nameKo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">3순위 (+3)</span>
            <select
              className={cn(
                "border-input bg-background h-10 rounded-md border px-2 text-sm",
              )}
              value={p3}
              onChange={(e) => setP3(e.target.value)}
              disabled={pending}
            >
              <option value="">선택</option>
              {groups3.map(({ role, heroes }) => (
                <optgroup
                  key={role}
                  label={
                    role === "tank"
                      ? "탱커"
                      : role === "dps"
                        ? "공격"
                        : "지원"
                  }
                >
                  {heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nameKo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          출전 라인업에 없으면 투표할 수 없습니다. 아래 득표는 관전용입니다.
        </p>
      )}

      {isRosterParticipant ? (
        <Button
          type="button"
          disabled={pending || !p1 || !p2 || !p3}
          onClick={onSubmit}
        >
          투표 반영
        </Button>
      ) : null}

      {topPreview.length > 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <p className="text-muted-foreground mb-1 font-medium">누적 상위</p>
          <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
            {topPreview.map(([id, pts]) => (
              <li key={id}>
                {owHeroLabel(id)}{" "}
                <span className="text-foreground">{pts}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canResolve ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="button" disabled={pending} onClick={onResolve}>
            영웅 밴 확정
          </Button>
          <p className="text-muted-foreground self-center text-xs">
            누적 점수 → 역할당 최대 2 · 전체 최대 4명(09-BalanceMaker).
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          확정은 운영진만 할 수 있습니다.
        </p>
      )}
    </div>
  );
}
