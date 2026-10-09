"use client";

import { Timer } from "lucide-react";
import { useServerClock } from "@/lib/balance/use-server-clock";
import { cn } from "@/lib/utils";

export function BalancePredictionCountdown({ deadlineIso, serverNow }: {
  deadlineIso: string | null;
  serverNow: number;
}) {
  const deadline = deadlineIso ? Date.parse(deadlineIso) : 0;
  const valid = deadline > 0 && Number.isFinite(deadline);
  const now = useServerClock(serverNow, valid ? deadline : 0, 1000);
  if (!valid) return null;
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <span data-testid="balance-prediction-countdown" className={cn(
      "relative ml-auto mr-6 flex items-center gap-2 rounded-l-xl rounded-r-md border bg-zinc-950 px-3 py-2 whitespace-nowrap shadow-lg sm:-mr-8",
      remaining > 0 ? "border-emerald-400/25 text-emerald-400" : "border-zinc-700 text-zinc-400",
    )}>
      <Timer className="size-3.5" aria-hidden="true" />
      <span className="text-[11px] font-medium">{remaining > 0 ? "승부예측 마감까지" : "승부예측 마감"}</span>
      {remaining > 0 ? <span className="font-mono text-base font-semibold tracking-wide tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span> : null}
    </span>
  );
}
