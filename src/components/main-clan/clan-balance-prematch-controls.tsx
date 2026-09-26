"use client";

import { useState, useTransition, useOptimistic, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
}: {
  gameSlug: string;
  clanId: string;
  session: Round;
  canManage: boolean;
  renderInsights?: (map: string | null) => ReactNode;
  endSessionControl?: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedMap, setSelectedMap] = useOptimistic(session.resolved_map_label);
  const [types, setTypes] = useState(parseBanSettings(session).mapTypes);
  const needsMapVote = session.map_ban_enabled && !session.resolved_map_label;
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
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function advance() {
    start(async () => {
      const result = needsMapVote
        ? await startMapBanPhaseAction(gameSlug, clanId, session.id, types)
        : needsHeroVote
          ? await startHeroBanPhaseAction(gameSlug, clanId, session.id)
          : await startBalanceMatchAction(gameSlug, clanId, session.id);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <section className="space-y-6" aria-label="경기 준비">
      {needsMapVote && canManage ? (
        <div className="space-y-3">
          <MapTypeFilter value={types} onChange={setTypes} disabled={pending} />
        </div>
      ) : !session.map_ban_enabled && session.phase === "editing" ? (
        <BalanceManualMapPicker
          gameSlug={gameSlug}
          value={selectedMap}
          onChange={selectMap}
          disabled={pending}
          canManage={canManage}
        />
      ) : session.resolved_map_label ? (
        <p className="text-sm" data-balance-guide="map-vote">
          <span className="mr-2 text-muted-foreground">경기 맵</span>
          <strong>{session.resolved_map_label}</strong>
        </p>
      ) : null}
      {renderInsights?.(selectedMap)}
      {canManage ? (
        <div className="flex items-center justify-between gap-3" data-balance-guide="primary">
          <div>{endSessionControl}</div>
          <Button
            disabled={pending || (!needsMapVote && !session.resolved_map_label)}
            onClick={advance}
          >
            {pending ? "적용 중…" : label}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          운영진이 경기를 준비하고 있습니다.
        </p>
      )}
    </section>
  );
}
