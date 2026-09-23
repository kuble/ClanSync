import { expect, test } from "@playwright/test";
import { safeNextPath } from "../src/lib/auth/safe-next-path";
import { isDiscordWebhookUrl, postDiscordWebhook } from "../src/lib/notifications/discord-webhook";
import { dispatchDiscordPollNotifications } from "../src/lib/notifications/dispatch-discord-poll-notifications";
import { expandClanEventsForMonth, expandClanEventsForLocalCalendarMonth, isOccurrenceValidForTemplate, type ClanEventRecord } from "../src/lib/clan/expand-clan-event-occurrences";
import { activeLobbyRooms } from "../src/lib/balance/lobby-rooms";

test("redirects reject authority confusion and preserve internal links", () => {
  for (const path of ["//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/\tevil.test", "https://evil.test", "/a/..//evil.test", "/%0aevil.test"]) expect(safeNextPath(path)).toBe("/games");
  for (const path of ["/games", "/games/overwatch?room=123#players", "/games?q=https%3A%2F%2Fexample.com"]) expect(safeNextPath(path)).toBe(path);
});

test("Discord sinks reject stored unsafe URLs and redirects; failed jobs finalize", async () => {
  const valid = "https://discord.com/api/webhooks/123456/token_abc-DEF";
  for (const url of ["http://127.0.0.1/a", "https://discord.com.evil.test/api/webhooks/1/x", "https://discord.com/api/webhooks/../x", "https://discord.com/api/webhooks/1/x?next=http://localhost", valid + "\n"]) expect(isDiscordWebhookUrl(url)).toBe(false);
  const original = global.fetch;
  const calls: RequestInit[] = [];
  global.fetch = async (_url, init) => { calls.push(init!); return new Response(null, { status: 204 }); };
  try {
    await expect(postDiscordWebhook("http://127.0.0.1/secret", "test")).rejects.toThrow();
    expect(calls).toHaveLength(0);
    await postDiscordWebhook(valid, "test");
    expect(calls[0].redirect).toBe("error");
    const finalized: unknown[] = [];
    const client = { rpc: async (name: string, args: unknown) => {
      if (name === "claim_discord_poll_notification_batch") return { data: [{ log_id: "log", clan_id: "clan", game_slug: "overwatch", webhook_url: "http://localhost/private" }], error: null };
      finalized.push(args); return { data: null, error: null };
    } } as unknown as Parameters<typeof dispatchDiscordPollNotifications>[0];
    expect(await dispatchDiscordPollNotifications(client, 1)).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(finalized).toEqual([{ p_log_id: "log", p_ok: false, p_error: "Discord 웹훅 전송 실패" }]);
    expect(calls).toHaveLength(1);
  } finally { global.fetch = original; }
});

test("Korean weekly/monthly instances survive UTC, KST and DST host timezones", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "Asia/Seoul", "America/Los_Angeles"]) {
      process.env.TZ = zone;
      const event: ClanEventRecord = { id: "event", title: "repeat", kind: "intra", source: "manual", place: null,
        start_at: "2026-09-30T15:30:17.125Z", repeat: "weekly", repeat_weekdays: [4], repeat_time: "15:30:00" };
      const occurrences = expandClanEventsForMonth([event], 2026, 9);
      expect(occurrences[0].displayAt.toISOString()).toBe(event.start_at);
      expect(occurrences[1].displayAt.toISOString()).toBe("2026-10-07T15:30:17.125Z");
      expect(isOccurrenceValidForTemplate(event, Date.parse(event.start_at))).toBe(true);
      const localAnchor = new Date(event.start_at);
      expect(expandClanEventsForLocalCalendarMonth([event], localAnchor.getFullYear(), localAnchor.getMonth())
        .some(o => o.instanceIdx === localAnchor.getTime())).toBe(true);
      expect(expandClanEventsForMonth([{ ...event, repeat: "monthly" }], 2026, 10)[0].displayAt.toISOString()).toBe("2026-10-31T15:30:17.125Z");
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test("every overlapping open recurrence remains reachable", () => {
  const rows = ["open", "open", "scheduled"].map((status, i) => ({ id: String(i), kind: "regular" as const, status, schedule_id: "weekly", scheduled_at: `2026-09-${20 + i}T00:00:00Z` }));
  expect(activeLobbyRooms(rows).map(r => r.id)).toEqual(["0", "1"]);
  expect(activeLobbyRooms(rows.slice(2)).map(r => r.id)).toEqual(["2"]);
});
