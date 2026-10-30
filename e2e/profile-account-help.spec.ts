import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ hasTouch: true });
test("계정 안내는 제목 툴팁으로 표시하고 네임카드는 모바일까지 폭을 채운다", async ({ page }, info) => {
  const f = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    const tooltip = page.locator('[role="tooltip"][data-open]');
    for (const [name, description] of [["게임 프로필", "한 번 꾸미면"], ["게임별 관리", "게임을 열어"], ["가입 신청", "최근 7일"], ["자동 로그인", "로그인을 계속 유지"]]) {
      await page.getByRole("tab", { name: name === "게임 프로필" ? "플레이어 소개" : "계정 정보", exact: true }).click();
      const help = page.getByRole("button", { name: name + " 도움말", exact: true });
      await help.hover();
      await expect(tooltip).toContainText(description);
      await page.mouse.move(0, 0); await help.blur();
      await expect(tooltip).toHaveCount(0);
    }
    const help = page.getByRole("button", { name: "게임별 관리 도움말", exact: true });
    await help.focus(); await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape"); await expect(tooltip).toHaveCount(0);
    const ow = page.getByRole("region", { name: "오버워치 관리", exact: true });
    await ow.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await page.getByRole("button", { name: "선호 역할 도움말", exact: true }).hover();
    await expect(tooltip).toContainText("좌우 방향키");
    await page.mouse.move(0, 0);
    await ow.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
    await page.getByRole("tab", { name: "플레이어 소개", exact: true }).click();
    const card = page.getByRole("region", { name: "공통 네임카드", exact: true });
    await page.setViewportSize({ width: 1023, height: 884 });
    await page.getByRole("button", { name: "게임 프로필 도움말", exact: true }).hover();
    await expect(tooltip).toContainText("한 번 꾸미면");
    await page.screenshot({ path: info.outputPath("profile-account-help-desktop.png"), fullPage: true });
    await page.mouse.move(0, 0); await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
    for (const width of [1023, 390, 320]) {
      await page.setViewportSize({ width, height: 884 });
      const [a, b] = await Promise.all([card.getByRole("article").boundingBox(), card.locator("[data-namecard]").boundingBox()]);
      expect(b!.x).toBeGreaterThan(a!.x);
      expect(b!.x + b!.width).toBeLessThanOrEqual(a!.x + a!.width);
      expect(b!.width).toBeGreaterThan(a!.width - 40);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: info.outputPath("profile-account-public-" + width + ".png"), fullPage: true });
    }
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await help.tap(); await expect(tooltip).toBeVisible();
    await help.tap(); await expect(tooltip).toHaveCount(0);
    const auto = page.getByRole("switch", { name: "자동 로그인", exact: true });
    await expect(auto).not.toBeChecked();
    await page.getByRole("button", { name: "자동 로그인 도움말", exact: true }).tap();
    await expect(tooltip).toContainText("로그인을 계속 유지");
    await expect(auto).not.toBeChecked();
    await page.keyboard.press("Escape");
  } finally { await f.cleanup(); }
});
