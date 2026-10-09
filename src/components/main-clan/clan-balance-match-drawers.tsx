"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";
import { ClanBalancePredictionClient } from "./clan-balance-prediction-outcome-client";
import { ClanBalancePredictionPool } from "./clan-balance-prediction-pool";
import type { PredictionPool } from "@/lib/balance/prediction-pool";

export function ClanBalancePredictionDrawer({ isParticipant, outcome, pool, serverNow, phase, ...props }: ComponentProps<typeof ClanBalancePredictionClient> & {
  isParticipant: boolean;
  outcome: Database["public"]["Enums"]["balance_match_outcome"];
  pool: PredictionPool | null;
  serverNow: number;
  phase: Database["public"]["Enums"]["balance_session_phase"];
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const tab = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const suppressHover = useRef(false);
  function changeOpen(next: boolean) {
    if (!next && pointer.current && tab.current) {
      const bounds = tab.current.getBoundingClientRect();
      suppressHover.current = pointer.current.x >= bounds.left && pointer.current.x <= bounds.right && pointer.current.y >= bounds.top && pointer.current.y <= bounds.bottom;
    }
    setOpen(next);
  }
  return <>
    <Button ref={tab} variant="ghost" aria-label="승부예측" aria-haspopup="dialog" aria-expanded={open} aria-controls={contentId} aria-hidden={open || undefined} tabIndex={open ? -1 : 0} data-testid="balance-prediction-tab" onMouseMove={(event) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      if (!suppressHover.current && window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) setOpen(true);
    }} onMouseLeave={() => { suppressHover.current = false; }} onClick={() => { suppressHover.current = false; setOpen(true); }} className={cn("h-auto flex-col gap-2 rounded-l-xl rounded-r-none border border-primary/25 bg-background/95 px-2 py-3 text-xs font-semibold text-primary shadow-lg", open && "invisible pointer-events-none")}><Trophy className="size-4" aria-hidden="true" /><span className="[writing-mode:vertical-rl]">승부예측</span></Button>
    <Sheet open={open} onOpenChange={changeOpen}>
    <SheetContent id={contentId} finalFocus={tab} onPointerMove={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; }} onPointerLeave={(event) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      if (event.pointerType === "mouse" && window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) changeOpen(false);
    }} className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
      <SheetHeader><SheetTitle>승부예측</SheetTitle><SheetDescription>관전 중인 멤버가 블루 승·레드 승·무승부를 예측합니다.</SheetDescription></SheetHeader>
      <div className="px-4 pb-6">
        {pool ? <ClanBalancePredictionPool {...props} initialPool={pool} outcome={outcome} isParticipant={isParticipant} serverNow={serverNow} phase={phase} /> : outcome !== "pending" ? <p className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed">
          {outcome === "void"
            ? "이번 경기는 무효로 확정되어 예측 보상이 지급되지 않습니다."
            : "결과가 확정되었습니다. 적중 보상은 개인 코인 내역에서 확인할 수 있습니다."}
        </p> : isParticipant ? <p className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">이번 경기에 출전 중입니다. 승부예측은 경기를 관전하는 멤버만 참여할 수 있습니다.</p>
          : <ClanBalancePredictionClient {...props} />}
      </div>
    </SheetContent>
  </Sheet>
  </>;
}
