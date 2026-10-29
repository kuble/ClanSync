import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { readDiscordNotificationRoutes } from "../src/lib/clan/discord-notification-settings";

test.use({ timezoneId: "Asia/Seoul" });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("예약 생성·상태 필터·시작 전 DB 차단·알림 시각·시작 후 참여", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    await ok(f.service.rpc("connect_clan_discord_bot", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: "123456789012345678", p_guild_name: "예약 검증" }));
    await ok(f.service.rpc("set_clan_discord_notification_preferences", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_guild_id: "123456789012345678", p_channel_id: "234567890123456789", p_channel_name: "투표", p_enabled: true, p_routes: readDiscordNotificationRoutes(null) }));
    await loginIsolatedBalanceUser(page, f.users[0]);
    const path = f.path.replace(/balance$/, "events?tab=polls");
    await page.goto(path);
    await page.getByRole("button", { name: "투표 만들기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "투표 만들기", exact: true });
    await editor.getByLabel("투표 질문", { exact: true }).fill("시작 예약 확인");
    await editor.getByLabel("선택지 1", { exact: true }).fill("금요일");
    await editor.getByLabel("선택지 2", { exact: true }).fill("토요일");
    await editor.getByRole("switch", { name: "시작 예약", exact: true }).check();
    const startField = editor.getByLabel("시작 일시", { exact: true });
    expect((await startField.boundingBox())!.x).toBeGreaterThan((await editor.getByRole("region", { name: "시작 설정", exact: true }).boundingBox())!.x + 12);
    await editor.getByRole("switch", { name: "참여 알림 보내기", exact: true }).check();
    await editor.getByRole("button", { name: "투표 예약하기", exact: true }).click();
    await expect(editor).toBeHidden();
    const poll = await ok(f.service.from("clan_polls").select("id,starts_at,deadline_at").eq("clan_id", f.clanId).single());
    expect(Date.parse(poll.starts_at)).toBeGreaterThan(Date.now());
    const logs = await ok(f.service.from("notification_log").select("slot_kind,channel,scheduled_at").eq("poll_id", poll.id));
    expect(logs.filter((log) => log.channel === "discord" && log.slot_kind === "poll_created")).toHaveLength(1);
    expect(logs.every((log) => Date.parse(log.scheduled_at) >= Date.parse(poll.starts_at))).toBe(true);
    expect(await ok(f.service.rpc("claim_discord_bot_notification_batch", { p_limit: 100, p_clan_id: f.clanId }))).toEqual([]);
    const options = await ok(f.service.from("poll_options").select("id").eq("poll_id", poll.id));
    const member = await f.memberClient(1);
    const vote = () => member.rpc("submit_clan_poll_vote", { p_clan_id: f.clanId, p_poll_id: poll.id, p_option_ids: [options[0].id] });
    expect((await vote()).error?.message).toContain("아직 시작하지 않은 투표");
    await page.getByRole("radio", { name: "예정 투표", exact: true }).click();
    await page.getByRole("button", { name: "시작 예약 확인 시작 예정 보기", exact: true }).click();
    const details = page.getByRole("dialog", { name: "시작 예약 확인", exact: true });
    await expect(details.getByText("시작 시각부터 참여할 수 있습니다.")).toBeVisible();
    await expect(details.getByRole("button", { name: "투표하기", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await ok(f.service.from("clan_polls").update({ starts_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", poll.id));
    await ok(vote());
    await page.reload();
    await page.getByRole("radio", { name: "활성 투표", exact: true }).click();
    await expect(page.getByRole("button", { name: "시작 예약 확인 투표하기", exact: true })).toBeVisible();
    await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", poll.id));
    expect((await vote()).error?.message).toContain("종료된 투표");
    expect((await ok(f.service.from("notification_log").select("status").eq("poll_id", poll.id).eq("slot_kind", "poll_created"))).every((log) => log.status === "cancelled")).toBe(true);
  } finally { await f.cleanup(); }
});

test("익명 투표 참여자의 이름·ID를 서버 응답에 포함하지 않는다", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    const secretName = `anonymous-${f.clanId.slice(0, 8)}`;
    await ok(f.service.from("users").update({ nickname: secretName }).eq("id", f.users[1].id));
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "비공개 참여자", anonymous: true, created_by: f.users[0].id, deadline_at: new Date(Date.now() + 86_400_000).toISOString() }).select("id").single());
    const option = await ok(f.service.from("poll_options").insert([{ poll_id: poll.id, label: "가", sort_order: 0 }, { poll_id: poll.id, label: "나", sort_order: 1 }]).select("id"));
    const member = await f.memberClient(1);
    await ok(member.rpc("submit_clan_poll_vote", { p_clan_id: f.clanId, p_poll_id: poll.id, p_option_ids: [option[0].id] }));
    await loginIsolatedBalanceUser(page, f.users[0]);
    const response = await page.goto(f.path.replace(/balance$/, `events?tab=polls&poll=${poll.id}`));
    const payload = await response!.text();
    expect(payload).not.toContain(secretName);
    expect(payload).not.toContain(f.users[1].id);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "현재 결과 보기", exact: true }).click();
    await expect(page.getByText("익명 투표로 참여자 정보를 표시하지 않습니다.")).toBeVisible();
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id));
    await page.reload();
    await expect(page).toHaveURL(/\/clan(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /클랜에 참여하십시오/ })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally { await f.cleanup(); }
});
