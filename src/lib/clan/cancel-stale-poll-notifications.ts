import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * 마감이 지난 투표에 남아 있는 scheduled 예약을 취소한다.
 * 자연 만료 시 `closed_at` 이 비어 있어도 정리된다 (D-EVENTS-04).
 */
export async function cancelStalePollNotificationLogs(): Promise<void> {
  const svc = createServiceRoleClient();
  const { error } = await svc.rpc("maint_cancel_poll_notifications_past_deadline");
  if (error) {
    console.error("maint_cancel_poll_notifications_past_deadline", error.message);
  }
}
