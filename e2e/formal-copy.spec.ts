import { expect, test } from "@playwright/test";

test("public account screens use the formal Korean tone", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText("다시 오신 것을 환영합니다", { exact: true })).toBeVisible();
  await expect(page.getByLabel("이메일", { exact: true })).toBeVisible();
  await page.goto("/sign-up");
  await expect(page.getByText("ClanSync에 오신 것을 환영합니다", { exact: true })).toBeVisible();
  expect(await page.getByText(/(?:해요|어요|아요|할까요)[.!?]?$/).count()).toBe(0);
});
