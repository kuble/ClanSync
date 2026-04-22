"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
}: {
  gameSlug: string;
  clanId: string;
  sessionId: string;
  myPickTeam: 1 | 2 | null;
  predictionCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

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
          현재 제출 {predictionCount}명. 마감 전에 다시 눌러 변경할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={myPickTeam === 1 ? "default" : "outline"}
          disabled={pending}
          onClick={() => submit(1)}
        >
          블루(팀1) 승
        </Button>
        <Button
          type="button"
          variant={myPickTeam === 2 ? "default" : "outline"}
          disabled={pending}
          onClick={() => submit(2)}
        >
          레드(팀2) 승
        </Button>
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
