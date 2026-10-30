"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitBalancePredictionAction } from "@/app/actions/clan-balance-session";
import { readPredictionPoolAction } from "@/app/actions/clan-prediction-pool";
import type { PredictionPool } from "@/lib/balance/prediction-pool";
import { PredictionPoolView } from "./prediction-pool-view";
import { useServerClock } from "@/lib/balance/use-server-clock";
import type { Database } from "@/lib/supabase/database.types";


export function ClanBalancePredictionPool({ gameSlug, clanId, sessionId, initialPool, deadlineIso, phase, outcome, isParticipant, serverNow, predictionMinutes }: {
  gameSlug: string; clanId: string; sessionId: string; initialPool: PredictionPool;
  deadlineIso: string | null; phase: Database["public"]["Enums"]["balance_session_phase"];
  outcome: Database["public"]["Enums"]["balance_match_outcome"]; isParticipant: boolean; serverNow: number; predictionMinutes: number;
}) {
  const router = useRouter();
  const [pool, setPool] = useState(initialPool);
  const [pick, setPick] = useState<1 | 2 | 3 | null>(initialPool.mine?.pick ?? null);
  const [amount, setAmount] = useState(initialPool.mine ? String(initialPool.mine.stake) : "");
  const [pending, start] = useTransition();
  const deadline = deadlineIso ? Date.parse(deadlineIso) : 0;
  const now = useServerClock(serverNow, deadline, 250);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const resolved = outcome !== "pending";
  const expired = phase === "match_live" && (!deadline || remaining === 0);
  const canBet = !resolved && !expired && !isParticipant;
  const available = pool.balance + (pool.mine?.stake ?? 0);

  useEffect(() => {
    let disposed = false;
    let loading = false;
    async function refresh() {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const result = await readPredictionPoolAction(clanId, sessionId);
        if (!disposed && result.ok) setPool(result.pool);
      } catch {
        // Keep the last snapshot while a transient network failure is retried.
      } finally { loading = false; }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => { disposed = true; clearInterval(interval); };
  }, [clanId, sessionId, initialPool]);

  function submit(cancel = false) {
    const stake = cancel || pool.hostOnly ? 0 : Number(amount);
    if (!cancel && !pick) return;
    if (!cancel && !pool.hostOnly && (!amount.trim() || !Number.isSafeInteger(stake) || stake < 1 || stake > available)) {
      toast.error("사용 가능한 코인 안에서 1개 이상 정수로 입력하십시오."); return;
    }
    start(async () => {
      try {
        const choice = cancel && pool.hostOnly ? 0 : pick ?? pool.mine?.pick ?? 1;
        const result = await submitBalancePredictionAction(gameSlug, clanId, sessionId, choice, stake);
        if (!result.ok) { toast.error(result.error); return; }
        const updated = await readPredictionPoolAction(clanId, sessionId);
        if (updated.ok) setPool(updated.pool);
        if (cancel) { setPick(null); setAmount(""); }
        toast.success(pool.hostOnly
          ? cancel ? "예측을 취소했습니다." : "예측을 저장했습니다."
          : cancel ? "참여를 취소하고 코인을 돌려받았습니다." : "예측과 코인을 저장했습니다.");
        router.refresh();
      } catch { toast.error("저장하지 못했습니다. 다시 시도하십시오."); }
    });
  }
  return <PredictionPoolView pool={pool} pick={pick} amount={amount} pending={pending}
    remaining={remaining} resolved={resolved} expired={expired} canBet={canBet} available={available}
    isParticipant={isParticipant} live={phase === "match_live"} predictionMinutes={predictionMinutes}
    setPick={setPick} setAmount={setAmount} submit={submit} />;
}
