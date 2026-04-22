"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setBalanceMatchOutcomeAction,
  submitBalancePredictionAction,
} from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/lib/supabase/database.types";

type MatchOutcome = Database["public"]["Enums"]["balance_match_outcome"];

export function ClanBalancePredictionClient({
  gameSlug,
  clanId,
  sessionId,
  myPickTeam,
  predictionCount,
  deadlineIso,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  myPickTeam: 1 | 2 | null;
  predictionCount: number;
  deadlineIso: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(
    () => (deadlineIso ? new Date(deadlineIso).getTime() : null),
    [deadlineIso],
  );

  useEffect(() => {
    if (deadlineMs == null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadlineMs]);

  const remainSec =
    deadlineMs == null
      ? null
      : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = remainSec !== null && remainSec <= 0;

  function submit(pick: 1 | 2) {
    start(async () => {
      const r = await submitBalancePredictionAction(
        gameSlug,
        clanId,
        sessionId,
        pick,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("예측이 저장되었습니다.");
      router.refresh();
    });
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">승부예측</CardTitle>
        <CardDescription>
          Premium · 비출전 멤버만 참여합니다. 적중 시 개인 코인{" "}
          <span className="text-foreground font-medium">5</span> (MVP 고정)은{" "}
          <strong className="text-foreground">클랜 코인 풀</strong>에서 차감됩니다.
          경기 진행 단계 진입 후{" "}
          <span className="text-foreground font-medium">5분</span> 이내에만 제출·변경할
          수 있습니다. 현재 제출 {predictionCount}명.
          {remainSec != null ? (
            <>
              {" "}
              남은 시간{" "}
              <span className="font-medium tabular-nums text-foreground">
                {expired ? "마감" : `${remainSec}s`}
              </span>
              .
            </>
          ) : (
            <> 마감 시각이 없는 세션은 기존 정책(제한 없음)으로 동작합니다.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {expired ? (
          <p className="text-muted-foreground text-sm">
            예측 마감 시간이 지났습니다. 변경이 필요하면 운영진에게 문의하세요.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={myPickTeam === 1 ? "default" : "outline"}
            disabled={pending || expired}
            onClick={() => submit(1)}
          >
            블루(팀1) 승
          </Button>
          <Button
            type="button"
            variant={myPickTeam === 2 ? "default" : "outline"}
            disabled={pending || expired}
            onClick={() => submit(2)}
          >
            레드(팀2) 승
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClanBalanceMatchOutcomeClient({
  gameSlug,
  clanId,
  sessionId,
  disabled,
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(outcome: Exclude<MatchOutcome, "pending">, label: string) {
    start(async () => {
      const r = await setBalanceMatchOutcomeAction(
        gameSlug,
        clanId,
        sessionId,
        outcome,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">경기 결과 확정</CardTitle>
        <CardDescription>
          확정 시 예측이 마감됩니다. Premium은 적중 인원×5만큼 클랜 풀을 먼저
          차감한 뒤 개인에게 지급합니다. 풀이 부족하면 확정되지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || disabled}
          onClick={() => run("team1", "블루(팀1) 승으로 확정했습니다.")}
        >
          블루 승
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || disabled}
          onClick={() => run("team2", "레드(팀2) 승으로 확정했습니다.")}
        >
          레드 승
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending || disabled}
          onClick={() => run("void", "무효(재경기)로 처리했습니다.")}
        >
          무효 · 재경기
        </Button>
      </CardContent>
    </Card>
  );
}
