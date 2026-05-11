import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ClanJoinRequestRow =
  Database["public"]["Tables"]["clan_join_requests"]["Row"];

/**
 * 본인 가입 신청 전부. RLS 회피용 `select_my_clan_join_requests` RPC.
 * 프로필·게임 카드·`loadGameOnboarding` 에서 공통 사용.
 */
export async function fetchMyClanJoinRequests(
  supabase: SupabaseClient<Database>,
): Promise<{ data: ClanJoinRequestRow[] | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("select_my_clan_join_requests");
  return {
    data: data ?? null,
    error: error ? { message: error.message } : null,
  };
}

/** 해당 게임의 pending 만, `applied_at` 내림차순. */
export function filterPendingJoinsForGame(
  rows: ClanJoinRequestRow[] | null | undefined,
  gameId: string,
): ClanJoinRequestRow[] {
  const list =
    rows?.filter(
      (r) =>
        String(r.game_id) === String(gameId) && String(r.status) === "pending",
    ) ?? [];
  list.sort((a, b) => Date.parse(b.applied_at) - Date.parse(a.applied_at));
  return list;
}
