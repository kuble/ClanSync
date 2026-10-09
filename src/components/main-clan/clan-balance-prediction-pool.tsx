"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Timer } from "lucide-react";
import { toast } from "sonner";
import { submitBalancePredictionAction } from "@/app/actions/clan-balance-session";
import { readPredictionPoolAction } from "@/app/actions/clan-prediction-pool";
import { Button } from "@/components/ui/button";
import { predictionMultiplier, type PredictionPool } from "@/lib/balance/prediction-pool";
import { useServerClock } from "@/lib/balance/use-server-clock";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const labels = ["블루 승", "레드 승", "무승부"] as const;
const number = (value: number) => value.toLocaleString("ko-KR");

export function ClanBalancePredictionPool({ gameSlug, clanId, sessionId, initialPool, deadlineIso, phase, outcome, isParticipant, serverNow }: {
  gameSlug: string; clanId: string; sessionId: string; initialPool: PredictionPool;
  deadlineIso: string | null; phase: Database["public"]["Enums"]["balance_session_phase"];
  outcome: Database["public"]["Enums"]["balance_match_outcome"]; isParticipant: boolean; serverNow: number;
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
    const stake = cancel ? 0 : Number(amount);
    if (!cancel && (!pick || !amount.trim() || !Number.isSafeInteger(stake) || stake < 1 || stake > available)) {
      toast.error("사용 가능한 코인 안에서 1개 이상 정수로 입력하세요."); return;
    }
    start(async () => {
      try {
        const result = await submitBalancePredictionAction(gameSlug, clanId, sessionId, pick ?? pool.mine?.pick ?? 1, stake);
        if (!result.ok) { toast.error(result.error); return; }
        const updated = await readPredictionPoolAction(clanId, sessionId);
        if (updated.ok) setPool(updated.pool);
        if (cancel) { setPick(null); setAmount(""); }
        toast.success(cancel ? "참여를 취소하고 코인을 돌려받았습니다." : "예측과 코인을 저장했습니다.");
        router.refresh();
      } catch { toast.error("저장하지 못했습니다. 다시 시도하세요."); }
    });
  }
  const settlement = pool.mine?.settlement;
  return <div className="space-y-4" data-testid="balance-prediction-pool">
    <section className="space-y-4 rounded-xl border p-4" aria-label="코인 풀">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Coins className="size-4" />전체 풀</span>
        <strong className="text-lg tabular-nums">{number(pool.total)} 코인</strong>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground" role="status">
        <span>{pool.count}명 참여</span>
        <span className="flex items-center gap-1"><Timer className="size-3.5" />{resolved ? "정산 완료" : phase !== "match_live" ? "경기 시작 후 5분" : expired ? "마감됨" : Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const team = (index + 1) as 1 | 2 | 3;
          const multiplier = predictionMultiplier(pool.total, pool.teams[index]!);
          return <button key={label} type="button" aria-label={label} aria-pressed={pick === team}
            disabled={!canBet || pending} onClick={() => setPick(team)}
            className={cn("flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default",
              team === 1 ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300" : team === 2 ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
              pick === team && "ring-2 ring-current")}>
            <span>{label}</span><strong className="text-base tabular-nums">{multiplier === null ? "—" : multiplier.toFixed(2) + "배"}</strong><span className="text-[10px] tabular-nums">{number(pool.teams[index]!)} 코인</span>
          </button>;
        })}
      </div>
      {!resolved && !expired && isParticipant ? <p className="text-xs text-muted-foreground">관전자만 참여할 수 있습니다.</p> : canBet ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>걸 코인</span><span className="text-muted-foreground">사용 가능 {number(available)}</span>
          <input aria-label="걸 코인" type="text" inputMode="numeric" autoComplete="off" value={amount} disabled={pending} onChange={(event) => setAmount(event.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-ring" />
        </label>
        <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={pending || !pick}>{pending ? "저장 중…" : pool.mine ? "예측 변경" : "코인 걸기"}</Button>{pool.mine ? <Button type="button" variant="outline" disabled={pending} onClick={() => submit(true)}>취소</Button> : null}</div>
      </form> : null}
      {pool.mine ? <p className="rounded-lg bg-muted/35 px-3 py-2 text-xs leading-relaxed" role="status">
        {settlement === "win" ? "적중 · " + number(pool.mine.payout) + "코인 수령 · 순이익 +" + number(pool.mine.payout - pool.mine.stake)
          : settlement === "lose" ? "미적중 · " + number(pool.mine.stake) + "코인"
          : settlement === "refund" ? number(pool.mine.payout) + "코인 반환"
          : labels[pool.mine.pick - 1] + " · " + number(pool.mine.stake) + "코인 참여"}
      </p> : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">전체 풀을 적중자의 참여 코인 비율로 나눕니다. 배당은 마감까지 변하며 원금을 포함합니다. 무효·적중자 없음은 전액 반환됩니다.</p>
    </section>
    <section className="space-y-3" aria-label="내전 예측 순위">
      <h3 className="text-sm font-semibold">내전 예측 순위</h3>
      {pool.ranking.length ? <div className="overflow-hidden rounded-xl border"><table className="w-full table-fixed text-xs tabular-nums">
        <colgroup><col className="w-[42%]" /><col className="w-[28%]" /><col className="w-[30%]" /></colgroup>
        <thead className="bg-muted/35 text-muted-foreground"><tr><th className="px-3 py-3 text-left">닉네임</th><th className="px-1 py-3 text-right">적중률</th><th className="px-3 py-3 text-right">순이익</th></tr></thead>
        <tbody>{pool.ranking.map((entry) => <tr key={entry.user_id} className="border-t">
          <th className="truncate px-3 py-3 text-left font-medium" title={entry.nickname}>{entry.nickname}</th>
          <td className="px-1 py-3 text-right">{Math.round(entry.hits / entry.played * 100)}%<span className="block text-[10px] text-muted-foreground">{entry.hits}/{entry.played}</span></td>
          <td className={cn("wrap-anywhere px-3 py-3 text-right font-semibold",entry.profit > 0 ? "text-primary" : entry.profit < 0 ? "text-rose-400" : "text-muted-foreground")}>{entry.profit > 0 ? "+" : ""}{number(entry.profit)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="rounded-xl border px-3 py-4 text-xs text-muted-foreground">정산된 예측이 없습니다.</p>}
      <p className="text-[11px] text-muted-foreground">현재 내전의 닉네임·적중률·누적 순이익을 멤버에게 공개합니다.</p>
    </section>
  </div>;
}
