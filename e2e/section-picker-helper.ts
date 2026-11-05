import { expect, type Page } from "@playwright/test";

/** Use the same section control that is visible at the current viewport. */
export async function selectSection(page: Page, picker: string, name: string) {
  if ((page.viewportSize()?.width ?? 1280) < 960) {
    const trigger = page.getByRole("navigation", { name: picker, exact: true }).getByRole("button");
    await expect(trigger).toBeEnabled();
    await trigger.click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expect(trigger).toContainText(name);
  } else {
    const tab = page.getByRole("tab", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }
}

export async function selectProfileSection(page: Page, name = "계정 정보") {
  await selectSection(page, "프로필 화면 선택", name);
}

export async function selectSectionLink(page: Page, picker: string, name: string) {
  const navigation = page.getByRole("navigation", { name: picker, exact: true });
  if ((page.viewportSize()?.width ?? 1280) < 960) {
    await navigation.getByRole("button").click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expect(navigation.getByRole("button")).toContainText(name);
  } else {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
  }
}
