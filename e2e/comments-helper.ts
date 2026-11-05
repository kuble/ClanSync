import { expect, type Page } from "@playwright/test";

export async function openBoardComments(page: Page) {
  const drawer = page.getByRole("region", { name: "게시글 댓글 목록", exact: true });
  const trigger = page.getByRole("button", { name: /^댓글 \d+$/ });
  // A reload can restore the sheet while hydration replaces its outer anchor.
  await expect.poll(async () => await drawer.isVisible() || await trigger.isVisible()).toBe(true);
  if (!await drawer.isVisible()) {
    // Desktop pointer entry opens the drawer before a click lands. Keyboard
    // activation exercises the same button without clicking through the sheet.
    await expect(trigger).toBeEnabled();
    await trigger.press("Enter");
  }
  await expect(drawer).toBeVisible();
}
