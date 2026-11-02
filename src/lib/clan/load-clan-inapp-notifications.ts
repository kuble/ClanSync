import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export const CLAN_INAPP_NOTIFICATIONS_LIMIT = 30;

export type ClanInAppNotificationVM = {
  id: string;
  kind: string;
  created_at: string;
  read_at: string | null;
  payload: Json;
  eventsBase?: string;
  inquiryHref?: string | null;
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

/** Account headers show only the signed-in recipient's notifications (RLS). */
export async function loadAccountInAppNotifications(supabase: SupabaseClient<Database>, userId: string) {
  const [notifications, memberships, requests] = await Promise.all([
    supabase.from("notifications").select("id,kind,created_at,read_at,payload,clan_id,clans(games(slug))")
      .eq("recipient_user_id", userId).order("created_at", { ascending: false }).limit(CLAN_INAPP_NOTIFICATIONS_LIMIT),
    supabase.from("clan_members").select("clan_id,role").eq("user_id", userId).eq("status", "active"),
    supabase.rpc("select_my_clan_join_requests"),
  ]);
  if (notifications.error) {
    console.error("loadAccountInAppNotifications", notifications.error.message);
    return { items: [], unreadCount: 0 };
  }
  const staff = new Set((memberships.data ?? []).filter(row => row.role === "leader" || row.role === "officer").map(row => row.clan_id));
  const pending = new Set((requests.data ?? []).filter(row => row.status === "pending").map(row => row.clan_id));
  const items: ClanInAppNotificationVM[] = (notifications.data ?? []).map(row => {
    const slug = row.clans?.games?.slug;
    const base = slug && row.clan_id ? `/games/${encodeURIComponent(slug)}/clan/${row.clan_id}` : undefined;
    return {
      id: row.id, kind: row.kind, created_at: row.created_at, read_at: row.read_at, payload: row.payload,
      eventsBase: base ? `${base}/events` : undefined,
      inquiryHref: base && row.clan_id ? staff.has(row.clan_id) ? `${base}/manage?tab=requests&inquiry=1`
        : pending.has(row.clan_id) ? `/games/${encodeURIComponent(slug!)}/clan?inquiry=${row.clan_id}` : null : null,
    };
  });
  return { items, unreadCount: items.filter(row => row.read_at == null).length };
}
