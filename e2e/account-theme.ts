import type { Page } from "@playwright/test";

export async function toggleAccountTheme(page: Page) {
  await page.getByRole("button", { name: "프로필 메뉴", exact: true }).click();
  await page.getByRole("menuitem", { name: /^(다크|라이트) 모드로 전환$/ }).click();
}
