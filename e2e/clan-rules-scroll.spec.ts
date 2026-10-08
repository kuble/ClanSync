import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("rules scroll slowly, pause while reading, and respect reduced motion", async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    const rules = Array.from({ length: 12 }, (_, i) => `${i + 1}. 서로 존중하고 즐겁게 게임해요.`).join("\n");
    const { error } = await fixture.service.from("clans").update({ rules }).eq("id", fixture.clanId);
    expect(error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.clock.install();
    await page.setViewportSize({ width: 1169, height: 884 });
    await page.goto(`/games/overwatch/clan/${fixture.clanId}`);
    const preview = page.getByRole("button", { name: "클랜 규칙 전체 보기", exact: true });
    await expect(preview).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.runFor(5000);
    const scrollTop = () => preview.evaluate((el) => el.scrollTop);
    const position = await scrollTop();
    expect(position).toBeGreaterThan(0);
    expect(position).toBeLessThanOrEqual(50);
    expect(await preview.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe("none");

    await preview.hover();
    await page.clock.runFor(3000);
    expect(await scrollTop()).toBe(position);
    await page.mouse.move(0, 0);
    await preview.focus();
    await page.clock.runFor(3000);
    expect(await scrollTop()).toBe(position);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await preview.evaluate((el) => el.blur());
    await page.clock.runFor(3000);
    expect(await scrollTop()).toBe(position);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.runFor(3000);
    expect(await scrollTop()).toBeGreaterThan(position);
    await preview.hover();
    const bottom = await preview.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    });
    await page.clock.runFor(100);
    await page.mouse.move(0, 0);
    await page.clock.runFor(1000);
    expect(await scrollTop()).toBe(bottom);
    await page.clock.runFor(3000);
    expect(await scrollTop()).toBeLessThan(bottom);
    await preview.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(rules);
    await page.screenshot({ path: test.info().outputPath("rules-preview.png") });
  } finally {
    await fixture.cleanup();
  }
});
