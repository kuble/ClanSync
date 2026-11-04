import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });

test("R06/R07 KST create, title edit and time edit preserve UTC instants and reservations", async ({
  page,
}) => {
  const f = await createIsolatedBalanceFixture(1);
  const svc = f.service;
  const clanId = f.clanId;
  const title = `timezone-${Date.now()}`;
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    const date = await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() + 2);
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    });

    await page.goto(`/games/overwatch/clan/${clanId}/events`);
    await expect(page.getByRole("grid")).toBeVisible();
    const dayCell = page.locator(`[data-date="${date}"]`);
    if (!(await dayCell.count()))
      await page.getByRole("button", { name: "다음 달" }).click();
    await dayCell.click();
    await expect(page.locator("#evt-title")).toBeHidden();
    await page.getByRole("button", { name: "일정 등록", exact: true }).click();
    const createDialog = page.getByRole("dialog", {
      name: "일정 등록",
      exact: true,
    });
    await expect(createDialog).toBeVisible();
    await page.locator("#evt-title").fill(title);
    await expect(createDialog.getByRole("listbox", { name: "시", exact: true }).getByRole("option", { selected: true })).toHaveText("20");
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(
      page.getByText("일정을 추가했습니다.", { exact: true }),
    ).toBeVisible();
    await expect(createDialog).toBeHidden();
    const { data, error } = await svc
      .from("clan_events")
      .select("id,start_at")
      .eq("clan_id", clanId)
      .eq("title", title)
      .single();
    expect(error).toBeNull();
    const eventId = data!.id;
    const original = `${date}T11:00:00.000Z`;
    expect(new Date(data!.start_at).toISOString()).toBe(original);
    await dayCell.click();
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByRole("button", { name: "편집", exact: true }).click();
    await page.locator("#edit-title").fill(`${title}-edited`);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(
      page.getByText("일정을 수정했습니다.", { exact: true }),
    ).toBeVisible();
    const firstEdit = await svc
      .from("clan_events")
      .select("start_at")
      .eq("id", eventId)
      .single();
    expect(firstEdit.error).toBeNull();
    expect(new Date(firstEdit.data!.start_at).toISOString()).toBe(original);
    await page
      .getByRole("button", { name: new RegExp(`${title}-edited`) })
      .click();
    await page.getByRole("button", { name: "편집", exact: true }).click();
    await page.getByRole("listbox", { name: "시", exact: true }).getByRole("option", { name: "21", exact: true }).click();
    await page.getByRole("listbox", { name: "분", exact: true }).getByRole("option", { name: "30", exact: true }).click();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect
      .poll(async () => {
        const r = await svc
          .from("clan_events")
          .select("start_at")
          .eq("id", eventId)
          .single();
        return new Date(r.data!.start_at).toISOString();
      })
      .toBe(`${date}T12:30:00.000Z`);
    const logs = await svc
      .from("notification_log")
      .select("id,status,scheduled_at")
      .eq("event_id", eventId);
    expect(logs.error).toBeNull();
    expect(logs.data!.length).toBeGreaterThan(0);
    expect(logs.data!.every((r) => r.status === "scheduled")).toBe(true);
  } finally {
    await f.cleanup();
  }
});
