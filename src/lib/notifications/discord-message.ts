/** Shared by the Discord sender and the settings gallery. No server credentials here. */
export type DiscordNotificationRow = {
  log_id: string; event_id: string | null; poll_id: string | null; room_id?: string | null;
  room_kind?: string; room_status?: string;
  notice_id?: string | null; notice_content?: string | null; attempt_count?: number;
  slot_kind: string; title: string; start_at: string | null; deadline_at: string | null;
  clan_id: string; game_slug: string; channel_id: string;
};

export type DiscordMessagePayload = {
  content?: string;
  embeds?: { author: { name: string }; title: string; description: string; url: string; color: number }[];
};

const LABEL: Record<string, string> = {
  event_created: "일정이 등록되었습니다", event_updated: "일정이 변경되었습니다",
  event_t_minus_24h: "하루 전", event_t_minus_1h: "1시간 전",
  event_t_minus_10min: "시작 10분 전", event_t_0: "시작 시간",
  poll_daily: "투표 참여 안내", poll_weekly: "투표 참여 안내",
  poll_deadline_window: "마감 임박", poll_deadline_1h: "마감 1시간 전",
};
const COLOR = 0x43b581;
const TIME_ZONE = "Asia/Seoul";
const truncate = (value: string, limit: number) => value.length <= limit ? value : `${value.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, "")}…`;

function formatTime(value: string | null, now: Date) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const day = (time: Date) => time.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const label = day(date) === day(now) ? "오늘" : date.toLocaleDateString("ko-KR", { timeZone: TIME_ZONE, month: "long", day: "numeric" });
  const time = date.toLocaleTimeString("ko-KR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${label} ${time}`;
}

export function buildDiscordNotificationCard(row: DiscordNotificationRow, options: { siteUrl?: string; now?: Date } = {}) {
  const base = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  // Discord embed hyperlinks require an absolute HTTP(S) URL.
  const origin = new URL(base);
  if (!["http:", "https:"].includes(origin.protocol)) throw new Error("Invalid Discord notification site URL");
  const path = `/games/${encodeURIComponent(row.game_slug)}/clan/${encodeURIComponent(row.clan_id)}`;
  const target = row.room_id ? `${path}/balance?${new URLSearchParams({ room: row.room_id })}`
    : row.notice_id ? `${path}/board/notices/${encodeURIComponent(row.notice_id)}`
    : row.poll_id ? `${path}/events?${new URLSearchParams({ tab: "polls", poll: row.poll_id })}`
    : `${path}/events?${new URLSearchParams({ event: row.event_id ?? "", at: row.start_at ?? "" })}`;
  const url = new URL(target, origin).href;
  const now = options.now ?? new Date();
  let title = row.title, body = "", action = "", category = "📅 일정";
  if (row.notice_id) {
    category = "📣 공지";
    body = row.notice_content?.trim() ?? "";
    action = "공지 읽기";
  } else if (row.room_id) {
    category = row.room_kind === "flash" ? "⚡ 깜짝 내전" : "⚔️ 정규 내전";
    const started = row.room_status === "open";
    const minutes = row.start_at ? Math.ceil((Date.parse(row.start_at) - now.getTime()) / 60_000) : 0;
    title = `${row.title} · ${started ? "시작되었습니다" : "곧 시작됩니다"}`;
    body = started ? "진행 중 · 지금 입장할 수 있습니다" : [formatTime(row.start_at, now), minutes > 0 ? `시작 ${minutes}분 전` : "시작 예정"].filter(Boolean).join(" · ");
    action = "내전으로 이동";
  } else if (row.poll_id) {
    category = "🗳️ 투표";
    const ended = row.slot_kind === "poll_ended";
    title = `${row.title} 투표가 ${ended ? "종료" : "시작"} 되었습니다`;
    const deadline = formatTime(row.deadline_at, now);
    body = ended ? "투표 종료 · 결과 확인" : [deadline ? `마감 ${deadline}` : "", LABEL[row.slot_kind]].filter(Boolean).join(" · ");
    action = ended ? "투표 결과 보기" : "투표 참여하기";
  } else {
    body = [formatTime(row.start_at, now), LABEL[row.slot_kind]].filter(Boolean).join(" · ");
    action = "일정 확인";
  }
  const link = `[${action}](<${url}>)`;
  return { category, title: truncate(title, 256), body: truncate(body, 4096 - link.length - 2), action, url, color: COLOR };
}

export function buildDiscordBotMessage(row: DiscordNotificationRow, options?: { siteUrl?: string; now?: Date }): DiscordMessagePayload {
  const card = buildDiscordNotificationCard(row, options);
  return { embeds: [{ author: { name: card.category }, title: card.title, description: [card.body, `[${card.action}](<${card.url}>)`].filter(Boolean).join("\n\n"), url: card.url, color: card.color }] };
}
