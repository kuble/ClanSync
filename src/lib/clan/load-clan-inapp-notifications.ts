import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export const CLAN_INAPP_NOTIFICATIONS_LIMIT = 30;

export type ClanInAppNotificationVM = {
  id: string;
  kind: string;
  created_at: string;
  read_at: string | null;
  payload: Json;
};

/**
 * MainClan 셸 알림 벨(D-NOTIF-01): 해당 클랜 알림 + 게임 허브 전역 알림(clan_id null).
 */
export async function loadClanInAppNotifications(
  supabase: SupabaseClient<Database>,
  clanId: string,
): Promise<{ items: ClanInAppNotificationVM[]; unreadCount: number }> {
  const clanOrGlobal = `clan_id.eq.${clanId},clan_id.is.null`;
  const { data: items, error: itemsErr } = await supabase
    .from("notifications")
    .select("id, kind, created_at, read_at, payload")
    .or(clanOrGlobal)
    .order("created_at", { ascending: false })
    .limit(CLAN_INAPP_NOTIFICATIONS_LIMIT);

  if (itemsErr) {
    console.error("loadClanInAppNotifications", itemsErr.message);
    return { items: [], unreadCount: 0 };
  }

  const rows = items ?? [];
  const unreadCount = rows.filter((r) => r.read_at == null).length;

  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      created_at: r.created_at,
      read_at: r.read_at,
      payload: r.payload,
    })),
    unreadCount,
  };
}
