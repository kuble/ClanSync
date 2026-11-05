import { expect, type Page } from "@playwright/test";

export async function openBoardComments(page: Page) {
  const drawer = page.locator("#comments");
  if (!await drawer.isVisible()) {
    // Desktop pointer entry opens the drawer before a click lands. Keyboard
    // activation exercises the same button without clicking through the sheet.
    const trigger = page.getByRole("button", { name: /^댓글 \d+$/ });
    await expect(trigger).toBeEnabled();
    await trigger.press("Enter");
  }
  await expect(drawer).toBeVisible();
}
