"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { MA_SCORE_MAX, MA_SCORE_MIN } from "@/lib/balance/ma-snapshot";
import { createClient } from "@/lib/supabase/server";

export async function updateHistoricalMscoreAction(
  gameSlug: string,
  clanId: string,
  roundId: string,
  playerId: string,
  score: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(score) || score < MA_SCORE_MIN || score > MA_SCORE_MAX) {
    return { ok: false, error: `평가 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.` };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!await hasClanPermission(supabase, user.id, clanId, "edit_mscore")) {
    return { ok: false, error: "평가 점수 편집 권한이 없습니다." };
  }
  const { error } = await supabase.rpc("update_balance_history_mscore", {
    p_round_id: roundId,
    p_clan_id: clanId,
    p_user_id: playerId,
    p_score: score,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/stats`);
  return { ok: true };
}
