import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Call after membership/management access is checked; return counts, not rosters. */
export async function loadClanHistory(client: SupabaseClient<Database>, clanId: string) {
  const [series, completed, regular, flash, completedFlash] = await Promise.all([
    client.from("balance_session_series").select("opened_at", { count: "exact" })
      .eq("clan_id", clanId).order("opened_at", { ascending: false }).limit(1),
    client.from("balance_session_series").select("id,balance_rooms!inner(kind)", { count: "exact", head: true })
      .eq("clan_id", clanId).eq("balance_rooms.kind", "regular").not("closed_at", "is", null),
    ...["regular", "flash"].map(kind => client.from("balance_session_series").select("id,balance_rooms!inner(kind)", {count:"exact",head:true})
      .eq("clan_id",clanId).eq("balance_rooms.kind",kind)),
    client.from("balance_session_series").select("id,balance_rooms!inner(kind)",{count:"exact",head:true})
      .eq("clan_id",clanId).eq("balance_rooms.kind","flash").not("closed_at","is",null),
  ]);
  return {
    total: series.error ? null : series.count,
    latestAt: series.error ? null : series.data?.[0]?.opened_at ?? null,
    completedRegular: completed.error ? null : completed.count,
    regular: regular.error ? null : regular.count,
    flash: flash.error ? null : flash.count,
    completedFlash: completedFlash.error ? null : completedFlash.count,
  };
}
