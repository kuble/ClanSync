import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { loadAccountInAppNotifications } from "@/lib/clan/load-clan-inapp-notifications";
import { ClanInAppNotificationBell } from "@/components/main-clan/clan-inapp-notification-bell";

export async function AccountNotifications() {
  const user = await getRequestUser();
  if (!user) return null;
  const { items, unreadCount } = await loadAccountInAppNotifications(await getRequestClient(), user.id);
  return <ClanInAppNotificationBell initialItems={items} initialUnreadCount={unreadCount} />;
}
