import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "UTC", actionTimeout: 15_000 });

test("calendar: desktop day panel and mobile bottom drawer keep the selected date", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(1);
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-15`;
  const emptyKey = dayKey.replace(/15$/, "16");
  try {
    const { error } = await f.service.from("clan_events").insert([
      { clan_id: f.clanId, created_by: f.users[0].id, title: "오전 일정", start_at: `${dayKey}T09:00:00Z`, kind: "event" },
      { clan_id: f.clanId, created_by: f.users[0].id, title: "오후 일정", start_at: `${dayKey}T17:00:00Z`, kind: "intra" },
    ]);
    expect(error).toBeNull();
    await page.setViewportSize({ width: 1304, height: 884 });
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "events"));
    const calendar = page.getByRole("grid", { name: "월간 캘린더" });
    const panel = page.getByRole("region", { name: "선택한 날짜 일정" });
    const scheduleList = panel.getByRole("list", { name: "날짜별 일정 목록" });
    const day = calendar.locator(`[data-date="${dayKey}"]`);
    await day.click();
    await expect(scheduleList.getByRole("button")).toHaveCount(2);
    await expect(scheduleList.getByRole("button").first()).toContainText("오전 일정");
    const gridBox = await calendar.boundingBox(), panelBox = await panel.boundingBox();
    expect(panelBox!.x).toBeGreaterThanOrEqual(gridBox!.x + gridBox!.width);
    expect(Math.abs(panelBox!.y - gridBox!.y)).toBeLessThan(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await panel.getByRole("button", { name: "이 날짜에 일정 추가" }).click();
    const create = page.getByRole("dialog", { name: "일정 등록" });
    await expect(create.getByLabel("시작 (로컬 시각)")).toHaveValue(`${dayKey}T20:00`);
    await create.getByLabel("제목", { exact: true }).fill("추가 일정");
    await create.getByLabel("시작 (로컬 시각)").fill(`${dayKey}T13:00`);
    await create.getByRole("button", { name: "등록", exact: true }).click();
    await expect(create).not.toBeVisible();
    await expect(scheduleList.getByRole("button")).toHaveCount(3);
    await expect(scheduleList.getByRole("button").nth(1)).toContainText("추가 일정");
    await expect(panel.getByText("3개 일정", { exact: true })).toBeVisible();
    await expect(day).toContainText("+1개 일정");
    const inlineDetail = panel.getByRole("region", { name: "일정 상세" });
    await panel.getByRole("button", { name: /오전 일정/ }).click();
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 오전 일정" })).toBeVisible();
    await expect(panel.getByRole("button", { name: /오전 일정/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await panel.getByRole("button", { name: /오후 일정/ }).click();
    await expect(inlineDetail.getByRole("heading", { name: "내전 · 오후 일정" })).toBeVisible();
    const listBox = await scheduleList.boundingBox();
    expect(listBox!.height).toBeLessThanOrEqual(224);
    await page.screenshot({ path: test.info().outputPath("calendar-multiple-events.png") });
    await inlineDetail.getByRole("button", { name: "편집", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "일정 편집" });
    await expect(edit.getByLabel("제목", { exact: true })).toHaveValue("오후 일정");
    await page.keyboard.press("Escape");
    await expect(edit).not.toBeVisible();
    await panel.getByRole("button", { name: /오전 일정/ }).click();
    await calendar.locator(`[data-date="${emptyKey}"]`).click();
    await expect(inlineDetail).toHaveCount(0);
    await day.click();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).not.toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await day.click();
    const drawer = page.getByRole("dialog", { name: /15일.*일정/ });
    await expect(drawer).toBeVisible();
    await expect.poll(async () => {
      const box = await drawer.boundingBox();
      return Math.abs(box!.y + box!.height - 844);
    }).toBeLessThan(2);
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox!.width).toBe(390);
    await expect(drawer.getByRole("button", { name: /오전 일정/ })).toBeVisible();
    await expect(drawer.getByRole("list", { name: "날짜별 일정 목록" }).getByRole("button")).toHaveCount(3);
    await drawer.getByRole("button", { name: "이 날짜에 일정 추가" }).click();
    await expect(drawer).not.toBeVisible();
    await expect(create).toBeVisible();
    await expect(create.getByLabel("시작 (로컬 시각)")).toHaveValue(`${dayKey}T20:00`);
    await page.keyboard.press("Escape");
    await day.click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await expect(day).toBeFocused();
    await day.press("ArrowRight");
    const emptyDay = calendar.locator(`[data-date="${emptyKey}"]`);
    await expect(emptyDay).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await emptyDay.press("Enter");
    const emptyDrawer = page.getByRole("dialog", { name: /16일.*일정/ });
    await expect(emptyDrawer.getByText("이 날짜에는 등록된 일정이 없습니다.")).toBeVisible();
    await emptyDrawer.getByRole("button", { name: "이 날짜에 일정 추가" }).click();
    await expect(create).toBeVisible();
    await expect(create.getByLabel("시작 (로컬 시각)")).toHaveValue(`${emptyKey}T20:00`);
    await page.keyboard.press("Escape");

    await day.click();
    await drawer.getByRole("button", { name: /오전 일정/ }).click();
    const detail = page.getByRole("dialog", { name: "이벤트 · 오전 일정" });
    await expect(detail).toBeVisible();
    await expect(drawer).not.toBeVisible();
    await expect.poll(async () => {
      const box = await detail.boundingBox();
      return Math.abs(box!.y + box!.height - 844);
    }).toBeLessThan(2);
    expect((await detail.boundingBox())!.width).toBe(390);
    await page.setViewportSize({ width: 1304, height: 884 });
    await expect(detail).not.toBeVisible();
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 오전 일정" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(detail).toBeVisible();
    await page.keyboard.press("Escape");
    await day.click();
    await expect(drawer).toBeVisible();
    await page.setViewportSize({ width: 1304, height: 884 });
    await expect(drawer).not.toBeVisible();
    await expect(panel.getByRole("button", { name: /오전 일정/ })).toBeVisible();
    await panel.getByRole("button", { name: /오전 일정/ }).click();
    await page.getByRole("button", { name: "다음 달", exact: true }).click();
    await expect(panel.getByText("이 날짜에는 등록된 일정이 없습니다.")).toBeVisible();
    await expect(inlineDetail).toHaveCount(0);
  } finally {
    await f.cleanup();
  }
});
