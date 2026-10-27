import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ hasTouch: true });

test("계정 헤더는 게임 호버·키보드·터치 선택과 게임 선택 로고 이동을 제공한다", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(1);
  let release = () => {};
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    const header = page.getByRole("banner");
    const account = header.getByRole("navigation", { name: "계정 메뉴", exact: true });
    const trigger = account.getByRole("button", { name: "게임 선택", exact: true });
    const menu = page.getByRole("menu", { name: "게임 선택", exact: true });
    await expect(account.getByRole("link", { name: "프로필", exact: true })).toHaveCount(0);
    const brand = header.getByRole("link", { name: "게임 선택", exact: true });
    await expect(brand).toHaveAttribute("href", "/games");
    const gate = new Promise<void>(resolve => { release = resolve; });
    let fail = true;
    await page.route("**/rest/v1/games?*", async route => {
      if (route.request().method() !== "GET") { await route.continue(); return; }
      await gate;
      if (fail) await route.fulfill({ status: 400, headers: { "Access-Control-Allow-Origin": "*" }, json: { message: "unavailable" } });
      else await route.continue();
    });
    await trigger.hover();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("status")).toBeVisible();
    await menu.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    const pending = await menu.boundingBox();
    release();
    await expect(menu.getByRole("alert")).toBeVisible();
    fail = false;
    await menu.getByRole("menuitem", { name: "다시 불러오기", exact: true }).click();
    await expect(menu.getByRole("menuitem", { name: "오버워치", exact: true })).toBeVisible();
    const games = await f.service.from("games").select("name_ko,is_active");
    expect(games.error).toBeNull();
    for (const game of games.data!) {
      const item = menu.getByRole("menuitem", { name: game.name_ko, exact: true });
      await expect(item).toBeVisible();
      if (!game.is_active) await expect(item).toHaveAttribute("aria-disabled", "true");
    }
    expect(Math.abs((await menu.boundingBox())!.height - pending!.height)).toBeLessThan(1);
    await page.screenshot({ path: info.outputPath("profile-game-menu.png") });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await trigger.focus();
    await trigger.press("ArrowDown");
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "오버워치", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(f.path.replace(/\/balance$/, ""));
    await page.goto("/profile");
    await page.setViewportSize({ width: 320, height: 884 });
    await trigger.tap();
    await expect(menu).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    await menu.getByRole("menuitem", { name: "전체 게임 보기", exact: true }).tap();
    await expect(page).toHaveURL(/\/games$/);
    await page.goto("/profile");
    await brand.tap();
    await expect(page).toHaveURL(/\/games$/);
    await page.goto("/store");
    await expect(account.getByRole("link", { name: "프로필", exact: true })).toBeVisible();
  } finally { release(); await f.cleanup(); }
});
