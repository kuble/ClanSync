import type { Database } from "@/lib/supabase/database.types";

type NotificationSlotKind = Database["public"]["Enums"]["notification_slot_kind"];

export type EventReminderSlot = {
  slot_kind: NotificationSlotKind;
  scheduled_at: Date;
};

/** D-EVENTS-03 슬롯: T-24h · T-1h · T-10min · T+0. `now`보다 이후인 슬롯만 반환. */
export function buildEventReminderSlots(
  startAt: Date,
  now: Date,
): EventReminderSlot[] {
  const startMs = startAt.getTime();
  if (Number.isNaN(startMs) || startMs <= now.getTime()) {
    return [];
  }

  const offsets: { kind: NotificationSlotKind; ms: number }[] = [
    { kind: "event_t_minus_24h", ms: 24 * 60 * 60 * 1000 },
    { kind: "event_t_minus_1h", ms: 60 * 60 * 1000 },
    { kind: "event_t_minus_10min", ms: 10 * 60 * 1000 },
    { kind: "event_t_0", ms: 0 },
  ];

  const out: EventReminderSlot[] = [];
  const nowMs = now.getTime();

  for (const o of offsets) {
    const scheduled = new Date(startMs - o.ms);
    if (scheduled.getTime() > nowMs) {
      out.push({ slot_kind: o.kind, scheduled_at: scheduled });
    }
  }

  return out;
}
