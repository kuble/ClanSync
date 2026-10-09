"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { updateBalanceMaSnapshotAction } from "@/app/actions/clan-balance-session";
import { formatBalanceScore } from "@/lib/balance/score-display";
import { MA_SCORE_MIN, MA_SCORE_MAX } from "@/lib/balance/ma-snapshot";

export function BalancePlayerScoreEditor({ gameSlug, clanId, sessionId, userId, nickname, value }: {
  gameSlug: string; clanId: string; sessionId: string; userId: string; nickname: string; value: number | null | undefined;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  function save() {
    const score = Number(draft);
    if (!draft.trim() || !Number.isFinite(score) || score < MA_SCORE_MIN || score > MA_SCORE_MAX) { toast.error(`평가 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.`); return; }
    start(async () => {
      try {
        const result = await updateBalanceMaSnapshotAction(gameSlug, clanId, sessionId, JSON.stringify({ [userId]: { m: score, a: null } }));
        if (!result.ok) { toast.error(result.error); return; }
        setEditing(false);
        router.refresh();
      } catch { toast.error("점수를 저장하지 못했습니다. 다시 시도하세요."); }
    });
  }
  return <span data-score-editor={editing ? "editing" : "idle"} className={`pointer-events-auto relative z-20 shrink-0 ${editing ? "w-32 max-w-full" : ""}`} onClick={(event) => event.stopPropagation()}>
    {editing ? <form noValidate className="grid grid-cols-[minmax(0,1fr)_20px_20px] items-center gap-1" onSubmit={(event) => { event.preventDefault(); if (!pending) save(); }}>
      <input autoFocus aria-label={`${nickname} 평가 점수`} type="text" inputMode="decimal" value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) { event.preventDefault(); event.stopPropagation(); setEditing(false); }
      }} className="h-9 w-full min-w-0 appearance-[textfield] rounded-lg border bg-background px-1 text-center text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-ring sm:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button type="submit" aria-label={`${nickname} 점수 저장`} disabled={pending} className="rounded-md p-0.5 text-primary focus-visible:outline-2 focus-visible:outline-ring"><Check className="size-4" /></button>
      <button type="button" aria-label={`${nickname} 점수 취소`} disabled={pending} onClick={() => setEditing(false)} className="rounded-md p-0.5 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
    </form> : <button type="button" aria-label={`${nickname} 평가 점수 수정`} title="평가 점수 수정" onClick={() => { setDraft(String(value ?? 0)); setEditing(true); }} className="rounded-lg border border-current/10 bg-background/50 px-2 py-2 text-sm font-bold tabular-nums hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-16 sm:text-base">{formatBalanceScore(value).replace(/점$/, "")}</button>}
  </span>;
}
