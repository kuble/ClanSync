import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("rules advance every eight seconds, pause while reading, and respect reduced motion", async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    const rules = Array.from({ length: 3 }, (_, i) => `규칙 ${i + 1} 서로 존중하고 즐겁게 게임합니다.`);
    expect((await fixture.service.from("clans").update({ rules: rules.join("\n") }).eq("id", fixture.clanId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.clock.install();
    await page.goto(`/games/overwatch/clan/${fixture.clanId}`);
    const preview = page.getByRole("region", { name: "클랜 규칙", exact: true });
    const text = preview.locator("[data-rule-text]");
    await expect(text).toHaveText(rules[0]);
    await page.mouse.move(0, 0);
    await page.clock.runFor(7000);
    await expect(text).toHaveText(rules[0]);
    await page.clock.runFor(1000);
    await expect(text).toHaveText(rules[1]);
    await preview.hover();
    await page.clock.runFor(9000);
    await expect(text).toHaveText(rules[1]);
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    const link = preview.getByRole("link", { name: /^규칙 \d:/ });
    await link.focus();
    await page.clock.runFor(9000);
    await expect(text).toHaveText(rules[1]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await link.evaluate(el => el.blur());
    await page.clock.runFor(9000);
    await expect(text).toHaveText(rules[1]);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.runFor(8000);
    await expect(text).toHaveText(rules[2]);
    await page.clock.runFor(8000);
    await expect(text).toHaveText(rules[0]);
    await link.click();
    await expect(page.getByRole("list", { name: "클랜 규칙 목록", exact: true }).getByRole("listitem")).toHaveCount(3);
  } finally { await fixture.cleanup(); }
});
