import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const SLOT_LABEL: Record<string, string> = {
  poll_created: "투표 생성",
  poll_daily: "투표 알림(매일)",
  poll_weekly: "투표 알림(매주)",
  poll_deadline_window: "마감 임박",
  poll_deadline_1h: "마감 1시간 전",
};

export type ClaimedDiscordPollNotification = {
  log_id: string;
  poll_id: string;
  slot_kind: string;
  scheduled_at: string;
  poll_title: string;
  deadline_at: string;
  webhook_url: string;
  clan_id: string;
  game_slug: string;
};

function parseClaimedRows(raw: unknown): ClaimedDiscordPollNotification[] {
  if (!Array.isArray(raw)) return [];
  const out: ClaimedDiscordPollNotification[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const log_id = typeof o.log_id === "string" ? o.log_id : "";
    const poll_id = typeof o.poll_id === "string" ? o.poll_id : "";
    const webhook_url = typeof o.webhook_url === "string" ? o.webhook_url : "";
    const clan_id = typeof o.clan_id === "string" ? o.clan_id : "";
    const game_slug = typeof o.game_slug === "string" ? o.game_slug : "";
    if (!log_id || !webhook_url || !clan_id || !game_slug) continue;
    out.push({
      log_id,
      poll_id,
      slot_kind: typeof o.slot_kind === "string" ? o.slot_kind : "",
      scheduled_at: typeof o.scheduled_at === "string" ? o.scheduled_at : "",
      poll_title: typeof o.poll_title === "string" ? o.poll_title : "클랜 투표",
      deadline_at: typeof o.deadline_at === "string" ? o.deadline_at : "",
      webhook_url,
      clan_id,
      game_slug,
    });
  }
  return out;
}

function buildDiscordPollMessage(row: ClaimedDiscordPollNotification): string {
  const rawSlot = row.slot_kind.trim();
  const slot = SLOT_LABEL[rawSlot] || rawSlot || "투표 알림";
  const deadline = row.deadline_at
    ? new Date(row.deadline_at).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const path = `/games/${row.game_slug}/clan/${row.clan_id}/events`;
  const link = base ? `${base.replace(/\/$/, "")}${path}` : path;
  const lines = [
    "🗳️ **클랜 투표 알림**",
    `**${row.poll_title}**`,
    `안내: ${slot}`,
    deadline ? `마감: ${deadline}` : null,
    `열기: ${link}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Cron/워커: claim_discord_poll_notification_batch 로 잠근 행에 대해 웹훅 POST 후 finalize.
 */
export async function dispatchDiscordPollNotifications(
  svc: SupabaseClient<Database>,
  pLimit: number,
): Promise<{ claimed: number; sent: number; failed: number }> {
  const { data: raw, error } = await svc.rpc("claim_discord_poll_notification_batch", {
    p_limit: pLimit,
  });

  if (error) {
    console.warn("claim_discord_poll_notification_batch", error.message);
    return { claimed: 0, sent: 0, failed: 0 };
  }

  const rows = parseClaimedRows(raw);
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    let ok = false;
    let errMsg = "";
    try {
      const res = await fetch(row.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buildDiscordPollMessage(row) }),
        signal: AbortSignal.timeout(10_000),
      });
      ok = res.ok;
      if (!ok) {
        errMsg = `HTTP ${res.status}`;
      }
    } catch (e) {
      ok = false;
      errMsg = e instanceof Error ? e.message : "fetch error";
    }

    await svc.rpc("finalize_discord_notification_dispatch", {
      p_log_id: row.log_id,
      p_ok: ok,
      p_error: ok ? "" : errMsg,
    });
    if (ok) sent++;
    else failed++;
  }

  return { claimed: rows.length, sent, failed };
}
