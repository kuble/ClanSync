import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildEventReminderSlots } from "@/lib/clan/event-notification-schedule";
import type { ClanEventRecord } from "@/lib/clan/expand-clan-event-occurrences";
import { listUpcomingOccurrenceStarts } from "@/lib/clan/expand-clan-event-occurrences";

/** 단발(`repeat=none`) 일정 — 기존 `notification_log`·dedup과 맞춘 고정 instance_idx. */
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

/**
 * 수동 일정 템플릿 기준 in-app 예약.
 * - `none`: instance_idx=0 (단일).
 * - `weekly`/`monthly`: 각 회차 시작 ms를 instance_idx로 하며, 앞으로 최대 14회·6개월·캘린더 펼침과 동일 규칙.
 */
export async function insertClanEventInAppNotifications(opts: {
  svc: SupabaseClient<Database>;
  clanId: string;
  template: ClanEventRecord;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const repeat = opts.template.repeat ?? "none";

  const upcomingStarts = listUpcomingOccurrenceStarts(opts.template, now, {
    maxOccurrences: 14,
    maxMonths: 6,
  });
  if (upcomingStarts.length === 0) {
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

  for (const startMs of upcomingStarts) {
    const startAt = new Date(startMs);
    const instanceIdx =
      repeat === "none" ? CLAN_EVENT_NOTIFY_INSTANCE_IDX : startMs;
    const slots = buildEventReminderSlots(startAt, now);
    for (const uid of userIds) {
      for (const s of slots) {
        const scheduledAt = s.scheduled_at.toISOString();
        const dedup_key = createHash("sha256")
          .update(
            `${opts.template.id}|${instanceIdx}|${s.slot_kind}|${scheduledAt}|${uid}|inapp`,
          )
          .digest("hex");
        logRows.push({
          event_id: opts.template.id,
          instance_idx: instanceIdx,
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
