"use client";

import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { ClanBalanceSessionPanel } from "./clan-balance-session-panel";
import type { Database } from "@/lib/supabase/database.types";

type Props = ComponentProps<typeof ClanBalanceSessionPanel>;
type Round = Database["public"]["Tables"]["balance_sessions"]["Row"];

export function ClanBalanceRoundTransition(props: Props) {
  const scope = `${props.userId}:${props.clanId}:${props.canManage}:${props.canViewScores}:${props.planPremium}`;
  const [opened, setOpened] = useState<{ scope: string; round: Round; receivedAt: number } | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const carriedScores = useMemo(() => Promise.resolve(props.scoreData).then(result => result.ok ? { ok: true as const, scores: result.scores } : result), [props.scoreData]);
  const current = opened?.scope === scope && props.session && opened.round.series_id === props.session.series_id && opened.round.round_number > props.session.round_number
    ? { ...props, session: opened.round, serverNow: opened.receivedAt, scoreData: carriedScores, scoreScope: `${props.scoreScope}:next:${opened.round.id}`,
      roundRanking: null, votes: [], heroVotes: [], balancePredictions: [], predictionPool: null } : props;
  const source = current.session;
  const preview = useMemo(() => source?.phase === "match_live" ? {
    ...source, id: `preparing-${source.id}`, round_number: source.round_number + 1,
    phase: "editing" as const, match_outcome: "pending" as const, closed_at: null,
    formation_state: null, formation_revision: 0, resolved_map_label: null,
    map_candidates: null, map_ban_deadline_at: null, hero_ban_deadline_at: null, banned_heroes: null,
    prediction_deadline_at: null, predictions_settled_at: null, ma_snapshot: {},
  } : null, [source]);
  const transitionKey = `${scope}:${source?.id}`;
  const showingPreview = Boolean(preview && advancing === transitionKey);
  const start = useCallback(() => setAdvancing(transitionKey), [transitionKey]);
  const ready = useCallback((round: Round) => {
    // 전체 재조회가 끝나기 전에 개설 응답으로 준비된 편집 화면을 활성화한다.
    flushSync(() => { setOpened({ scope, round, receivedAt: Date.now() }); setAdvancing(null); });
  }, [scope]);
  const failed = useCallback(() => setAdvancing(null), []);
  return <>
    <div hidden={showingPreview}>
      <ClanBalanceSessionPanel key={source?.id ?? "none"} {...current} onNextStart={start} onNextReady={ready} onNextError={failed} />
    </div>
    {preview ? <div hidden={!showingPreview} inert data-testid="balance-prepared-round">
      <ClanBalanceSessionPanel key={preview.id} {...current} session={preview} preview
        scoreData={carriedScores} scoreScope={`${current.scoreScope}:preview`} roundRanking={null}
        votes={[]} heroVotes={[]} balancePredictions={[]} predictionPool={null} />
    </div> : null}
  </>;
}
