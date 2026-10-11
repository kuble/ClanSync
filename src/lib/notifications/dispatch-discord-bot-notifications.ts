import { postDiscordBotMessage } from "./discord-bot";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildDiscordBotMessage, type DiscordNotificationRow } from "./discord-message";
export { buildDiscordBotMessage } from "./discord-message";

type Row = DiscordNotificationRow;

/** Durable outbox: no token means no claims; each send is rechecked after the lease. */
export async function dispatchDiscordBotNotifications(svc: SupabaseClient<Database>, limit: number, eventId?: string, clanId?: string) {
  if (!process.env.DISCORD_BOT_TOKEN) return { claimed: 0, sent: 0, failed: 0 };
  const { data: raw, error } = await svc.rpc("claim_discord_bot_notification_batch", { p_limit: limit, p_event_id: eventId, p_clan_id: clanId });
  if (error) throw new Error("Discord notification claim failed");
  const rows = (Array.isArray(raw) ? raw : []) as unknown as Row[];
  let sent = 0, failed = 0;
  for (let offset = 0; offset < rows.length; offset += 4) {
    await Promise.all(rows.slice(offset, offset + 4).map(async (row) => {
      const { data: fresh, error: recheckError } = await svc.rpc("recheck_clan_discord_notification", { p_log_id: row.log_id, p_attempt: row.attempt_count ?? 1 });
      if (recheckError) throw new Error("Discord notification recheck failed");
      if (!fresh) return;
      const current = fresh as unknown as Row;
      let ok = false;
      try {
        if (current.notice_id) {
          const { data: notice, error } = await svc.from("clan_notices").select("title,content")
            .eq("id", current.notice_id).eq("clan_id", current.clan_id).maybeSingle();
          if (error || !notice) throw new Error("Discord notice source unavailable");
          current.title = notice.title;
          current.notice_content = notice.content;
        }
        await postDiscordBotMessage(current.channel_id, buildDiscordBotMessage(current), row.log_id.replaceAll("-", "").slice(0, 25));
        ok = true;
      } catch { /* Record a fixed error without Discord payloads or credentials. */ }
      const { error: finalizeError } = await svc.rpc("finalize_discord_bot_notification", { p_log_id: row.log_id, p_ok: ok, p_error: ok ? "" : "Discord bot delivery failed" });
      if (finalizeError) throw new Error("Discord notification finalization failed");
      if (ok) sent++; else failed++;
    }));
  }
  return { claimed: rows.length, sent, failed };
}
