import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildEventReminderSlots } from "@/lib/clan/event-notification-schedule";

/** 단발 일정 알림용 `instance_idx` — `notification_log` 유니크·서비스 코드와 정합. */
export const CLAN_EVENT_NOTIFY_INSTANCE_IDX = 0;

export async function cancelScheduledClanEventNotifications(
  svc: SupabaseClient<Database>,
  eventId: string,
): Promise<void> {
  await svc
    .from("notification_log")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("status", "scheduled");
}

export async function insertClanEventInAppNotifications(opts: {
  svc: SupabaseClient<Database>;
  clanId: string;
  eventId: string;
  startAt: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const slots = buildEventReminderSlots(opts.startAt, now);
  if (slots.length === 0) {
    return { ok: true };
  }

  const { data: memRows, error: memErr } = await opts.svc
    .from("clan_members")
    .select("user_id")
    .eq("clan_id", opts.clanId)
    .eq("status", "active");

  if (memErr) {
    return { ok: false, error: memErr.message };
  }

  const userIds = [...new Set((memRows ?? []).map((r) => r.user_id as string))];
  type LogInsert = Database["public"]["Tables"]["notification_log"]["Insert"];

  const logRows: LogInsert[] = [];

  for (const uid of userIds) {
    for (const s of slots) {
      const scheduledAt = s.scheduled_at.toISOString();
      const dedup_key = createHash("sha256")
        .update(
          `${opts.eventId}|${CLAN_EVENT_NOTIFY_INSTANCE_IDX}|${s.slot_kind}|${scheduledAt}|${uid}|inapp`,
        )
        .digest("hex");
      logRows.push({
        event_id: opts.eventId,
        instance_idx: CLAN_EVENT_NOTIFY_INSTANCE_IDX,
        poll_id: null,
        slot_kind: s.slot_kind,
        channel: "inapp",
        recipient_user_id: uid,
        scheduled_at: scheduledAt,
        dedup_key,
        status: "scheduled",
      });
    }
  }

  const chunk = 400;
  for (let i = 0; i < logRows.length; i += chunk) {
    const slice = logRows.slice(i, i + chunk);
    const { error: logErr } = await opts.svc.from("notification_log").insert(slice);
    if (logErr) {
      return { ok: false, error: logErr.message };
    }
  }

  return { ok: true };
}
