import { expect, test } from "@playwright/test";
import { buildDiscordBotMessage, type DiscordNotificationRow } from "../src/lib/notifications/discord-message";
import { postDiscordBotMessage } from "../src/lib/notifications/discord-bot";

const channel = "234567890123456789";
const base: DiscordNotificationRow = { log_id: "example", event_id: null, poll_id: null, title: "", slot_kind: "", start_at: null, deadline_at: null, game_slug: "overwatch", clan_id: "clan", channel_id: channel };
const options = { siteUrl: "https://clansync.example", now: new Date("2026-10-12T10:00:00Z") };

test("Discord sends rich cards for rooms, calendar, notices and both poll states", async () => {
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  const sent: Record<string, unknown>[] = [];
  try {
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (_url, init) => { sent.push(JSON.parse(String(init?.body))); return Response.json({ id: "mock-message" }); };
    const cases = [
      { source: { ...base, room_id: "room", room_kind: "regular", room_status: "scheduled", title: "토요일 정규 내전", slot_kind: "room_t_minus_10min", start_at: "2026-10-12T10:10:00Z" }, title: "토요일 정규 내전 · 곧 시작됩니다", body: "오늘 19:10 · 시작 10분 전", action: "내전으로 이동", target: "/balance?room=room" },
      { source: { ...base, event_id: "event", title: "수요 듀오 연습회", slot_kind: "event_t_minus_1h", start_at: "2026-10-12T11:00:00Z" }, title: "수요 듀오 연습회", body: "오늘 20:00 · 1시간 전", action: "일정 확인", target: "/events?event=event&at=2026-10-12T11%3A00%3A00Z" },
      { source: { ...base, notice_id: "notice", title: "이번 주 내전 운영 안내", slot_kind: "notice_created", notice_content: "토요일 21시에 정규 내전이 열립니다.\n미리 참석 응답을 남겨 주십시오." }, title: "이번 주 내전 운영 안내", body: "토요일 21시에 정규 내전이 열립니다.\n미리 참석 응답을 남겨 주십시오.", action: "공지 읽기", target: "/board/notices/notice" },
      { source: { ...base, poll_id: "poll", title: "다음 내전 시간", slot_kind: "poll_created", deadline_at: "2026-10-12T12:00:00Z" }, title: "다음 내전 시간 투표가 시작 되었습니다", body: "마감 오늘 21:00", action: "투표 참여하기", target: "/events?tab=polls&poll=poll" },
      { source: { ...base, poll_id: "poll", title: "다음 내전 시간", slot_kind: "poll_ended" }, title: "다음 내전 시간 투표가 종료 되었습니다", body: "투표 종료 · 결과 확인", action: "투표 결과 보기", target: "/events?tab=polls&poll=poll" },
    ];
    const categories = ["⚔️ 정규 내전", "📅 일정", "📣 공지", "🗳️ 투표", "🗳️ 투표"];
    for (const [index, item] of cases.entries()) {
      await postDiscordBotMessage(channel, buildDiscordBotMessage(item.source, options), `nonce-${index}`);
      const payload = sent[index] as { embeds: { title: string; description: string; url: string; color: number }[] };
      expect(payload).not.toHaveProperty("content");
      expect(payload).toMatchObject({ embeds: [{ author: { name: categories[index] } }] });
      expect(payload).not.toHaveProperty("avatar_url");
      expect(payload).not.toHaveProperty("username");
      expect(payload).toMatchObject({ embeds: [{ title: item.title, description: `${item.body}\n\n[${item.action}](<https://clansync.example/games/overwatch/clan/clan${item.target}>)`, color: 0x43b581 }], allowed_mentions: { parse: [] }, nonce: `nonce-${index}`, enforce_nonce: true });
      expect(payload.embeds[0].url).toContain(item.target);
    }
  } finally {
    globalThis.fetch = original;
    if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token;
  }
});

test("room cards distinguish kind and current status with accurate reservation timing", () => {
  for (const room_kind of ["regular", "flash"]) {
    const row = { ...base, room_id: "room", room_kind, title: "함께합니다", slot_kind: "room_t_minus_10min" };
    for (const room_status of ["scheduled", "open"]) {
      const card = buildDiscordBotMessage({ ...row, room_status, start_at: "2026-10-12T10:05:00Z" }, options).embeds![0];
      expect(card.author.name).toBe(room_kind === "regular" ? "⚔️ 정규 내전" : "⚡ 깜짝 내전");
      expect(card.title).toBe(`함께합니다 · ${room_status === "open" ? "시작되었습니다" : "곧 시작됩니다"}`);
      expect(card.description).toContain(room_status === "open" ? "진행 중 · 지금 입장할 수 있습니다" : "오늘 19:05 · 시작 5분 전");
      expect(card.description).not.toContain("10분 전");
    }
    const overdue = buildDiscordBotMessage({ ...row, room_status: "scheduled", start_at: "2026-10-12T09:59:00Z" }, options).embeds![0];
    expect(overdue.description).toContain("시작 예정");
    expect(overdue.description).not.toContain("분 전");
  }
});

test("long Korean notices retain a complete hyperlink within Discord embed limits", () => {
  const message = buildDiscordBotMessage({ ...base, notice_id: "notice", title: "공지 제목", slot_kind: "notice_created", notice_content: "긴 본문😀".repeat(4000) }, options);
  const embed = message.embeds![0];
  expect(embed.description.length).toBeLessThanOrEqual(4096);
  expect(embed.description).toContain("…\n\n[공지 읽기](<https://clansync.example/games/overwatch/clan/clan/board/notices/notice>)");
  expect(embed.description).not.toContain("\uFFFD");
  expect(embed.author.name.length + embed.title.length + embed.description.length).toBeLessThanOrEqual(6000);
});

test("repeated calendar occurrences use Korean dates and keep the exact occurrence link", () => {
  const row = { ...base, event_id: "repeated", title: "자정 일정", slot_kind: "event_t_minus_10min", start_at: "2026-10-12T15:00:00Z" };
  const embed = buildDiscordBotMessage(row, options).embeds![0];
  expect(embed.description).toContain("10월 13일 00:00 · 시작 10분 전");
  expect(new URL(embed.url).searchParams.get("at")).toBe(row.start_at);
  expect(buildDiscordBotMessage(row, { ...options, now: new Date("2026-10-12T15:01:00Z") }).embeds![0].description).toContain("오늘 00:00");
  expect(() => buildDiscordBotMessage(row, { siteUrl: "javascript:alert(1)" })).toThrow("Invalid Discord notification site URL");
});
