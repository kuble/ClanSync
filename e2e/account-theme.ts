import { expect, type Page } from "@playwright/test";

export async function toggleAccountTheme(page: Page) {
  await page.getByRole("button", { name: "프로필 메뉴", exact: true }).click();
  await page.getByRole("menuitem", { name: /^(다크|라이트) 모드로 전환$/ }).click();
  // 닫히는 메뉴가 이전 화면 너비를 유지하는 동안 다음 크기를 측정하지 않는다.
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0);
}
