import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Uses the authenticated caller and current membership, never a cached role. */
export async function canManageRound(
  client: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  roundId: string,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await client.rpc("can_manage_balance_round", {
    p_round_id: roundId,
    p_clan_id: clanId,
  });
  return !error && data === true;
}

export async function canManageRoom(
  client: SupabaseClient<Database>,
  userId: string,
  clanId: string,
  roomId: string,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await client.rpc("can_manage_balance_room", {
    p_room_id: roomId,
    p_clan_id: clanId,
  });
  return !error && data === true;
}
