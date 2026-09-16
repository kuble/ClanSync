"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isRoleRanking } from "@/lib/balance/role-preferences";
import type { Role } from "@/lib/balance/formation";

type Result = { ok: true } | { ok: false; error: string };
export async function saveProfileRolePreferenceAction(
  gameId: string,
  ranking: Role[],
): Promise<{ ok: true; ranking: Role[] } | { ok: false; error: string }> {
  if (!isRoleRanking(ranking))
    return { ok: false, error: "역할 선호를 확인하세요." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await client.rpc("save_profile_role_preference", {
    p_game_id: gameId,
    p_ranking: ranking,
  });
  if (error) return { ok: false, error: error.message };
  // The profile is force-dynamic; return the committed value without waiting for
  // every unrelated profile query to render again. The RPC updates active rounds.
  return { ok: true, ranking };
}

export async function saveRoundRolePreferenceAction(
  gameSlug: string,
  clanId: string,
  roundId: string,
  ranking: Role[] | null,
): Promise<Result> {
  if (ranking !== null && !isRoleRanking(ranking))
    return { ok: false, error: "역할 선호를 확인하세요." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data: round } = await client
    .from("balance_sessions")
    .select("id")
    .eq("id", roundId)
    .eq("clan_id", clanId)
    .maybeSingle();
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." };
  const { error } = await client.rpc("save_round_role_preference", {
    p_round_id: roundId,
    ...(ranking !== null ? { p_ranking: ranking } : {}),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
  return { ok: true };
}
