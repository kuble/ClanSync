import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { canBotSend, postDiscordBotMessage, verifyDiscordGuildManager } from "../src/lib/notifications/discord-bot";
import { buildDiscordBotMessage, dispatchDiscordBotNotifications } from "../src/lib/notifications/dispatch-discord-bot-notifications";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Database, Json } from "../src/lib/supabase/database.types";

const guild = "123456789012345678", channel = "234567890123456789", bot = "345678901234567890";
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const result = await query; expect(result.error, JSON.stringify(result.error)).toBeNull(); return result.data as NonNullable<T>;
}

test("Discord permission overwrites and server manager verification fail closed", async () => {
  const roles = [{ id: guild, permissions: "3072" }, { id: "role", permissions: "0" }];
  const text = { id: channel, name: "알림", type: 0 };
  expect(canBotSend(guild, bot, ["role"], roles, text)).toBe(true);
  expect(canBotSend(guild, bot, [], roles, { ...text, type: 2 })).toBe(false);
  const deny = { id: guild, type: 0, deny: "2048", allow: "0" };
  expect(canBotSend(guild, bot, [], roles, { ...text, permission_overwrites: [deny] })).toBe(false);
  expect(canBotSend(guild, bot, ["role"], roles, { ...text, permission_overwrites: [deny, { id: "role", type: 0, deny: "0", allow: "2048" }] })).toBe(true);
  expect(canBotSend(guild, bot, ["role"], roles, { ...text, permission_overwrites: [deny, { id: "role", type: 0, deny: "0", allow: "2048" }, { id: bot, type: 1, deny: "1024", allow: "0" }] })).toBe(false);
  expect(canBotSend(guild, bot, [], [{ id: guild, permissions: "8" }], { ...text, permission_overwrites: [deny] })).toBe(true);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json([{ id: guild, owner: false, permissions: "0" }]);
    expect(await verifyDiscordGuildManager("test-bearer", guild)).toBe(false);
    globalThis.fetch = async () => Response.json([{ id: guild, owner: false, permissions: "32" }]);
    expect(await verifyDiscordGuildManager("test-bearer", guild)).toBe(true);
    expect(await verifyDiscordGuildManager("test-bearer", "other")).toBe(false);
  } finally { globalThis.fetch = original; }
});

test("bot sends only to the fixed API, blocks mentions and does not expose failure payloads", async () => {
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  const requests: { url: string; init?: RequestInit }[] = [];
  try {
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (url, init) => { requests.push({ url: String(url), init }); return Response.json({ id: "sent" }); };
    await postDiscordBotMessage(channel, "@everyone test", "repeat-safe");
    expect(requests[0].url).toBe(`https://discord.com/api/v10/channels/${channel}/messages`);
    expect(requests[0].init?.headers).toMatchObject({ Authorization: "Bot isolated-test-token" });
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({ allowed_mentions: { parse: [] }, nonce: "repeat-safe", enforce_nonce: true });
    await expect(postDiscordBotMessage("https://evil.invalid/", "test")).rejects.toThrow("Invalid Discord channel");
    expect(requests).toHaveLength(1);
    globalThis.fetch = async () => new Response("sensitive-response", { status: 429 });
    await expect(postDiscordBotMessage(channel, "test")).rejects.toThrow("Discord HTTP 429");
    expect(buildDiscordBotMessage({ log_id: "test", event_id: "event", poll_id: null, slot_kind: "event_t_minus_1h", title: "일정", start_at: "2026-10-12T11:00:00Z", deadline_at: null, clan_id: "clan", game_slug: "overwatch", channel_id: channel })).toContain("8:00 (한국 시간)");
  } finally { globalThis.fetch = original; if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token; }
});

test("QA bot connection permissions, atomic reminders, retries, channel changes and cancellation", async () => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const env = loadTestEnv(), anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(1);
    const connect = { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_guild_name: "QA Discord" };
    for (const client of [anon, leader, member]) expect((await client.rpc("connect_clan_discord_bot", connect)).error).not.toBeNull();
    expect((await f.service.rpc("connect_clan_discord_bot", { ...connect, p_actor_id: f.users[1].id })).error?.code).toBe("42501");
    await ok(f.service.rpc("connect_clan_discord_bot", connect));
    for (const client of [leader, member]) expect((await client.from("clan_discord_connections").select("*")).error).not.toBeNull();
    const settings = { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_channel_id: channel, p_channel_name: "알림", p_enabled: true, p_kakao: false };
    expect((await f.service.rpc("set_clan_discord_bot_settings", { ...settings, p_guild_id: bot })).error).not.toBeNull();
    await ok(f.service.rpc("set_clan_discord_bot_settings", settings));
    const id = randomUUID(), start = new Date(Date.now() + 172_800_000).toISOString();
    const event: Json = { title: "격리 봇 일정", kind: "event", start_at: start, place: null, repeat: "none", repeat_weekdays: null, repeat_time: null, discord_notify: { enabled: true, announce: true, slots: ["event_t_minus_1h"] } };
    const schedule = ["event_t_minus_1h", "event_t_minus_10min"].map((slot_kind) => ({ instance_idx: 0, slot_kind, scheduled_at: start }));
    const save = (patch: Json = event, create = false, slots: Json = schedule, actor = f.users[0].id) => f.service.rpc("save_manual_clan_event", { p_clan_id: f.clanId, p_actor_id: actor, p_event_id: id, p_event: patch, p_schedule: slots, p_create: create });
    expect((await save(event, true, schedule, f.users[1].id)).error?.code).toBe("42501");
    await ok(save(event, true));
    const logs = () => ok(f.service.from("notification_log").select("*").eq("event_id", id).eq("channel", "discord"));
    const rows = await logs(); expect(rows.map((row) => row.slot_kind).sort()).toEqual(["event_created", "event_t_minus_1h"]);
    const reminder = rows.find((row) => row.slot_kind === "event_t_minus_1h")!;
    const created = rows.find((row) => row.slot_kind === "event_created")!;
    expect(await ok(f.service.from("notification_log").select("id").eq("event_id", id).eq("channel", "inapp"))).toHaveLength(4);
    const changed = { ...event as object, title: "변경 성공" } as Json;
    expect((await save(changed, false, [{ instance_idx: 0, slot_kind: "poll_created", scheduled_at: start }])).error).not.toBeNull();
    expect((await ok(f.service.from("clan_events").select("title").eq("id", id).single())).title).toBe("격리 봇 일정");
    await ok(save(changed));
    await ok(f.service.from("notification_log").update({ scheduled_at: new Date(Date.now() - 1_000).toISOString() }).eq("id", reminder.id));
    const claim = () => ok(f.service.rpc("claim_discord_bot_notification_batch", { p_limit: 20, p_event_id: id }));
    const batches = await Promise.all([claim(), claim()]);
    const claimed = batches.flat() as { log_id: string }[];
    expect(claimed).toHaveLength(3); expect(new Set(claimed.map((row) => row.log_id)).size).toBe(3);
    await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: created.id, p_ok: false, p_error: "test failure" }));
    expect((await logs()).find((row) => row.id === created.id)).toMatchObject({ status: "scheduled", attempt_count: 1 });
    await ok(f.service.from("notification_log").update({ status: "processing", attempt_count: 5 }).eq("id", created.id));
    await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: created.id, p_ok: false, p_error: "test failure" }));
    expect((await logs()).find((row) => row.id === created.id)?.status).toBe("dlq");
    await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: reminder.id, p_ok: true, p_error: "" }));
    await ok(save(changed));
    expect((await logs()).find((row) => row.id === reminder.id)?.status).toBe("sent");
    await ok(f.service.rpc("set_clan_discord_bot_settings", { ...settings, p_enabled: false }));
    expect(await claim()).toEqual([]);
    const second = randomUUID();
    await ok(f.service.rpc("save_manual_clan_event", { p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_event_id: second, p_event: event, p_schedule: schedule, p_create: true }));
    await ok(f.service.rpc("set_clan_discord_bot_settings", { ...settings, p_channel_id: bot, p_channel_name: "새 알림" }));
    const newReminder = await ok(f.service.from("notification_log").select("id").eq("event_id", second).eq("channel", "discord").single());
    await ok(f.service.from("notification_log").update({ scheduled_at: new Date(Date.now() - 1_000).toISOString() }).eq("id", newReminder.id));
    const moved = await ok(f.service.rpc("claim_discord_bot_notification_batch", { p_limit: 10, p_event_id: second })) as { channel_id: string }[];
    expect(moved[0].channel_id).toBe(bot);
    // The worker sends through a mock Discord API; real QA DB fetches are retained.
    await ok(f.service.from("notification_log").update({ status: "scheduled", attempt_count: 0 }).eq("id", newReminder.id));
    let sends = 0;
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (url, init) => String(url).startsWith("https://discord.com/") ? (sends++, Response.json({ id: "mock-message" })) : original(url, init);
    expect(await dispatchDiscordBotNotifications(f.service, 10, second)).toMatchObject({ sent: 1, failed: 0 });
    expect(sends).toBe(1);
    await ok(save({ ...changed as object, title: "또 변경" }));
    await ok(f.service.from("clan_events").update({ cancelled_at: new Date().toISOString() }).eq("id", id));
    expect((await logs()).filter((row) => ["scheduled", "processing"].includes(row.status))).toHaveLength(0);
    expect(await claim()).toEqual([]);
    await ok(f.service.from("clans").update({ subscription_tier: "free" }).eq("id", f.clanId));
    expect((await f.service.rpc("connect_clan_discord_bot", connect)).error?.code).toBe("42501");
  } finally { globalThis.fetch = original; if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token; await f.cleanup(); }
});

test("events UI: settings icon, registration notification fields, local time and OAuth denials", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2), memberContext = await browser.newContext();
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    const path = f.path.replace(/balance$/, "events");
    await page.goto(path);
    await expect(page.getByText("함께할 다음 약속.", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "오늘", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "알림 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "알림 설정" });
    await expect(settings.getByRole("button", { name: "Discord 알림 추가" })).toBeDisabled();
    await expect(settings.getByText("웹훅 URL")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "일정 등록" });
    await expect(dialog.getByRole("checkbox", { name: "Discord 알림", exact: true })).toBeDisabled();
    await dialog.getByLabel("제목", { exact: true }).fill("격리 UI 일정");
    // Browser timezone is UTC here; convert local wall time into its explicit UTC instant.
    const instant = new Date(Date.now() + 172_800_000); instant.setSeconds(0, 0);
    const local = await page.evaluate((iso) => { const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }, instant.toISOString());
    await dialog.getByLabel("시작 (로컬 시각)").fill(local);
    await dialog.getByRole("button", { name: "등록", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const event = await ok(f.service.from("clan_events").select("start_at,discord_notify").eq("clan_id", f.clanId).single());
    expect(new Date(event.start_at).toISOString()).toBe(instant.toISOString());
    expect(event.discord_notify).toMatchObject({ enabled: false });
    expect((await page.request.get(`/api/discord/callback?state=forged&code=forged`)).status()).toBe(400);
    const memberPage = await memberContext.newPage(); await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await memberPage.goto(path); await expect(memberPage.getByRole("button", { name: "알림 설정", exact: true })).toHaveCount(0);
    expect((await memberPage.request.get(`/api/discord/connect?clanId=${f.clanId}`)).status()).toBe(403);
  } finally { await memberContext.close(); await f.cleanup(); }
});
