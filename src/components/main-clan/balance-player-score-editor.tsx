"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
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
  const editor = useRef<HTMLSpanElement>(null);
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
  return <span ref={editor} data-score-editor={editing ? "editing" : "idle"} className={`pointer-events-auto relative shrink-0 ${editing ? "z-60 w-32 max-w-full" : "z-20"}`} onClick={(event) => event.stopPropagation()}>
    <Popover.Root modal open={editing} onOpenChange={(open, details) => {
      if (pending) { details.cancel(); return; }
      if (open) setDraft(String(value ?? 0));
      setEditing(open);
    }}>
      <Popover.Trigger aria-label={`${nickname} 평가 점수 수정`} title="평가 점수 수정" className={`rounded-lg border border-current/10 bg-background/50 px-2 py-2 text-sm font-bold tabular-nums hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-16 sm:text-base ${editing ? "w-full opacity-0" : ""}`}>{formatBalanceScore(value).replace(/점$/, "")}</Popover.Trigger>
      <Popover.Portal container={editor}>
        <Popover.Backdrop className="pointer-events-auto fixed inset-0 z-50" data-testid="balance-score-backdrop" />
        <Popover.Positioner side="bottom" align="end" sideOffset={-40} className="z-50">
          <Popover.Popup className="w-32 max-w-[calc(100vw-2rem)] rounded-lg bg-background p-1">
            <Popover.Title className="sr-only">{nickname} 평가 점수 변경</Popover.Title>
            <form noValidate className="grid grid-cols-[minmax(0,1fr)_20px_20px] items-center gap-1" onSubmit={(event) => { event.preventDefault(); if (!pending) save(); }}>
              <input aria-label={`${nickname} 평가 점수`} type="text" inputMode="decimal" value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border bg-background px-1 text-center text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-ring sm:text-sm" />
              <button type="submit" aria-label={`${nickname} 점수 저장`} disabled={pending} className="rounded-md p-0.5 text-primary focus-visible:outline-2 focus-visible:outline-ring"><Check className="size-4" /></button>
              <Popover.Close aria-label={`${nickname} 점수 취소`} disabled={pending} className="rounded-md p-0.5 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></Popover.Close>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </span>;
}
