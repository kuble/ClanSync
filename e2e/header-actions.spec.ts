import { toggleAccountTheme } from "./account-theme";
import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("account and clan headers share icon order, navigation and mobile sizing", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  const staff = await browser.newPage({ baseURL: new URL(info.project.use.baseURL!).origin });
  const base = f.path.replace(/\/balance$/, "");
  const errors: string[] = [];
  for (const target of [page, staff]) target.on("pageerror", error => errors.push(error.message));
  async function check(target: Page, path: string) {
    await target.goto(path);
    const actions = target.locator("header [data-header-actions]");
    await expect(actions.getByRole("button", { name: /^알림/ })).toBeVisible();
    await expect(actions.locator("button, a")).toHaveCount(3);
    expect(await actions.locator("button, a").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label")))).toEqual(["게임 선택", "프로필 메뉴", "알림"]);
    await expect(actions.locator("button, a")).toHaveText(["", "", ""]);
    await expect(target.locator("header").getByText("Premium", { exact: true })).toHaveCount(0);
    expect(await target.locator("header").first().evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  }
  try {
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[1]);
    for (const path of ["/games", "/games/overwatch/auth?reauth=1", "/games/overwatch/clan", "/profile", "/profile/emblems", "/store"]) await check(page, path);
    const actions = page.locator("header [data-header-actions]");
    const light = await page.locator("html").evaluate(el => el.classList.contains("light"));
    await toggleAccountTheme(page);
    await expect(page.locator("html")).toHaveClass(light ? /\bdark\b/ : /\blight\b/);
    await toggleAccountTheme(page);
    await actions.getByRole("button", { name: "게임 선택", exact: true }).click();
    await expect(page.getByRole("menu", { name: "게임 선택", exact: true })).toBeVisible();
    await page.getByRole("menuitem", { name: "오버워치", exact: true }).click();
    await expect(page).toHaveURL(/\/games\/overwatch\/clan/);
    await actions.getByRole("button", { name: "프로필 메뉴", exact: true }).click();
    await page.getByRole("menuitem", { name: "프로필", exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await page.locator("header [data-header-actions]").getByRole("button", { name: "알림", exact: true }).click();
    await expect(page.getByTestId("clansync-inapp-notification-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await loginIsolatedBalanceUser(staff, f.users[0]);
    for (const path of [base, base + "/balance", base + "/stats", base + "/board/notices", base + "/events", base + "/store", base + "/emblems", base + "/badges", base + "/manage?tab=overview", base + "/manage?tab=promotion", base + "/manage?tab=requests"]) await check(staff, path);
    for (const width of [390, 320]) {
      for (const [target, path] of [[page, "/games"], [page, "/games/overwatch/clan"], [page, "/profile"], [staff, base + "/balance"], [staff, base + "/manage?tab=requests"]] as const) {
        await target.setViewportSize({ width, height: 844 });
        await check(target, path);
        if (target === staff) {
          const trail = target.getByRole("navigation", { name: "현재 위치", exact: true });
          await expect(trail.locator(":scope > :visible")).toHaveCount(1);
          const current = trail.locator('[aria-current="page"]');
          await expect(current).toHaveText(path.includes("/balance") ? "내전 로비" : "클랜 관리");
          expect(await trail.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        }
        await target.screenshot({ path: info.outputPath(`header-${width}-${target === page ? path.split("/").at(-1) : path.includes("balance") ? "balance" : "requests"}.png`) });
      }
    }
    await actions.getByRole("button", { name: "프로필 메뉴", exact: true }).click();
    await page.getByRole("menuitem", {name:"로그아웃",exact:true}).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/sign-in/);
    expect(errors).toEqual([]);
  } finally {
    await staff.close();
    await f.cleanup();
  }
});
