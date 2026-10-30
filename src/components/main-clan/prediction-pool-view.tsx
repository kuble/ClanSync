"use client";

import { formatPercent } from "@/lib/format-percent";
import { Coins, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { predictionMultiplier, type PredictionPool } from "@/lib/balance/prediction-pool";
import { cn } from "@/lib/utils";

const labels = ["블루 승", "레드 승", "무승부"] as const;
const number = (value: number) => value.toLocaleString("ko-KR");

/** Shared presentation for live data and read-only examples. */
export function PredictionPoolView({ pool, pick, amount, pending, remaining, resolved, expired, canBet, available, isParticipant, live, predictionMinutes, setPick, setAmount, submit }: {
  pool: PredictionPool; pick: 1 | 2 | 3 | null; amount: string; pending: boolean;
  remaining: number; resolved: boolean; expired: boolean; canBet: boolean; available: number;
  isParticipant: boolean; live: boolean; predictionMinutes: number;
  setPick: (pick: 1 | 2 | 3) => void; setAmount: (amount: string) => void; submit: (cancel?: boolean) => void;
}) {
  const settlement = pool.mine?.settlement;
  return <div className="space-y-4" data-testid="balance-prediction-pool">
    <section className="space-y-4 rounded-xl border p-4" aria-label="코인 풀">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Coins className="size-4" />전체 풀</span>
        <strong className="text-lg tabular-nums">{number(pool.total)} 코인</strong>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground" role="status">
        <span>{pool.count}명 코인 참여</span>
        <span className="flex items-center gap-1"><Timer className="size-3.5" />{resolved ? "정산 완료" : !live ? `경기 시작 후 ${predictionMinutes}분` : expired ? "마감됨" : Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const team = (index + 1) as 1 | 2 | 3;
          const multiplier = predictionMultiplier(pool.total, pool.teams[index]!);
          return <button key={label} type="button" aria-label={label} aria-pressed={pick === team}
            disabled={!canBet || pending} onClick={() => setPick(team)}
            className={cn("flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default",
              team === 1 ? "border-sky-500/30 bg-sky-500/10 text-team-blue" : team === 2 ? "border-rose-500/30 bg-rose-500/10 text-team-red" : "border-amber-500/30 bg-amber-500/10 text-warning",
              pick === team && "ring-2 ring-current")}>
            <span>{label}</span><strong className="text-base tabular-nums">{multiplier === null ? "—" : multiplier.toFixed(2) + "배"}</strong><span className="text-[10px] tabular-nums">{number(pool.teams[index]!)} 코인</span>
          </button>;
        })}
      </div>
      {!resolved && !expired && isParticipant ? <p className="text-xs text-muted-foreground">이번 경기 출전 중</p> : canBet ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        {pool.hostOnly ? <p className="text-xs text-muted-foreground">개설자 · 예측만 참여</p> : <label className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>걸 코인</span><span className="text-muted-foreground">사용 가능 {number(available)}</span>
          <input aria-label="걸 코인" type="text" inputMode="numeric" autoComplete="off" value={amount} disabled={pending} onChange={(event) => setAmount(event.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-ring" />
        </label>}
        <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={pending || !pick}>{pending ? "저장 중…" : pool.mine ? "예측 변경" : pool.hostOnly ? "예측 저장" : "코인 걸기"}</Button>{pool.mine ? <Button type="button" variant="outline" disabled={pending} onClick={() => submit(true)}>취소</Button> : null}</div>
      </form> : null}
      {pool.mine ? <p className="rounded-lg bg-muted/35 px-3 py-2 text-xs leading-relaxed" role="status">
        {pool.hostOnly && pool.mine.stake === 0
          ? (settlement === "win" ? "적중" : settlement === "lose" ? "미적중" : settlement === "refund" ? "무효" : labels[pool.mine.pick - 1]) + " · 코인 참여 없음"
          : settlement === "win" ? "적중 · " + number(pool.mine.payout) + "코인 수령 · 순이익 +" + number(pool.mine.payout - pool.mine.stake)
          : settlement === "lose" ? "미적중 · " + number(pool.mine.stake) + "코인"
          : settlement === "refund" ? number(pool.mine.payout) + "코인 반환"
          : labels[pool.mine.pick - 1] + " · " + number(pool.mine.stake) + "코인 참여"}
      </p> : null}
    </section>
    <section className="space-y-3" aria-label="내전 예측 순위">
      <h3 className="text-sm font-semibold">내전 예측 순위</h3>
      {pool.ranking.length ? <div className="overflow-hidden rounded-xl border"><table className="w-full table-fixed text-xs tabular-nums">
        <colgroup><col className="w-[42%]" /><col className="w-[28%]" /><col className="w-[30%]" /></colgroup>
        <thead className="bg-muted/35 text-muted-foreground"><tr><th className="px-3 py-3 text-left">닉네임</th><th className="px-1 py-3 text-right">적중률</th><th className="px-3 py-3 text-right">순이익</th></tr></thead>
        <tbody>{pool.ranking.map((entry) => <tr key={entry.user_id} className="border-t">
          <th className="truncate px-3 py-3 text-left font-medium" title={entry.nickname}>{entry.nickname}</th>
          <td className="px-1 py-3 text-right">{formatPercent(entry.played ? entry.hits / entry.played * 100 : null)}<span className="block text-[10px] text-muted-foreground">{entry.hits}/{entry.played}</span></td>
          <td className={cn("wrap-anywhere px-3 py-3 text-right font-semibold",entry.profit > 0 ? "text-primary" : entry.profit < 0 ? "text-team-red" : "text-muted-foreground")}>{entry.profit > 0 ? "+" : ""}{number(entry.profit)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="rounded-xl border px-3 py-4 text-xs text-muted-foreground">정산된 예측이 없습니다.</p>}
    </section>
  </div>;
}
