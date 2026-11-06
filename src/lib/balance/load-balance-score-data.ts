import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseMaSnapshot, type MaSnapshot } from "./ma-snapshot";
import { parseRoster, rosterAssignedUserIds } from "./roster-schema";
import { parseAnalysisContext, type AnalysisContext } from "./analysis-context";
import { buildPredictionModel, readPredictionBasis, type PredictionModel } from "./analysis-prediction";

export type BalanceScoreData = { ok: true; scores: MaSnapshot; analysisContext?: AnalysisContext; predictionModel?: PredictionModel } | { ok: false };

/** 같은 요청의 권한 확인을 마친 뒤 점수만 별도로 스트리밍한다. */
export async function loadBalanceScoreData(supabase: SupabaseClient<Database>, clanId: string, session: Database["public"]["Tables"]["balance_sessions"]["Row"], canViewScores: boolean, planPremium: boolean, links: Promise<Map<string, string>>): Promise<BalanceScoreData> {
 try {
  if (!canViewScores) return { ok: true, scores: {} };
  const ids = rosterAssignedUserIds(parseRoster(session.roster));
  const current = parseMaSnapshot(session.ma_snapshot);
  if (session.phase === "map_ban") {
    const scores: MaSnapshot = {};
    applyCurrentScores(scores, session, planPremium);
    return { ok: true, scores };
  }
  if (session.phase === "match_live" && ids.length === 10 && ids.every(id => current[id])) {
    const scores: MaSnapshot = {};
    applyCurrentScores(scores, session, planPremium);
    return { ok: true, scores };
  }
  const [scoredResult, analysisResult, linkedAccounts] = await Promise.all([
    readScoreHistory(supabase, clanId),
    canViewScores && planPremium && session.phase !== "match_live"
      ? supabase.rpc("read_balance_analysis_model", { p_round_id: session.id, p_clan_id: clanId })
      : Promise.resolve({ data: null, error: null }),
    links,
  ]);
  const scores: MaSnapshot = {};
  if (analysisResult.error) throw new Error("분석 점수를 불러오지 못했습니다.");
  const bundle = analysisResult.data;
  const analysisBundle = bundle && typeof bundle === "object" && !Array.isArray(bundle) ? bundle : null;
  const analysisContext = analysisBundle ? parseAnalysisContext(analysisBundle.context) : undefined;
  if (scoredResult.error) throw new Error("참가자 점수를 불러오지 못했습니다.");
  if (canViewScores) {
    for (const round of scoredResult.data ?? []) {
      const saved = parseMaSnapshot(round.ma_snapshot);
      const roster = parseRoster(round.roster);
      for (const team of [roster.team1, roster.team2]) for (const role of ["tank", "dmg", "sup"] as const) {
        for (const id of role === "tank" ? [team.tank] : team[role]) {
          if (!id || !saved[id]) continue;
          const score = saved[id];
          scores[id] ??= { m: 0, a: null, roles: {} };
          scores[id].roles![role] ??= score;
          const account = linkedAccounts.get(id);
          if (account) {
            scores[account] ??= { m: 0, a: null, roles: {} };
            scores[account].roles![role] ??= score;
          }
        }
      }
    }
    applyCurrentScores(scores, session, planPremium);
  }
  const predictionModel = analysisBundle
    ? buildPredictionModel(scoredResult.data, session.opened_at, Object.fromEntries(linkedAccounts), readPredictionBasis(analysisBundle.basis))
    : undefined;
  return { ok: true, scores, analysisContext, predictionModel };
 } catch {
  console.error("BALANCE_SCORE_READ_FAILED");
  return { ok: false };
 }
}

function applyCurrentScores(scores: MaSnapshot, session: Database["public"]["Tables"]["balance_sessions"]["Row"], planPremium: boolean) {
    const currentRoster = parseRoster(session.roster);
    const currentScores = parseMaSnapshot(session.ma_snapshot);
    for (const team of [currentRoster.team1, currentRoster.team2]) for (const role of ["tank", "dmg", "sup"] as const) {
      for (const id of role === "tank" ? [team.tank] : team[role]) {
        if (!id || !currentScores[id]) continue;
        scores[id] ??= { m: 0, a: null, roles: {} };
        scores[id].roles![role] = currentScores[id];
      }
    }
    if (!planPremium) for (const score of Object.values(scores)) {
      score.a = null;
      for (const entry of Object.values(score.roles ?? {})) entry.a = null;
    }
}

async function readScoreHistory(supabase: SupabaseClient<Database>, clanId: string) {
  const size = 500;
  const page = (offset: number) => supabase.from("balance_sessions")
    .select("id,ma_snapshot,roster,opened_at,closed_at,predictions_settled_at,match_outcome,resolved_map_label,balance_session_series!inner(balance_rooms!inner(kind))")
    .eq("clan_id", clanId).eq("balance_session_series.balance_rooms.kind", "regular")
    .in("match_outcome", ["team1", "team2", "draw"])
    .order("opened_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + size - 1);
  const first = await page(0);
  if (first.error || first.data.length < size) return first;
  const data = [...first.data];
  // 비용이 큰 전체 개수 집계 없이 다음 두 페이지만 병렬로 읽는다.
  for (let offset = size; ; offset += size * 2) {
    const pages = await Promise.all([page(offset), page(offset + size)]);
    let ended = false;
    for (const result of pages) {
      if (result.error) return result;
      if (ended && result.data.length) throw new Error("점수 이력이 변경되었습니다. 다시 불러오십시오.");
      data.push(...result.data);
      if (result.data.length < size) ended = true;
    }
    if (ended) return { data, error: null };
  }
}
