import { expect, test, type Page } from "@playwright/test";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";

async function checkHeader(page: Page) {
  const header = page.locator("header").filter({ has: page.locator("[data-brand-symbol]") }).first();
  await expect(header).toBeVisible();
  await expect.poll(() => header.locator("[data-brand-symbol]").evaluate(el => el.getBoundingClientRect().width)).toBe(22);
  expect((await header.boundingBox())!.height).toBeCloseTo(60, 0);
  const layout = await header.evaluate(el => {
    const controls = [...el.querySelectorAll("a, button, summary")].filter(node => node.checkVisibility()).map(node => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => a.rect.left - b.rect.left);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      controls: controls.map(({ node, rect }, i) => ({
        name: node.getAttribute("aria-label") || node.textContent?.trim(),
        left: rect.left, right: rect.right, overlap: i ? controls[i - 1].rect.right - rect.left : 0,
        weight: node.tagName === "A" && node.textContent?.trim() ? getComputedStyle(node).fontWeight : null,
      })),
    };
  });
  expect(layout.overflow, page.url()).toBeLessThanOrEqual(1);
  for (const control of layout.controls) {
    expect(control.left, control.name).toBeGreaterThanOrEqual(0);
    expect(control.right, control.name).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(control.overlap, control.name).toBeLessThanOrEqual(1);
    if (control.weight) expect(control.weight, control.name).toBe("700");
  }
}

for (const theme of ["dark", "light"]) {
  test(`public headers share logo scale and fit desktop/mobile in ${theme}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("clansync-theme", value), theme);
    for (const width of [1304, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/", "/sign-in", "/sign-up"]) {
        await page.goto(path);
        await checkHeader(page);
        if (width === 320) await page.screenshot({ path: test.info().outputPath(`${path.replaceAll("/", "") || "landing"}.png`) });
      }
    }
  });

  test(`account, community and clan headers fit desktop/mobile in ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(value => localStorage.setItem("clansync-theme", value), theme);
    const base = new URL(await gotoOverwatchLeaderClanBase(page)).pathname;
    for (const width of [1304, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/games", "/profile", "/games/valorant/auth?reauth=1", "/games/overwatch", base, `${base}/balance`, `${base}/stats`, `${base}/manage?tab=balance`]) {
        await page.goto(path);
        await checkHeader(page);
        if (width === 320 && ["/profile", "/games/overwatch", base].includes(path)) {
          await page.screenshot({ path: test.info().outputPath(`${path === base ? "clan" : path.split("/").at(-1)}.png`) });
          const menu = page.getByRole("button", { name: "메뉴 열기", exact: true });
          if (await menu.isVisible()) {
            await menu.click();
            await expect(page.getByRole("dialog")).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toBeHidden();
          }
        }
      }
    }
  });
}
