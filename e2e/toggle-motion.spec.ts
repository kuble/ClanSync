import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("switch tracks, thumbs and choice controls share smooth motion and honor reduced motion", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "manage?tab=promotion"));
    const publish = page.getByRole("switch", { name: "홍보글 게시", exact: true });
    const track = publish.locator("+ span");
    expect(await track.evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0.2s");
    expect(await track.evaluate(el => getComputedStyle(el, "::after").transitionProperty)).toContain("transform");
    await publish.uncheck(); await expect(publish).not.toBeChecked();
    await publish.check(); await expect(publish).toBeChecked();
    const position = page.getByRole("button", { name: "탱커", exact: true });
    expect(await position.evaluate(el => getComputedStyle(el).transitionDuration)).toContain("0.2s");
    await position.click(); await expect(position).toHaveAttribute("aria-pressed", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(parseFloat(await track.evaluate(el => getComputedStyle(el, "::after").transitionDuration))).toBeLessThan(0.001);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/profile");
    const automatic = page.getByRole("switch", { name: "자동 로그인", exact: true });
    await expect(async () => {
      const account = page.getByRole("tab", { name: "계정 정보", exact: true });
      await account.click();
      await expect(account).toHaveAttribute("aria-selected", "true");
      await expect(automatic).toBeVisible();
    }).toPass({ timeout: 10_000 });

    expect(await automatic.locator("~ span").last().evaluate(el => getComputedStyle(el).transitionProperty)).toContain("translate");
  } finally { await f.cleanup(); }
});
