"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateMainClanRoutes(gameSlug: string, clanId: string) {
  const base = `/games/${gameSlug}/clan/${clanId}`;
  revalidatePath(base);
  revalidatePath(`${base}/balance`);
  revalidatePath(`${base}/stats`);
  revalidatePath(`${base}/events`);
  revalidatePath(`${base}/manage`);
  revalidatePath(`${base}/store`);
}

/** 드로어에 표시된 항목 일괄 읽음 (열 때 호출). */
export async function markInAppNotificationIdsReadAction(
  gameSlug: string,
  clanId: string,
  notificationIds: string[],
): Promise<void> {
  const ids = notificationIds.filter(Boolean);
  if (ids.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.rpc("mark_notification_reads", {
    p_ids: ids,
  });
  if (error) throw new Error(error.message);

  revalidateMainClanRoutes(gameSlug, clanId);
}

/** 현재 클랜 미읽음 전부 읽음. */
export async function markAllClanInAppNotificationsReadAction(
  gameSlug: string,
  clanId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.rpc("mark_notifications_read_all_for_clan", {
    p_clan_id: clanId,
  });
  if (error) throw new Error(error.message);

  revalidateMainClanRoutes(gameSlug, clanId);
}
