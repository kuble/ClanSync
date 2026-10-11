import { postDiscordBotMessage } from "./discord-bot";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Row = { log_id: string; event_id: string | null; poll_id: string | null; room_id?: string | null; notice_id?: string | null; attempt_count?: number; slot_kind: string; title: string; start_at: string | null; deadline_at: string | null; clan_id: string; game_slug: string; channel_id: string };
const LABEL: Record<string, string> = {
  event_created: "일정 등록", event_updated: "일정 변경", event_t_minus_24h: "하루 전", event_t_minus_1h: "1시간 전",
  event_t_minus_10min: "10분 전", event_t_0: "시작 시", poll_created: "투표 생성", poll_daily: "매일 알림",
  poll_weekly: "매주 알림", poll_deadline_window: "마감 임박", poll_deadline_1h: "마감 1시간 전",
  room_t_minus_10min: "곧 내전이 시작됩니다", notice_created: "새 공지", poll_ended: "투표 종료 · 결과 확인",
};
export function buildDiscordBotMessage(row: Row) {
  const time = row.event_id || row.room_id ? row.start_at : row.deadline_at;
  const when = time ? new Date(time).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }) : "";
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = `/games/${row.game_slug}/clan/${row.clan_id}`;
  const target = row.room_id ? `${path}/balance?room=${row.room_id}` : row.notice_id ? `${path}?notice=${row.notice_id}` : row.poll_id ? `${path}/events?tab=polls&poll=${row.poll_id}` : `${path}/events?event=${row.event_id}&at=${encodeURIComponent(row.start_at ?? "")}`;
  return [`**클랜 ${row.room_id ? "내전" : row.notice_id ? "공지" : row.event_id ? "일정" : "투표"} 알림**`, row.title, `안내: ${LABEL[row.slot_kind] ?? "알림"}`,
    when ? `${row.event_id || row.room_id ? "시작" : "마감"}: ${when} (한국 시간)` : null, `${base}${target}`].filter(Boolean).join("\n");
}

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
