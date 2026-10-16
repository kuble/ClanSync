import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("자동 저장은 실패 시 입력을 유지하고 재시도·저장 중 다음 변경·화면 이동을 보존한다", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  let release: (() => void) | undefined;
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "manage?tab=balance"));
    const hours = page.getByLabel("활동이 없을 때", { exact: true });
    await expect(page.getByRole("button", { name: "설정 저장", exact: true })).toHaveCount(0);
    let fail = true, hold = false;
    let notifyArrival: (() => void) | undefined;
    await page.route("**/manage?tab=balance", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      if (fail) { fail = false; return route.fulfill({ status: 503, contentType: "text/plain", body: "Temporary test outage" }); }
      if (hold) {
        hold = false;
        const waiting = new Promise<void>((resolve) => { release = resolve; });
        notifyArrival?.();
        await waiting;
      }
      await route.continue();
    });
    await hours.fill("4");
    await expect(page.getByRole("alert").filter({ hasText: "변경 사항을 저장하지 못했습니다." })).toBeVisible();
    await expect(hours).toHaveValue("4");
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByText("자동 저장됨", { exact: true })).toBeVisible();
    const readHours = async () => (await f.service.from("clans").select("balance_auto_close_hours").eq("id", f.clanId).single()).data?.balance_auto_close_hours;
    await expect.poll(readHours).toBe(4);
    hold = true;
    const arrived = new Promise<void>((resolve) => { notifyArrival = resolve; });
    await hours.fill("5");
    await arrived;
    await hours.fill("6");
    release!();
    await expect(page.getByText("자동 저장됨", { exact: true })).toBeVisible();
    await expect(hours).toHaveValue("6");
    await expect.poll(readHours).toBe(6);
    await hours.fill("0");
    await expect(page.getByRole("alert").filter({ hasText: "1~168시간" })).toBeVisible();
    await expect.poll(readHours).toBe(6);
    await hours.fill("7");
    await page.getByRole("navigation", { name: "클랜 관리 항목" }).getByRole("link", { name: "알림·연동", exact: true }).click();
    await expect(page.getByTestId("clan-event-notify-settings")).toBeVisible();
    await expect.poll(readHours).toBe(7);
    await page.getByRole("navigation", { name: "클랜 관리 항목" }).getByRole("link", { name: "내전·경매", exact: true }).click();
    await expect(hours).toHaveValue("7");
    const toggle = page.getByRole("switch", { name: "세션 자동 종료", exact: true });
    await toggle.click();
    await expect(hours).toBeHidden();
    await expect(page.getByText("자동 저장됨", { exact: true })).toBeVisible();
    await expect.poll(readHours).toBe(7);
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(hours).toBeHidden();
    await toggle.click();
    await expect(hours).toBeVisible();
    await expect(hours).toHaveValue("7");
    await expect(page.getByText("자동 저장됨", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.locator("#balance-auto-close-details").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "세션 자동 종료", exact: true }).hover();
    await expect(page.getByRole("tooltip")).toContainText("마지막 편성");
  } finally { release?.(); await f.cleanup(); }
});
