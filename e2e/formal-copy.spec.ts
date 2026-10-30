import { expect, test } from "@playwright/test";

test("public account screens use the formal Korean tone", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "다시 만나 반갑습니다.", exact: true })).toBeVisible();
  await expect(page.getByLabel("이메일", { exact: true })).toBeVisible();
  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { name: "함께하게 되어 반갑습니다.", exact: true })).toBeVisible();
  expect(await page.getByText(/(?:해요|어요|아요|할까요)[.!?]?$/).count()).toBe(0);
});
