"use server";

import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import type { EntryTiers } from "@/lib/balance/entry-tiers";

export async function completeClanWelcomeAction(clanId: string, joinedAt: string, tiers?: EntryTiers) {
  if (!await getRequestUser()) return { ok: false };
  const supabase = await getRequestClient();
  const args = { p_clan_id: clanId, p_joined_at: joinedAt };
  const { data, error } = tiers === undefined
    ? await supabase.rpc("complete_clan_welcome", args)
    : await supabase.rpc("complete_balance_tier_welcome", { ...args, p_tiers: tiers });
  return { ok: !error && data === true };
}
