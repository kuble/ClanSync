"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { useTranslator } from "#use-translator";
import { nextBalanceRoundAction } from "@/app/actions/clan-balance-session";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { Button } from "@/components/ui/button";
import { BalancePreparationOverlay } from "./balance-preparation-overlay";

export function BalanceNextRoundCountdown({ gameSlug, clanId, sessionId, settledAt, serverNow, canManage, paused, startedAt, saved, saveError, saving, onSaveRetry }: {
  gameSlug: string; clanId: string; sessionId: string; settledAt: string | null;
  serverNow: number; canManage: boolean; paused: boolean;
  startedAt?: number; saved: boolean; saveError?: string; saving: boolean; onSaveRetry: () => void;
}) {
  const tx = useTranslator();
  const router = useRouter();
  const deadline = (startedAt ?? (settledAt ? Date.parse(settledAt) : serverNow)) + 5000;
  const now = useServerClock(startedAt ?? serverNow, deadline, 1000);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempt = useRef<string | null>(null);
  useEffect(() => {
    if (remaining > 0 || !canManage || paused || !saved) return;
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
  }, [remaining, canManage, paused, saved, sessionId, retry, gameSlug, clanId, router]);
  return <div className="flex flex-wrap items-center justify-end gap-2" data-testid="balance-next-round-countdown" data-remaining={remaining}>
    {remaining > 0 && !saveError && !error && !paused ? <div data-testid="balance-next-round-timer" aria-hidden="true"
      className="pointer-events-none fixed top-1/2 left-1/2 z-40 grid w-60 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-2 rounded-2xl border border-primary/30 bg-card/95 p-5 text-center shadow-xl">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Timer className="size-4" />{tx("다음 경기까지")}</p>
      <strong key={remaining} data-testid="balance-next-round-seconds"
        className="font-mono text-7xl leading-none font-bold tabular-nums text-primary motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-200">{remaining}</strong>
      <span className="text-sm text-muted-foreground">{tx("초")}</span>
    </div> : null}
    {remaining === 0 && !saved && saving && !saveError ? <BalancePreparationOverlay savingResult /> : null}
    <p role={saveError || error ? "alert" : "status"} className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Timer className="size-4 shrink-0" aria-hidden="true" />
      {saveError || error ? tx(saveError || error) : remaining > 0 ? tx("{0}초 후 다음 경기로 이동합니다.", remaining) : tx("다음 경기 준비 중…")}
    </p>
    {saveError && canManage ? <Button variant="outline" size="sm" disabled={saving} onClick={onSaveRetry}>{tx("결과 저장 다시 시도")}</Button>
      : error && canManage ? <Button variant="outline" size="sm" disabled={pending} onClick={() => { setError(null); setRetry(value => value + 1); }}>{tx("다시 시도")}</Button> : null}
  </div>;
}
