import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildEventReminderSlots } from "@/lib/clan/event-notification-schedule";
import { listUpcomingOccurrenceStarts, type ClanEventRecord } from "@/lib/clan/expand-clan-event-occurrences";

/** Save the template and its complete reservation set in one DB transaction. */
export async function saveClanEventWithNotifications(opts: {
  svc: SupabaseClient<Database>;
  clanId: string;
  actorId: string;
  template: ClanEventRecord;
  create: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const starts = listUpcomingOccurrenceStarts(opts.template, now, { maxOccurrences: 14, maxMonths: 6 });
  const schedule = starts.flatMap((ms) =>
    buildEventReminderSlots(new Date(ms), now).map((slot) => ({
      instance_idx: opts.template.repeat === "none" ? 0 : ms,
      slot_kind: slot.slot_kind,
      scheduled_at: slot.scheduled_at.toISOString(),
    })),
  );
  const { error } = await opts.svc.rpc("save_manual_clan_event", {
    p_event_id: opts.template.id,
    p_clan_id: opts.clanId,
    p_actor_id: opts.actorId,
    p_event: opts.template,
    p_schedule: schedule,
    p_create: opts.create,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
