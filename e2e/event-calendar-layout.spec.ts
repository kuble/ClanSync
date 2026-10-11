import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "UTC", actionTimeout: 15_000 });

test("calendar: fixed desktop list/detail panel and mobile drawer keep the selected date", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(1);
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const singleKey = `${monthKey}-14`;
  const dayKey = `${monthKey}-15`;
  const emptyKey = dayKey.replace(/15$/, "16");
  const busyKey = `${monthKey}-17`;
  try {
    const { error } = await f.service.from("clan_events").insert([
      { clan_id: f.clanId, created_by: f.users[0].id, title: "단일 일정", start_at: `${singleKey}T09:00:00Z`, kind: "event" },
      { clan_id: f.clanId, created_by: f.users[0].id, title: "오전 일정", start_at: `${dayKey}T09:00:00Z`, kind: "event" },
      { clan_id: f.clanId, created_by: f.users[0].id, title: "오후 일정", start_at: `${dayKey}T17:00:00Z`, kind: "intra" },
      ...Array.from({ length: 12 }, (_, i) => ({
        clan_id: f.clanId,
        created_by: f.users[0].id,
        title: `다중 일정 ${i + 1}`,
        start_at: `${busyKey}T${String(i).padStart(2, "0")}:00:00Z`,
        kind: "event" as const,
        place: "긴 장소·메모 확인 ".repeat(30),
      })),
    ]);
    expect(error).toBeNull();
    await page.setViewportSize({ width: 1304, height: 884 });
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "events"));
    const calendar = page.getByRole("grid", { name: "월간 캘린더" });
    const panel = page.getByRole("region", { name: "선택한 날짜 일정" });
    const scheduleList = panel.getByRole("list", { name: "날짜별 일정 목록" });
    const inlineDetail = panel.getByRole("region", { name: "일정 상세", exact: true });
    const expectMatchedHeight = async () => {
      const gridBox = await calendar.boundingBox(), panelBox = await panel.boundingBox();
      expect(panelBox!.x).toBeGreaterThanOrEqual(gridBox!.x + gridBox!.width);
      expect(Math.abs(panelBox!.y - gridBox!.y)).toBeLessThan(2);
      expect(Math.abs(panelBox!.height - gridBox!.height)).toBeLessThan(2);
      return panelBox!.height;
    };
    await calendar.locator(`[data-date="${singleKey}"]`).click();
    await expect(scheduleList.getByRole("button")).toHaveCount(1);
    const fixedHeight = await expectMatchedHeight();
    const day = calendar.locator(`[data-date="${dayKey}"]`);
    await day.click();
    await expect(scheduleList.getByRole("button")).toHaveCount(2);
    await expect(scheduleList.getByRole("button").first()).toContainText("오전 일정");
    expect(await expectMatchedHeight()).toBe(fixedHeight);
    await expect(panel.getByRole("button", { name: "이 날짜에 일정 추가" })).toHaveCount(0);
    await expect(panel.getByText(/\d+개 일정/)).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
    const create = page.getByRole("dialog", { name: "일정 등록" });
    await expect(create.getByLabel("시작 (로컬 시각)")).toHaveValue(`${dayKey}T20:00`);
    await create.getByLabel("제목", { exact: true }).fill("추가 일정");
    await create.getByLabel("시작 (로컬 시각)").fill(`${dayKey}T13:00`);
    await create.getByRole("button", { name: "등록", exact: true }).click();
    await expect(create).not.toBeVisible();
    await expect(scheduleList.getByRole("button")).toHaveCount(3);
    await expect(scheduleList.getByRole("button").nth(1)).toContainText("추가 일정");
    await expect(day).toContainText("+1개 일정");
    expect(await expectMatchedHeight()).toBe(fixedHeight);
    await page.screenshot({ path: test.info().outputPath("calendar-fixed-list.png") });
    await panel.getByRole("button", { name: /오전 일정/ }).press("Enter");
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 오전 일정" })).toBeVisible();
    await expect(scheduleList).toHaveCount(0);
    await expect(inlineDetail.getByRole("button", { name: "목록으로" })).toBeFocused();
    await expect(inlineDetail.getByRole("button", { name: "이전 일정" })).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await inlineDetail.getByRole("button", { name: "다음 일정" }).click();
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 추가 일정" })).toBeVisible();
    await inlineDetail.getByRole("button", { name: "다음 일정" }).click();
    await expect(inlineDetail.getByRole("heading", { name: "내전 · 오후 일정" })).toBeVisible();
    await expect(inlineDetail.getByRole("button", { name: "다음 일정" })).toBeDisabled();
    expect(await expectMatchedHeight()).toBe(fixedHeight);
    await page.screenshot({ path: test.info().outputPath("calendar-fixed-detail.png") });
    await inlineDetail.getByRole("button", { name: "편집", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "일정 편집" });
    await expect(edit.getByLabel("제목", { exact: true })).toHaveValue("오후 일정");
    await page.keyboard.press("Escape");
    await expect(edit).not.toBeVisible();
    await inlineDetail.getByRole("button", { name: "목록으로" }).click();
    await expect(panel.getByRole("button", { name: /오후 일정/ })).toBeFocused();
    await calendar.locator(`[data-date="${busyKey}"]`).click();
    await expect(scheduleList.getByRole("button")).toHaveCount(12);
    expect(await expectMatchedHeight()).toBe(fixedHeight);
    await panel.getByRole("button", { name: /다중 일정 12$/ }).click();
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 다중 일정 12", exact: true })).toBeVisible();
    expect(await expectMatchedHeight()).toBe(fixedHeight);
    const detailContent = inlineDetail.locator('[aria-label="일정 상세 내용"]');
    expect(await detailContent.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const editBox = await inlineDetail.getByRole("button", { name: "편집", exact: true }).boundingBox();
    const detailBox = await inlineDetail.boundingBox();
    expect(editBox!.y + editBox!.height).toBeLessThanOrEqual(detailBox!.y + detailBox!.height);
    await inlineDetail.getByRole("button", { name: "이전 일정" }).click();
    await expect(inlineDetail.getByRole("heading", { name: "이벤트 · 다중 일정 11", exact: true })).toBeVisible();
    await inlineDetail.getByRole("button", { name: "목록으로" }).click();
    await expect(panel.getByRole("button", { name: /다중 일정 11$/ })).toBeFocused();
    await calendar.locator(`[data-date="${emptyKey}"]`).click();
    await expect(inlineDetail).toHaveCount(0);
    await expect(panel.getByText("이 날짜에는 등록된 일정이 없습니다.")).toBeVisible();
    expect(await expectMatchedHeight()).toBe(fixedHeight);
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
    await expect(drawer.getByRole("button", { name: "이 날짜에 일정 추가" })).toHaveCount(0);
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await expect(day).toBeFocused();
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
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
    await emptyDrawer.getByRole("button", { name: "닫기", exact: true }).click();
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
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
    await expectMatchedHeight();
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
    await expectMatchedHeight();
  } finally {
    await f.cleanup();
  }
});
