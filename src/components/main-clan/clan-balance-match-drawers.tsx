"use client";

import { useState, type ComponentProps } from "react";
import { SlidersHorizontal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Database } from "@/lib/supabase/database.types";
import { ClanBalancePredictionClient } from "./clan-balance-prediction-outcome-client";
import { ClanBalanceMaEditor } from "./clan-balance-ma-editor";
import { ScoreModeToggle, type ScoreMode } from "./balance-team-insights";

export function ClanBalancePredictionDrawer({ isParticipant, outcome, ...props }: ComponentProps<typeof ClanBalancePredictionClient> & {
  isParticipant: boolean;
  outcome: Database["public"]["Enums"]["balance_match_outcome"];
}) {
  return <Sheet>
    <SheetTrigger render={<Button variant="outline" size="sm" />}><Trophy className="size-4" aria-hidden="true" />승부예측</SheetTrigger>
    <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
      <SheetHeader><SheetTitle>승부예측</SheetTitle><SheetDescription>관전 중인 멤버가 승리할 팀을 선택합니다.</SheetDescription></SheetHeader>
      <div className="px-4 pb-6">
        {outcome !== "pending" ? <p className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed">
          {outcome === "void" || outcome === "draw"
            ? `이번 경기는 ${outcome === "draw" ? "무승부" : "무효"}로 확정되어 예측 보상이 지급되지 않습니다.`
            : "결과가 확정되었습니다. 적중 보상은 개인 코인 내역에서 확인할 수 있습니다."}
        </p> : isParticipant ? <p className="rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">이번 경기에 출전 중입니다. 승부예측은 경기를 관전하는 멤버만 참여할 수 있습니다.</p>
          : <ClanBalancePredictionClient {...props} />}
      </div>
    </SheetContent>
  </Sheet>;
}

export function ClanBalanceScoreDrawer({ snapshotKey, ...props }: Omit<ComponentProps<typeof ClanBalanceMaEditor>, "scoreMode"> & { snapshotKey: string }) {
  const [mode, setMode] = useState<ScoreMode>("m");
  return <Sheet>
    <SheetTrigger render={<Button variant="outline" size="sm" />}><SlidersHorizontal className="size-4" aria-hidden="true" />점수 조정</SheetTrigger>
    <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
      <SheetHeader><SheetTitle>참가자 점수 조정</SheetTitle><SheetDescription>이번 경기의 참가자 점수를 수정합니다.</SheetDescription></SheetHeader>
      <div className="space-y-4 px-4 pb-6">
        <ScoreModeToggle value={mode} onChange={setMode} premium={props.planPremium} />
        <ClanBalanceMaEditor key={snapshotKey} {...props} scoreMode={mode} />
      </div>
    </SheetContent>
  </Sheet>;
}
