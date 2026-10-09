"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startBalanceMatchAction, startHeroBanPhaseAction } from "@/app/actions/clan-balance-session";
import { BalancePreparationOverlay } from "./balance-preparation-overlay";

export function BalanceAutoStartMatch({ gameSlug, clanId, sessionId, heroBan }: {
  gameSlug: string; clanId: string; sessionId: string; heroBan: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempt = useRef<{ key: string; result: ReturnType<typeof startBalanceMatchAction> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const advance = heroBan ? startHeroBanPhaseAction : startBalanceMatchAction;
    const key = `${gameSlug}:${clanId}:${sessionId}:${heroBan}:${retry}`;
    if (attempt.current?.key !== key) attempt.current = { key, result: advance(gameSlug, clanId, sessionId) };
    attempt.current.result.then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(result.error);
      router.refresh();
    }).catch(() => {
      if (!cancelled) setError("연결을 확인하고 다시 시도하세요.");
    });
    return () => { cancelled = true; };
  }, [gameSlug, clanId, sessionId, heroBan, router, retry]);
  return <BalancePreparationOverlay error={error} onRetry={() => { setError(null); setRetry((value) => value + 1); }} />;
}
