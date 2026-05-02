import { test, expect } from "@playwright/test";

test.describe("공개 스모크", () => {
  test("랜딩·로그인 화면이 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /ClanSync/i })).toBeVisible();

    await page.goto("/sign-in");
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });
});
