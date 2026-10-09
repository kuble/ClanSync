"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { startBalanceMatchAction, startHeroBanPhaseAction } from "@/app/actions/clan-balance-session";
import { Button } from "@/components/ui/button";

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
  return <div role="status" className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
    {error ? <><span>{error}</span><Button variant="outline" onClick={() => { setError(null); setRetry((value) => value + 1); }}>다시 시도</Button></> : <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{heroBan ? "영웅 밴으로 이동 중…" : "경기를 시작하고 있습니다…"}</>}
  </div>;
}
