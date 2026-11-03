import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("signed-in members can use the footer outside the clan workspace", async ({ page }) => {
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    for (const label of ["공지사항", "이용약관", "개인정보처리방침", "문의하기"]) {
      await page.getByRole("contentinfo").getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
      await page.goBack();
    }
    await page.goto(fixture.path);
    await expect(page.locator("#site-footer")).toHaveCount(0);
    await page.goto("/profile");
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  } finally {
    await fixture.cleanup();
  }
});

test("footer menus open public service pages with draft status and a working return home", async ({ page }) => {
  await page.goto("/");
  for (const [label, path] of [["공지사항", "/notices"], ["이용약관", "/terms"], ["개인정보처리방침", "/privacy"], ["문의하기", "/contact"]]) {
    const link = page.getByRole("contentinfo").getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", path);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "서비스 안내 메뉴" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    if (path === "/terms" || path === "/privacy") {
      await expect(page.getByRole("complementary", { name: "문서 상태" })).toContainText("검토용 초안");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    }
  }
  const discord = page.getByRole("link", { name: "공식 Discord 참여하기 (새 탭)", exact: true });
  await expect(discord).toHaveAttribute("href", "https://discord.gg/Ss6ezVqh3B");
  await expect(discord).toHaveAttribute("target", "_blank");
  await expect(discord).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("link", { name: "홈으로", exact: true }).click();
  await expect(page).toHaveURL(/\/\?from=logo$/);
  await expect(page.getByRole("heading", { level: 1, name: /팀 편성이 한결 편해지는/ })).toBeVisible();
});
