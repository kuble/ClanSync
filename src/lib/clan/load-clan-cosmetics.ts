import "server-only";
import { getRequestClient } from "@/lib/supabase/request";
import { NO_CLAN_COSMETICS, readCosmeticAccess } from "./cosmetics";
export async function loadClanCosmeticAccess(clanId: string) {
  const client = await getRequestClient();
  const { data, error } = await client.rpc("clan_cosmetic_access", { p_clan_id: clanId });
  return error ? NO_CLAN_COSMETICS : readCosmeticAccess(data);
}
