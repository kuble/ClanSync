"use client";

import { useTranslator } from "#use-translator";
import { useState, useTransition, useOptimistic, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  selectBalanceMapAction,
  startMapBanPhaseAction,
  startHeroBanPhaseAction,
  startBalanceMatchAction,
} from "@/app/actions/clan-balance-session";
import { parseBanSettings } from "@/lib/balance/prematch";
import type { Database } from "@/lib/supabase/database.types";
import {
  BalanceManualMapPicker,
  MapTypeFilter,
} from "./clan-balance-map-options";

type Round = Database["public"]["Tables"]["balance_sessions"]["Row"];

export function ClanBalancePrematchControls({
  gameSlug,
  clanId,
  session,
  canManage,
  renderInsights,
  endSessionControl,
  editingOnly = false,
  mapVoteControl,
  open,
  onOpenChange,
  beforeMapVote,
  showTrigger = true,
}: {
  gameSlug: string;
  clanId: string;
  session: Round;
  canManage: boolean;
  renderInsights?: (map: string | null) => ReactNode;
  endSessionControl?: ReactNode;
  editingOnly?: boolean;
  mapVoteControl?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  beforeMapVote?: () => Promise<boolean>;
  showTrigger?: boolean;
}) {
  const tx = useTranslator();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedMap, setSelectedMap] = useOptimistic(session.resolved_map_label);
  const [manualMapOpen, setManualMapOpen] = useState(!session.resolved_map_label);
  const [types, setTypes] = useState(parseBanSettings(session).mapTypes);
  const [typePickerOpen, setTypePickerOpen] = useState(true);
  const needsMapVote = session.map_ban_enabled && !session.resolved_map_label;
  const voting = session.phase === "map_ban";
  const needsHeroVote =
    session.hero_ban_enabled && session.banned_heroes === null;
  const label = needsMapVote
    ? "유형 선택 완료"
    : needsHeroVote
      ? "영웅 밴 시작"
      : "경기 시작";

  function selectMap(label: string) {
    start(async () => {
      setSelectedMap(label);
      const result = await selectBalanceMapAction(
        gameSlug,
        clanId,
        session.id,
        label,
      );
      if (!result.ok) { toast.error(result.error); router.refresh(); }
    });
  }

  function advance() {
    if (needsMapVote) setTypePickerOpen(true);
    start(async () => {
      if (needsMapVote && beforeMapVote && !(await beforeMapVote())) return;
      const result = needsMapVote
        ? await startMapBanPhaseAction(gameSlug, clanId, session.id, types)
        : needsHeroVote
          ? await startHeroBanPhaseAction(gameSlug, clanId, session.id)
          : await startBalanceMatchAction(gameSlug, clanId, session.id);
      if (!result.ok) { toast.error(result.error); router.refresh(); }
    });
  }

  if (needsMapVote || voting) {
    return (
      <section aria-label={tx("경기 준비")}>
        {showTrigger ? <div className="flex items-center justify-between gap-3">
          {endSessionControl}
          {canManage || voting ? <Button onClick={() => { setTypePickerOpen(true); onOpenChange?.(true); }}>{tx(voting ? "맵 투표" : "맵 유형 선택")}</Button> : (
            <p className="text-xs text-muted-foreground">{tx("운영진이 경기를 준비하고 있습니다.")}</p>
          )}
        </div> : null}
        {canManage || voting ? <Dialog open={voting || (open ?? typePickerOpen)} onOpenChange={(value) => { if (!pending) { setTypePickerOpen(value); onOpenChange?.(value); } }}>
          <DialogContent className={voting ? "sm:max-w-4xl" : "sm:max-w-2xl"} aria-describedby={undefined} showCloseButton={!voting}>
            <DialogHeader><DialogTitle>{tx(voting ? "맵 투표" : "맵 유형 선택")}</DialogTitle></DialogHeader>
            {voting ? mapVoteControl : <><MapTypeFilter value={types} onChange={setTypes} disabled={pending} />
            <div className="flex justify-end">
              <Button disabled={pending} onClick={advance}>
                {pending ? tx("적용 중…") : tx("유형 선택 완료")}
                <ArrowRight className="size-4" />
              </Button>
            </div></>}
          </DialogContent>
        </Dialog> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label={tx("경기 준비")}>
      {!session.map_ban_enabled && session.phase === "editing" && (editingOnly || manualMapOpen) ? (
        <BalanceManualMapPicker
          gameSlug={gameSlug}
          value={selectedMap}
          onChange={selectMap}
          disabled={pending}
          canManage={canManage}
        />
      ) : session.resolved_map_label ? (
        <div className="flex items-center justify-between gap-3" data-balance-guide="map-vote">
          <p className="text-sm"><span className="mr-2 text-muted-foreground">{tx("경기 맵")}</span><strong>{tx(session.resolved_map_label)}</strong></p>
          {!session.map_ban_enabled && canManage ? <Button size="sm" variant="outline" disabled={pending} onClick={() => setManualMapOpen(true)}>{tx("맵 변경")}</Button> : null}
        </div>
      ) : null}
      {renderInsights?.(selectedMap)}
      {editingOnly ? null : canManage ? (
        <div className="flex items-center justify-between gap-3" data-balance-guide="primary">
          <div>{endSessionControl}</div>
          <Button
            disabled={pending || (!needsMapVote && !session.resolved_map_label)}
            onClick={advance}
          >
            {pending ? tx("적용 중…") : tx(label)}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {tx("운영진이 경기를 준비하고 있습니다.")}
        </p>
      )}
    </section>
  );
}
