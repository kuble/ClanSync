import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, createAndEnterBalanceRoom, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { mkdir } from "node:fs/promises";
import { readDiscordNotificationRoutes } from "../src/lib/clan/discord-notification-settings";
import { buildDiscordBotMessage, dispatchDiscordBotNotifications } from "../src/lib/notifications/dispatch-discord-bot-notifications";

const guild = "123456789012345678", channel = "234567890123456789", other = "345678901234567890";
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const result = await query; expect(result.error, JSON.stringify(result.error)).toBeNull(); return result.data as NonNullable<T>;
}

test("five routes: role checks, room timing/reschedule/cancel, notices once, poll closure, live recheck and channel reset", async () => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const original = globalThis.fetch, token = process.env.DISCORD_BOT_TOKEN;
  try {
    const routes = readDiscordNotificationRoutes(null);
    routes.flash.channel_id = other;
    const prefs = { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_channel_id: channel, p_channel_name: "기본", p_enabled: true, p_kakao: false, p_routes: routes };
    await ok(f.service.rpc("connect_clan_discord_bot", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_guild_name: "QA Discord" }));
    const member = await f.memberClient(1);
    expect((await member.rpc("set_clan_discord_notification_preferences", prefs)).error).not.toBeNull();
    expect((await f.service.rpc("set_clan_discord_notification_preferences", { ...prefs, p_actor_id: f.users[1].id })).error?.code).toBe("42501");
    expect((await f.service.rpc("set_clan_discord_notification_preferences", { ...prefs, p_routes: { ...routes, invalid: {} } })).error).not.toBeNull();
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    const leader = await f.memberClient(0);
    const future = new Date(Date.now()+3_600_000).toISOString();
    const regular = await ok(leader.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "regular", p_title: "정규 알림", p_scheduled_at: future })) as { room_id: string };
    const roomLogs = () => ok(f.service.from("notification_log").select("*").eq("room_id", regular.room_id));
    expect(new Date((await roomLogs())[0].scheduled_at).getTime()).toBe(new Date(future).getTime()-600_000);
    const moved = new Date(Date.now()+7_200_000).toISOString();
    await ok(leader.rpc("update_balance_room", { p_clan_id: f.clanId, p_room_id: regular.room_id, p_title: "시간 변경", p_scheduled_at: moved }));
    expect(await roomLogs()).toHaveLength(1);
    expect(new Date((await roomLogs())[0].scheduled_at).getTime()).toBe(new Date(moved).getTime()-600_000);
    await ok(leader.rpc("cancel_balance_room", { p_clan_id: f.clanId, p_room_id: regular.room_id }));
    expect((await roomLogs())[0].status).toBe("cancelled");
    const flash = await ok(leader.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "flash", p_title: "지금 깜내" })) as { room_id: string };
    const notice = await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, title: "새 공지", content: "공지 본문", created_by: f.users[0].id }).select("id").single());
    await ok(f.service.from("clan_notices").update({ title: "수정 공지", is_pinned: true }).eq("id", notice.id));
    expect(await ok(f.service.from("notification_log").select("id").eq("notice_id", notice.id))).toHaveLength(1);
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "투표", deadline_at: future, created_by: f.users[0].id }).select("id").single());
    await ok(f.service.from("poll_options").insert([{ poll_id: poll.id, label: "토요일", sort_order: 0 }, { poll_id: poll.id, label: "일요일", sort_order: 1 }]));
    const claim = () => ok(f.service.rpc("claim_discord_bot_notification_batch", { p_limit: 100, p_clan_id: f.clanId }));
    const batches = (await Promise.all([claim(),claim()])).flat() as { log_id: string; room_id: string | null; channel_id: string; attempt_count: number }[];
    expect(batches).toHaveLength(3); expect(new Set(batches.map((row) => row.log_id)).size).toBe(3);
    const flashed = batches.find((row) => row.room_id === flash.room_id)!;
    expect(flashed).toMatchObject({ channel_id: other, attempt_count: 1 });
    routes.flash.enabled = false;
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    expect(await ok(f.service.rpc("recheck_clan_discord_notification", { p_log_id: flashed.log_id, p_attempt: 1 }))).toBeNull();
    for (const row of batches.filter((row) => row.room_id !== flash.room_id)) await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: row.log_id, p_ok: true, p_error: "" }));
    await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", poll.id));
    await ok(f.service.rpc("maint_cancel_poll_notifications_past_deadline"));
    const ended = await claim() as { log_id: string; slot_kind: string }[];
    expect(ended).toHaveLength(1); expect(ended[0].slot_kind).toBe("poll_ended");
    await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: ended[0].log_id, p_ok: true, p_error: "" }));
    await ok(f.service.from("clan_polls").update({ title: "종료 후 수정" }).eq("id", poll.id));
    expect(await claim()).toEqual([]);
    // Re-enabling a kind cannot replay an already-due message from its disabled period.
    routes.flash.enabled = true;
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    expect(await claim()).toEqual([]);
    // The sender uses the current destination and exact notice link, not a claimed stale channel.
    const freshNotice = await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, title: "전송 검증", content: "본문", created_by: f.users[0].id }).select("id").single());
    routes.announcements.channel_id = other;
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    let sent = 0;
    process.env.DISCORD_BOT_TOKEN = "isolated-test-token";
    globalThis.fetch = async (url, init) => {
      if (!String(url).startsWith("https://discord.com/")) return original(url, init);
      expect(String(url)).toContain(`/channels/${other}/messages`);
      expect(JSON.parse(String(init?.body)).content).toContain(`?notice=${freshNotice.id}`);
      sent++; return Response.json({ id: "mock-message" });
    };
    expect(await dispatchDiscordBotNotifications(f.service, 100, undefined, f.clanId)).toMatchObject({ sent: 1, failed: 0 });
    expect(sent).toBe(1);
    await ok(f.service.rpc("connect_clan_discord_bot", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: other, p_guild_name: "다른 서버" }));
    expect((await ok(f.service.from("clan_settings").select("event_notify").eq("clan_id", f.clanId).single())).event_notify).not.toHaveProperty("discord_routes");
    await ok(f.service.from("clans").update({ subscription_tier: "free" }).eq("id", f.clanId));
    expect((await f.service.rpc("set_clan_discord_notification_preferences", prefs)).error?.code).toBe("42501");
  } finally { globalThis.fetch = original; if (token === undefined) delete process.env.DISCORD_BOT_TOKEN; else process.env.DISCORD_BOT_TOKEN = token; await f.cleanup(); }
});

test("new clan success offers optional Discord setup and skip", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  let newClanId: string | undefined;
  try {
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto("/games/overwatch/clan");
    await page.getByRole("tab", { name: "클랜 생성", exact: true }).click();
    await page.getByLabel("클랜명 *").fill(`알림온보딩-${f.clanId.slice(0,8)}`);
    await page.getByRole("button", { name: "클랜 만들기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "클랜을 만들었어요" })).toBeVisible();
    newClanId = (await ok(f.service.from("clan_members").select("clan_id").eq("user_id", f.users[1].id).eq("status", "active").single())).clan_id;
    await expect(page.getByRole("region", { name: "Discord 활용 갤러리" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discord 알림 설정" })).toBeVisible();
    await page.getByRole("link", { name: "나중에", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/clan/${newClanId}$`));
  } finally {
    if (!newClanId) newClanId = (await f.service.from("clan_members").select("clan_id").eq("user_id", f.users[1].id).eq("status", "active").maybeSingle()).data?.clan_id;
    if (newClanId && newClanId !== f.clanId) await ok(f.service.from("clans").delete().eq("id", newClanId));
    await f.cleanup();
  }
});

test("settings: leader saves kinds while bot is unavailable; officers read, members cannot manage; gallery works on mobile", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3), officerContext = await browser.newContext();
  try {
    const prefs = { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_channel_id: channel, p_channel_name: "기본", p_enabled: true, p_kakao: false, p_routes: readDiscordNotificationRoutes(null) };
    await ok(f.service.rpc("connect_clan_discord_bot", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_guild_name: "QA Discord" }));
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    await loginIsolatedBalanceUser(page, f.users[0]);
    const path = f.path.replace(/balance$/, "manage?tab=notifications");
    await page.goto(path);
    await page.getByRole("switch", { name: "Discord 알림 사용", exact: true }).uncheck();
    await page.getByRole("switch", { name: "깜짝 내전 알림", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "종료·결과 알림", exact: true }).uncheck();
    await page.getByRole("button", { name: "설정 저장", exact: true }).click();
    await expect(page.getByText("알림 설정을 저장했습니다.", { exact: true })).toBeVisible();
    const settings = (await ok(f.service.from("clan_settings").select("event_notify").eq("clan_id", f.clanId).single())).event_notify;
    expect(settings).toMatchObject({ discord_enabled: false, discord_routes: { flash: { enabled: false }, polls: { ended: false } } });
    await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    const officer = await officerContext.newPage(); await loginIsolatedBalanceUser(officer, f.users[1]); await officer.goto(path);
    await expect(officer.getByRole("switch", { name: "정규 내전 알림", exact: true })).toBeDisabled();
    await expect(officer.getByRole("button", { name: "설정 저장", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText("Discord 활용 예시", { exact: true }).click();
    await page.getByRole("button", { name: "함께할 일정을 놓치지 않도록", exact: true }).click();
    await page.getByRole("button", { name: "캘린더 화면 크게 보기", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("dialog", { name: "캘린더 화면" })).toBeVisible();
    await expect.poll(() => page.getByRole("dialog").getByRole("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await officerContext.clearCookies(); await loginIsolatedBalanceUser(officer, f.users[2]); await officer.goto(path);
    await expect(officer.getByTestId("clan-event-notify-settings")).toHaveCount(0);
  } finally { await officerContext.close(); await f.cleanup(); }
});

test("capture actual QA screens for the Discord benefits gallery", async ({ page }) => {
  test.skip(process.env.DISCORD_GALLERY_CAPTURE !== "1", "One-time artifact capture; isolated QA fixtures only");
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(4);
  try {
    await page.setViewportSize({ width: 1304, height: 884 });
    await ok(f.service.from("clans").update({ name: "ClanSync 데모 클랜", rules: "서로 존중하고 즐겁게 플레이해요." }).eq("id", f.clanId));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await createAndEnterBalanceRoom(page, f.path, "토요일 정규 내전");
    const panel = page.getByTestId("clan-balance-session-panel"), candidates = panel.getByRole("region", { name: "참가 가능 클랜원" });
    for (const user of f.users) await candidates.getByRole("button", { name: `${user.nickname} 출전 명단에 추가`, exact: true }).click();
    await mkdir("public/images/discord", { recursive: true });
    const capture = (image: string) => page.screenshot({ path: `public/images/discord/${image}.jpg`, type: "jpeg", quality: 85, clip: { x: 80, y: 75, width: 1210, height: 756 } });
    await capture("balance");
    const now = new Date(), friday = new Date(now); friday.setUTCDate(friday.getUTCDate()+((5-friday.getUTCDay()+7)%7)); friday.setUTCHours(12,0,0,0);
    const event = await ok(f.service.from("clan_events").insert({ clan_id: f.clanId, title: "수요 듀오 연습회", kind: "event", start_at: friday.toISOString(), repeat: "weekly", repeat_weekdays: [3], repeat_time: "20:00:00", place: "Discord · 자유 플레이 채널", created_by: f.users[0].id }).select("id").single());
    await ok(f.service.from("clan_events").insert({ clan_id: f.clanId, title: "토요 정규 내전", kind: "intra", start_at: friday.toISOString(), repeat: "weekly", repeat_weekdays: [6], repeat_time: "21:00:00", created_by: f.users[0].id }));
    const wednesday = new Date(friday); wednesday.setUTCDate(wednesday.getUTCDate()+5); wednesday.setUTCHours(11,0,0,0);
    await page.goto(`${f.path.replace(/balance$/, "events")}?event=${event.id}&at=${encodeURIComponent(wednesday.toISOString())}`);
    await expect(page.getByRole("tab", { name: "캘린더", exact: true })).toBeVisible();
    await expect(page.getByText("수요 듀오 연습회", { exact: true }).first()).toBeVisible();
    await capture("calendar");
    const notice = await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, title: "이번 주 내전 운영 안내", content: "토요일 21시에 정규 내전이 열립니다.\n\n시작 10분 전에 Discord에 입장 링크가 올라와요. 참가하실 분은 미리 참석 응답을 남겨 주세요.\n\n함께 즐거운 내전을 만들어 봐요!", is_pinned: true, created_by: f.users[0].id }).select("id").single());
    await page.goto(`${f.path.replace(/\/balance$/, "")}?notice=${notice.id}`);
    await expect(page.getByRole("dialog", { name: "이번 주 내전 운영 안내" })).toBeVisible();
    await capture("notices");
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "다음 내전 시간 투표", deadline_at: new Date(Date.now()+86_400_000).toISOString(), created_by: f.users[0].id }).select("id").single());
    const options = await ok(f.service.from("poll_options").insert([{ poll_id: poll.id, label: "토요일 오후 9시", sort_order: 0 }, { poll_id: poll.id, label: "일요일 오후 8시", sort_order: 1 }]).select("id"));
    await ok(f.service.from("poll_votes").insert(f.users.map((user,index) => ({ poll_id: poll.id, option_id: options[index === 3 ? 1 : 0].id, user_id: user.id }))));
    await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", poll.id));
    await page.goto(`${f.path.replace(/balance$/, "events")}?tab=polls&poll=${poll.id}`);
    await expect(page.locator(`#poll-${poll.id}`)).toBeFocused();
    await capture("polls");
    expect(event.id).toBeTruthy();
  } finally { await f.cleanup(); }
});

test("off periods skip past notices/closures, restore future reservations; matching calendar and room use one reminder", async () => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    const routes = readDiscordNotificationRoutes(null);
    const prefs = { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_channel_id: channel, p_channel_name: "기본", p_enabled: true, p_kakao: false, p_routes: routes };
    await ok(f.service.rpc("connect_clan_discord_bot", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: guild, p_guild_name: "QA" }));
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    const start = new Date(Date.now()+3_600_000).toISOString(), leader = await f.memberClient(0);
    const room = await ok(leader.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "regular", p_title: "일치 내전", p_scheduled_at: start })) as { room_id: string };
    const event = await ok(f.service.from("clan_events").insert({ clan_id: f.clanId, title: "일치 내전", kind: "intra", start_at: start, created_by: f.users[0].id, discord_notify: { enabled: true, announce: false, slots: ["event_t_minus_10min"] } }).select("id").single());
    await ok(f.service.from("notification_log").insert({ event_id: event.id, recipient_user_id: f.users[0].id, channel: "discord", slot_kind: "event_t_minus_10min", scheduled_at: new Date().toISOString(), dedup_key: `test-${event.id}` }));
    await ok(f.service.from("notification_log").update({ scheduled_at: new Date().toISOString() }).eq("room_id", room.room_id));
    const claim = () => ok(f.service.rpc("claim_discord_bot_notification_batch", { p_limit: 100, p_clan_id: f.clanId }));
    const rows = await claim() as { log_id: string; room_id: string | null }[];
    expect(rows).toHaveLength(1); expect(rows[0].room_id).toBe(room.room_id);
    await ok(f.service.rpc("finalize_discord_bot_notification", { p_log_id: rows[0].log_id, p_ok: true, p_error: "" }));
    await ok(f.service.rpc("set_clan_discord_notification_preferences", { ...prefs, p_enabled: false }));
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "꺼 둔 투표", deadline_at: start, created_by: f.users[0].id }).select("id").single());
    await ok(f.service.from("poll_options").insert([{ poll_id: poll.id, label: "A", sort_order: 0 }, { poll_id: poll.id, label: "B", sort_order: 1 }]));
    await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", poll.id));
    await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, title: "꺼 둔 공지", content: "본문", created_by: f.users[0].id }));
    const futureRoom = await ok(leader.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "regular", p_title: "복구 예약", p_scheduled_at: start })) as { room_id: string };
    await ok(f.service.rpc("set_clan_discord_notification_preferences", prefs));
    expect(await claim()).toEqual([]);
    expect((await ok(f.service.from("notification_log").select("status").eq("room_id", futureRoom.room_id).single())).status).toBe("scheduled");
    expect((await ok(f.service.from("notification_log").select("status").eq("poll_id", poll.id).eq("slot_kind", "poll_ended").single())).status).toBe("cancelled");
  } finally { await f.cleanup(); }
});

test("notification links survive sign-in/sign-up, game verification and clan approval; exact event, notice, poll and reservation open", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    const member = await f.memberClient(0), start = new Date(Date.now()+172_800_000).toISOString();
    const room = await ok(member.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "regular", p_title: "링크 예약", p_scheduled_at: start })) as { room_id: string };
    const target = `${f.path}?room=${room.room_id}`;
    await page.goto(target);
    expect(new URL(page.url()).searchParams.get("next")).toBe(target);
    await page.getByRole("link", { name: "회원가입", exact: true }).click();
    await page.waitForURL(/\/sign-up\?/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(target);
    await expect(page.locator('input[name="next"]')).toHaveValue(target);
    await page.getByRole("link", { name: "로그인", exact: true }).click();
    await page.waitForURL(/\/sign-in\?/);
    await expect(page.locator('input[name="next"]')).toHaveValue(target);
    await page.getByLabel("이메일").fill(f.users[0].email); await page.getByLabel("비밀번호", { exact: true }).fill(f.users[0].password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "내전 정보" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "내전 정보" }).getByRole("textbox", { name: "내전 이름", exact: true })).toHaveValue("링크 예약");
    await page.keyboard.press("Escape");
    const notice = await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, title: "링크 공지", content: "정확한 공지 본문", created_by: f.users[0].id }).select("id").single());
    await page.goto(`${f.path.replace(/\/balance$/, "")}?notice=${notice.id}`);
    await expect(page.getByRole("dialog", { name: "링크 공지" })).toBeVisible();
    const event = await ok(f.service.from("clan_events").insert({ clan_id: f.clanId, title: "링크 일정", kind: "event", start_at: start, created_by: f.users[0].id }).select("id").single());
    await page.goto(`${f.path.replace(/balance$/, "events")}?event=${event.id}&at=${encodeURIComponent(start)}`);
    await expect(page.getByRole("button", { name: "목록으로" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "이벤트 · 링크 일정", exact: true })).toBeVisible();
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "링크 투표", deadline_at: start, created_by: f.users[0].id }).select("id").single());
    await ok(f.service.from("poll_options").insert([{ poll_id: poll.id, label: "A", sort_order: 0 }, { poll_id: poll.id, label: "B", sort_order: 1 }]));
    await page.goto(`${f.path.replace(/balance$/, "events")}?tab=polls&poll=${poll.id}`);
    await expect(page.locator(`#poll-${poll.id}`)).toBeFocused();
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    await page.goto(target); await expect(page).toHaveURL(/\/clan$/);
    expect((await page.context().cookies()).find((cookie) => cookie.name === "clansync-clan-return")?.value).toContain(room.room_id);
    await ok(f.service.from("clan_members").insert({ clan_id: f.clanId, user_id: f.users[0].id, role: "leader", status: "active" }));
    await page.reload(); await expect(page).toHaveURL(new RegExp(`room=${room.room_id}`));
    expect((await page.context().cookies()).some((cookie) => cookie.name === "clansync-clan-return")).toBe(false);
    await ok(f.service.from("user_game_profiles").update({ is_verified: false }).eq("user_id", f.users[0].id));
    await page.goto(target); await expect(page).toHaveURL(/\/auth\?next=/);
    await ok(f.service.from("user_game_profiles").update({ is_verified: true }).eq("user_id", f.users[0].id));
    await page.reload(); await expect(page).toHaveURL(new RegExp(`room=${room.room_id}`));
    const message = buildDiscordBotMessage({ log_id: "id", poll_id: poll.id, event_id: null, slot_kind: "poll_ended", title: "투표", start_at: null, deadline_at: start, clan_id: f.clanId, game_slug: "overwatch", channel_id: channel });
    expect(message).toContain(`?tab=polls&poll=${poll.id}`);
  } finally { await f.cleanup(); }
});
