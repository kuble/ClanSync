"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { useTranslator } from "#use-translator";
import { nextBalanceRoundAction } from "@/app/actions/clan-balance-session";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { Button } from "@/components/ui/button";

export function BalanceNextRoundCountdown({ gameSlug, clanId, sessionId, settledAt, serverNow, canManage, paused }: {
  gameSlug: string; clanId: string; sessionId: string; settledAt: string | null;
  serverNow: number; canManage: boolean; paused: boolean;
}) {
  const tx = useTranslator();
  const router = useRouter();
  const deadline = (settledAt ? Date.parse(settledAt) : serverNow) + 5000;
  const now = useServerClock(serverNow, deadline);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempt = useRef<string | null>(null);
  useEffect(() => {
    if (remaining > 0 || !canManage || paused) return;
    const key = `${sessionId}:${retry}`;
    if (attempt.current === key) return;
    attempt.current = key;
    start(async () => {
      try {
        const result = await nextBalanceRoundAction(gameSlug, clanId, sessionId);
        // 다른 운영진의 타이머가 먼저 열었어도 같은 다음 경기를 조회한다.
        if (!result.ok && result.error !== "이미 다음 라운드로 이동했습니다.") setError(result.error);
        router.refresh();
      } catch { setError("다음 경기를 열지 못했습니다. 연결을 확인하고 다시 시도하십시오."); }
    });
  }, [remaining, canManage, paused, sessionId, retry, gameSlug, clanId, router]);
  return <div className="flex flex-wrap items-center justify-end gap-2" data-testid="balance-next-round-countdown" data-remaining={remaining}>
    <p role={error ? "alert" : "status"} className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Timer className="size-4 shrink-0" aria-hidden="true" />
      {error ? tx(error) : remaining > 0 ? tx("{0}초 후 다음 경기로 이동합니다.", remaining) : tx("다음 경기 준비 중…")}
    </p>
    {error && canManage ? <Button variant="outline" size="sm" disabled={pending} onClick={() => { setError(null); setRetry(value => value + 1); }}>{tx("다시 시도")}</Button> : null}
  </div>;
}
