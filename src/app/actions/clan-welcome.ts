"use server";

import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import type { InitialAnalysisScores } from "@/lib/balance/entry-tiers";

export async function completeClanWelcomeAction(clanId: string, joinedAt: string, scores?: InitialAnalysisScores) {
  if (!await getRequestUser()) return { ok: false };
  const supabase = await getRequestClient();
  const args = { p_clan_id: clanId, p_joined_at: joinedAt };
  const { data, error } = scores === undefined
    ? await supabase.rpc("complete_clan_welcome", args)
    : await supabase.rpc("complete_balance_score_welcome", { ...args, p_scores: scores });
  return { ok: !error && data === true };
}
