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
 * MainClan 셸 알림 벨(D-NOTIF-01). 현재 클랜에 귀속된 in-app 피드만 표시한다.
 */
export async function loadClanInAppNotifications(
  supabase: SupabaseClient<Database>,
  clanId: string,
): Promise<{ items: ClanInAppNotificationVM[]; unreadCount: number }> {
  const { data: items, error: itemsErr } = await supabase
    .from("notifications")
    .select("id, kind, created_at, read_at, payload")
    .eq("clan_id", clanId)
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
