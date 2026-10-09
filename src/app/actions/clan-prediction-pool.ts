"use server";

import { createClient } from "@/lib/supabase/server";
import { parsePredictionPool } from "@/lib/balance/prediction-pool";

export async function readPredictionPoolAction(clanId: string, sessionId: string) {
  const client = await createClient();
  const { data: session, error: sessionError } = await client.from("balance_sessions").select("id").eq("id", sessionId).eq("clan_id", clanId).maybeSingle();
  if (sessionError || !session) return { ok: false as const, error: "내전을 조회할 수 없습니다." };
  const { data, error } = await client.rpc("read_balance_prediction_pool", { p_session_id: sessionId });
  if (error) return { ok: false as const, error: "승부예측 정보를 불러오지 못했습니다." };
  return { ok: true as const, pool: parsePredictionPool(data) };
}
