"use server";

import { getRequestClient, getRequestUser } from "@/lib/supabase/request";

export async function completeClanWelcomeAction(clanId: string, joinedAt: string) {
  if (!await getRequestUser()) return { ok: false };
  const supabase = await getRequestClient();
  const { data, error } = await supabase.rpc("complete_clan_welcome", { p_clan_id: clanId, p_joined_at: joinedAt });
  return { ok: !error && data === true };
}
