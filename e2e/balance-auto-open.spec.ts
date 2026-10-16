import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const result = await query; expect(result.error, JSON.stringify(result.error)).toBeNull(); return result.data as NonNullable<T>;
}
const after = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

test("automatic room opening honors the clan toggle, lead time, permissions and concurrent workers", async () => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(1);
    const prefs = { p_clan_id: f.clanId, p_enabled: false, p_minutes: 10 };
    const defaults = await ok(f.service.from("clans").select("balance_auto_open_enabled,balance_auto_open_minutes").eq("id", f.clanId).single());
    expect(defaults).toEqual({ balance_auto_open_enabled: true, balance_auto_open_minutes: 10 });
    expect((await member.rpc("update_balance_auto_open_settings", prefs)).error?.code).toBe("42501");
    expect((await member.rpc("materialize_balance_rooms", { p_clan_id: f.clanId })).error).not.toBeNull();
    for (const minutes of [0, 1441]) expect((await leader.rpc("update_balance_auto_open_settings", { ...prefs, p_minutes: minutes })).error).not.toBeNull();
    await ok(leader.rpc("update_balance_auto_open_settings", prefs));
    const create = (minutes: number) => ok(leader.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "flash", p_title: "자동 생성 검증", p_scheduled_at: after(minutes), p_rsvp_opens_at: new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString() })) as Promise<{ room_id: string }>;
    const manual = await create(5), automatic = await create(8), later = await create(15);
    const read = (id: string) => ok(f.service.from("balance_rooms").select("status,series_id").eq("id", id).single());
    const worker = () => ok(f.service.rpc("materialize_balance_rooms", { p_clan_id: f.clanId }));
    await worker(); expect((await read(manual.room_id)).status).toBe("scheduled");
    await ok(leader.rpc("open_balance_room", { p_clan_id: f.clanId, p_room_id: manual.room_id }));
    expect((await read(manual.room_id)).status).toBe("open");
    await ok(leader.rpc("update_balance_auto_open_settings", { ...prefs, p_enabled: true, p_minutes: 3 }));
    await worker(); expect((await read(automatic.room_id)).status).toBe("scheduled");
    await ok(leader.rpc("update_balance_auto_open_settings", { ...prefs, p_enabled: true }));
    await Promise.all([worker(), worker()]);
    expect((await read(automatic.room_id)).status).toBe("open");
    expect((await read(later.room_id)).status).toBe("scheduled");
    expect(await ok(f.service.from("balance_sessions").select("id").eq("series_id", automatic.room_id))).toHaveLength(1);
    expect((await ok(f.service.from("clan_polls").select("closed_at").eq("balance_room_id", automatic.room_id).single())).closed_at).not.toBeNull();
  } finally { await f.cleanup(); }
});

test("automatic opening settings autosave, hide dependent minutes and retain their value", async ({ page }) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "manage?tab=balance"));
    await expect(page.getByRole("switch", { name: "내전 자동 종료", exact: true })).toBeVisible();
    const section = page.getByTestId("balance-auto-open-settings");
    const toggle = section.getByRole("switch", { name: "예약된 내전 자동 생성", exact: true });
    const minutes = section.getByLabel("예약 시각", { exact: true });
    await expect(minutes).toHaveValue("10");
    await minutes.fill("20"); await expect(section.getByText("자동 저장됨", { exact: true })).toBeVisible();
    const settings = () => ok(f.service.from("clans").select("balance_auto_open_enabled,balance_auto_open_minutes").eq("id", f.clanId).single());
    expect(await settings()).toEqual({ balance_auto_open_enabled: true, balance_auto_open_minutes: 20 });
    await minutes.fill("0"); await expect(section.getByRole("alert")).toContainText("1~1440분");
    expect((await settings()).balance_auto_open_minutes).toBe(20);
    await minutes.fill("10"); await expect(section.getByText("자동 저장됨", { exact: true })).toBeVisible();
    await toggle.click(); await expect(minutes).toHaveCount(0);
    await expect.poll(async () => (await settings()).balance_auto_open_enabled).toBe(false);
    await page.reload(); await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click(); await expect(minutes).toHaveValue("10");
    await expect.poll(async () => (await settings()).balance_auto_open_enabled).toBe(true);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 884 });
      expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`automation-${width}.png`) });
    }
    await expect(section.locator(":scope > section").getByRole("status")).toHaveCount(0);
    await expect(section.getByRole("status")).toBeVisible();
  } finally { await f.cleanup(); }
});
