import { expect, test, type Locator } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function chooseTime(dialog: Locator, hour: string, minute: string) {
  for (const [label, value] of [["시", hour], ["분", minute]]) {
    await dialog.getByRole("listbox", { name: label, exact: true }).getByRole("option", { name: value, exact: true }).click();
  }
}

async function expectFixedActions(dialog: Locator, action: string) {
  const title = dialog.getByRole("heading"), button = dialog.getByRole("button", { name: action, exact: true });
  const before = [await title.boundingBox(), await button.boundingBox()];
  const body = dialog.locator("form > fieldset");
  await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect.poll(async () => Math.round((await title.boundingBox())!.y)).toBe(Math.round(before[0]!.y));
  expect(Math.round((await button.boundingBox())!.y)).toBe(Math.round(before[1]!.y));
  await expect(button).toBeInViewport();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const timezoneId of ["UTC", "America/Los_Angeles"]) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId, viewport: { width: 390, height: 720 } });
    test("event sheets keep actions visible and save Korean dates and recurrence across timezones", async ({ page }) => {
      test.setTimeout(150_000);
      const f = await createIsolatedBalanceFixture(1);
      const day = `${new Date().toISOString().slice(0, 7)}-15`;
      const isoWeekday = new Date(`${day}T00:00:00Z`).getUTCDay() || 7;
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await loginIsolatedBalanceUser(page, f.users[0]);
        const path = f.path.replace(/balance$/, "events");
        await page.goto(path);
        await page.getByRole("grid", { name: "월간 캘린더" }).locator(`[data-date="${day}"]`).click();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "일정 등록", exact: true }).click();
        const create = page.getByRole("dialog", { name: "일정 등록", exact: true });
        await create.getByLabel("제목", { exact: true }).fill("한국 시간 반복 일정");
        await create.getByLabel("반복", { exact: true }).selectOption("weekly");
        await create.locator(`input[name="repeat_weekday"][value="${isoWeekday}"]`).check();
        await chooseTime(create, "00", "15");
        await expect(create.getByRole("group", { name: "시작 날짜·시각 (한국 시간)", exact: true })).toBeVisible();
        await expect(create.getByRole("listbox", { name: "초", exact: true })).toHaveCount(0);
        await expectFixedActions(create, "등록");
        await page.screenshot({ path: test.info().outputPath("event-create-mobile.png") });
        await create.getByRole("button", { name: "등록", exact: true }).click();
        await expect(create).toBeHidden();
        let result = await f.service.from("clan_events").select("id,start_at,repeat,repeat_weekdays,repeat_time").eq("clan_id", f.clanId).single();
        expect(result.error).toBeNull();
        expect(new Date(result.data!.start_at).toISOString()).toBe(new Date(`${day}T00:15:00+09:00`).toISOString());
        expect(result.data).toMatchObject({ repeat: "weekly", repeat_weekdays: [isoWeekday], repeat_time: "00:15:00" });
        const event = result.data!;
        await page.goto(`${path}?event=${event.id}&at=${encodeURIComponent(event.start_at)}`);
        const detail = page.getByRole("dialog", { name: "이벤트 · 한국 시간 반복 일정", exact: true });
        await detail.getByRole("button", { name: "편집", exact: true }).click();
        const edit = page.getByRole("dialog", { name: "일정 편집", exact: true });
        await expect(edit.getByRole("listbox", { name: "시", exact: true }).getByRole("option", { selected: true })).toHaveText("00");
        await expect(edit.getByRole("listbox", { name: "분", exact: true }).getByRole("option", { selected: true })).toHaveText("15");
        await expect(edit.locator(`input[name="repeat_weekday"][value="${isoWeekday}"]`)).toBeChecked();
        await edit.getByLabel("반복", { exact: true }).selectOption("monthly");
        await chooseTime(edit, "23", "45");
        await expectFixedActions(edit, "저장");
        await page.screenshot({ path: test.info().outputPath("event-edit-mobile.png") });
        await edit.getByRole("button", { name: "저장", exact: true }).click();
        await expect(edit).toBeHidden();
        result = await f.service.from("clan_events").select("id,start_at,repeat,repeat_weekdays,repeat_time").eq("id", event.id).single();
        expect(result.error).toBeNull();
        expect(new Date(result.data!.start_at).toISOString()).toBe(new Date(`${day}T23:45:00+09:00`).toISOString());
        expect(result.data).toMatchObject({ repeat: "monthly", repeat_weekdays: null, repeat_time: "23:45:00" });
        expect(errors).toEqual([]);
      } finally { await f.cleanup(); }
    });
  });
}

test("management cards, stats switches and lobby remain usable at desktop and mobile widths", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    const room = await f.service.from("balance_rooms").insert({
      clan_id: f.clanId, game_id: f.gameId, created_by: f.users[0].id,
      kind: "flash", title: "긴 내전 제목과 참여 상태 확인", status: "scheduled",
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      rsvp_opens_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(room.error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1304, height: 884 });
    await page.goto(f.path);
    const create = page.getByRole("button", { name: "내전 만들기", exact: true });
    await expect(create).toHaveText("내전 만들기");
    await create.click();
    const roomDialog = page.getByRole("dialog", { name: "내전 만들기", exact: true });
    await expect(roomDialog).toBeVisible();
    await roomDialog.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(roomDialog).toBeHidden();
    for (const width of [1304, 390, 320]) {
      await page.setViewportSize({ width, height: 884 });
      const row = page.getByTestId("balance-lobby-room").first();
      await expect(row).toBeVisible();
      expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await row.locator("time").evaluate((el) => getComputedStyle(el).fontSize)).toBe("12px");
      const participation = row.getByRole("button", { name: /^참여( 취소)?$/ });
      await expect(participation).toBeDisabled();
      await expect(participation).toBeInViewport();
      await page.screenshot({ path: test.info().outputPath(`lobby-${width}.png`) });
    }
    await page.setViewportSize({ width: 1304, height: 884 });
    await page.goto(f.path.replace(/balance$/, "manage?tab=subscription"));
    const plan = page.locator("section").filter({ has: page.getByRole("heading", { name: "구독·플랜", exact: true }) }).last();
    await expect(plan).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("subscription-card.png") });
    await page.goto(f.path.replace(/balance$/, "stats"));
    await page.getByRole("button", { name: "명예의 전당 설정", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "명예의 전당 설정", exact: true });
    const toggle = dialog.getByRole("switch", { name: /명예의 전당을 클랜 프로필에 공개/ });
    await toggle.check();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect((await f.service.from("clan_settings").select("expose_hof").eq("clan_id", f.clanId).single()).data?.expose_hof).toBe(true);
    await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
    await page.getByRole("button", { name: "개인 기록 설정", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "개인 기록 설정", exact: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog.getByRole("region", { name: "공개할 통계", exact: true })).toBeVisible();
    await expect.poll(async () => (await dialog.boundingBox())!.x).toBe(0);
    await expect.poll(async () => await dialog.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await page.screenshot({ path: test.info().outputPath("personal-settings-mobile.png") });
    await page.keyboard.press("Escape");
  } finally { await f.cleanup(); }
});
