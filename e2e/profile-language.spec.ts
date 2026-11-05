import { selectProfileSection } from "./section-picker-helper";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("account language persists across pages, reloads and sign-ins", async ({ page }) => {
  test.setTimeout(90000);
  const fixture = await createIsolatedBalanceFixture(1);
  const user = fixture.users[0];
  try {
    await loginIsolatedBalanceUser(page, user);
    await page.goto("/profile");
    await expect(page.getByRole("link", { name: "게임 ID 수정", exact: true })).toHaveCount(0);
    await selectProfileSection(page, "계정 정보");
    await page.getByLabel("언어", { exact: true }).selectOption("en");
    await expect(page.locator("#profile-language")).toBeEnabled({ timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveURL("/profile?tab=account");
    await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
    await page.goto("/games/overwatch/clan/" + fixture.clanId + "/stats");
    await expect(page.getByRole("tab", { name: "Hall of Fame", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Hall of Fame", exact: true })).toBeVisible();
    const saved = await fixture.service.from("users").select("language").eq("id", user.id).single();
    expect(saved.data?.language).toBe("en");
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, user);
    await page.goto("/profile");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("tab", { name: "Account settings" }).click();
    await page.getByLabel("Language", { exact: true }).selectOption("ko");
    await expect(page.getByRole("heading", { name: "내 계정" })).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});
