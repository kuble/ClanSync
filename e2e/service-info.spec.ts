import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("button", { name: "Discord 연결 준비 중", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "홈으로", exact: true }).click();
  await expect(page).toHaveURL(/\/\?from=logo$/);
  await expect(page.getByRole("heading", { level: 1, name: /팀 편성이 한결 편해지는/ })).toBeVisible();
});
