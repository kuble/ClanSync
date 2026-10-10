import { postDiscordBotMessage } from "./discord-bot";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Row = { log_id: string; event_id: string | null; poll_id: string | null; slot_kind: string; title: string; start_at: string | null; deadline_at: string | null; clan_id: string; game_slug: string; channel_id: string };
const LABEL: Record<string, string> = {
  event_created: "일정 등록", event_updated: "일정 변경", event_t_minus_24h: "하루 전", event_t_minus_1h: "1시간 전",
  event_t_minus_10min: "10분 전", event_t_0: "시작 시", poll_created: "투표 생성", poll_daily: "매일 알림",
  poll_weekly: "매주 알림", poll_deadline_window: "마감 임박", poll_deadline_1h: "마감 1시간 전",
};
export function buildDiscordBotMessage(row: Row) {
  const time = row.event_id ? row.start_at : row.deadline_at;
  const when = time ? new Date(time).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }) : "";
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return [`**클랜 ${row.event_id ? "일정" : "투표"} 알림**`, row.title, `안내: ${LABEL[row.slot_kind] ?? "알림"}`,
    when ? `${row.event_id ? "시작" : "마감"}: ${when} (한국 시간)` : null,
    `${base}/games/${row.game_slug}/clan/${row.clan_id}/events`].filter(Boolean).join("\n");
}

/** Durable outbox: no token means no claims; each send is rechecked after the lease. */
export async function dispatchDiscordBotNotifications(svc: SupabaseClient<Database>, limit: number, eventId?: string) {
  if (!process.env.DISCORD_BOT_TOKEN) return { claimed: 0, sent: 0, failed: 0 };
  const { data: raw, error } = await svc.rpc("claim_discord_bot_notification_batch", { p_limit: limit, p_event_id: eventId });
  if (error) throw new Error("Discord notification claim failed");
  const rows = (Array.isArray(raw) ? raw : []) as unknown as Row[];
  let sent = 0, failed = 0;
  for (let offset = 0; offset < rows.length; offset += 4) {
    await Promise.all(rows.slice(offset, offset + 4).map(async (row) => {
      const [{ data: log }, { data: settings }, { data: connection }, { data: clan }] = await Promise.all([
        svc.from("notification_log").select("status").eq("id", row.log_id).single(),
        svc.from("clan_settings").select("event_notify").eq("clan_id", row.clan_id).single(),
        svc.from("clan_discord_connections").select("channel_id").eq("clan_id", row.clan_id).single(),
        svc.from("clans").select("subscription_tier").eq("id", row.clan_id).single(),
      ]);
      const notify = settings?.event_notify as Record<string, unknown> | undefined;
      if (log?.status !== "processing" || clan?.subscription_tier !== "premium" || notify?.discord_enabled !== true || notify.discord_transport !== "bot" || connection?.channel_id !== row.channel_id) return;
      let ok = false;
      try {
        await postDiscordBotMessage(row.channel_id, buildDiscordBotMessage(row), row.log_id.replaceAll("-", "").slice(0, 25));
        ok = true;
      } catch { /* Record a fixed error without Discord payloads or credentials. */ }
      const { error: finalizeError } = await svc.rpc("finalize_discord_bot_notification", { p_log_id: row.log_id, p_ok: ok, p_error: ok ? "" : "Discord bot delivery failed" });
      if (finalizeError) throw new Error("Discord notification finalization failed");
      if (ok) sent++; else failed++;
    }));
  }
  return { claimed: rows.length, sent, failed };
}
