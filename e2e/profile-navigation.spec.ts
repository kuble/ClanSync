import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ hasTouch: true });
test("프로필은 방·네임카드의 아이콘에서 상점과 편집을 열고 엠블럼 탐색을 간결하게 표시한다", async ({ page }, info) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    const menu = page.getByRole("navigation", { name: "계정 메뉴", exact: true });
    await expect(menu.getByRole("link", { name: "개인 상점", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "내 엠블럼 케이스 보기", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "게임별 클랜", exact: true })).toHaveCount(0);
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    const roomTools = housing.getByRole("toolbar", { name: "방 꾸미기 도구", exact: true });
    const editRoom = roomTools.getByRole("button", { name: "방 꾸미기", exact: true });
    const roomShop = roomTools.getByRole("link", { name: "개인 상점", exact: true });
    await expect(editRoom.locator("svg")).toBeVisible();
    await expect(roomShop).toHaveAttribute("href", "/store");
    await editRoom.hover(); await expect(page.locator('[role="tooltip"][data-open]')).toHaveText("방 꾸미기");
    await page.mouse.move(0, 0);
    await editRoom.click();
    await expect(housing.getByRole("button", { name: "내 가구", exact: true })).toBeVisible();
    await housing.getByRole("button", { name: "편집 취소", exact: true }).click();
    await expect(editRoom).toBeVisible();
    await roomShop.click();
    await expect(page).toHaveURL(/\/store$/);
    await expect(page.getByRole("heading", { name: "나를 꾸미는 상점", exact: true })).toBeVisible();
    await menu.getByRole("link", { name: "프로필", exact: true }).click();
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    const card = page.getByRole("region", { name: "공통 네임카드", exact: true });
    const cardTools = card.getByRole("toolbar", { name: "네임카드 도구", exact: true });
    const editCard = cardTools.getByRole("button", { name: "네임카드 꾸미기", exact: true });
    const cardShop = cardTools.getByRole("link", { name: "개인 상점", exact: true });
    await expect(cardTools.getByRole("link")).toHaveCount(1);
    await expect(editCard).toHaveText(""); await expect(editCard.locator("svg")).toBeVisible();
    await cardShop.focus(); await page.keyboard.press("Tab"); await expect(editCard).toBeFocused(); await expect(page.locator('[role="tooltip"][data-open]')).toHaveText("네임카드 꾸미기");
    await editCard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await expect(dialog.getByRole("combobox", { name: "네임카드 엠블럼", exact: true })).toBeFocused();
    await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
    // Viewport snapshots preserve Chromium touch emulation between interactions.
    for (const width of [1136, 390, 320]) {
      await page.setViewportSize({ width, height: 982 });
      await page.mouse.move(0, 0); await editCard.blur();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      for (const icon of [editCard, cardShop]) { const b = await icon.boundingBox(); expect(b!.width).toBeGreaterThanOrEqual(44); expect(b!.height).toBeGreaterThanOrEqual(44); }
      await page.screenshot({ path: info.outputPath("profile-icon-account-" + width + ".png") });
      await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
      for (const icon of [editRoom, roomShop]) { const b = await icon.boundingBox(); expect(b!.width).toBeGreaterThanOrEqual(44); expect(b!.height).toBeGreaterThanOrEqual(44); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: info.outputPath("profile-icon-room-" + width + ".png") });
      await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    }
    await cardShop.click(); await expect(page).toHaveURL(/\/store$/);
    await page.goto(`/profile/${f.users[0].id}/emblems`);
    const breadcrumbs = page.getByRole("navigation", { name: "현재 위치", exact: true });
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText("엠블럼");
    await expect(page.getByRole("heading", { name: "엠블럼 케이스", exact: true })).toBeVisible();
    await expect(page.getByText("게임과 클랜에서 쌓은 수상과 성장 기록", { exact: true })).toHaveCount(0);
  } finally { await f.cleanup(); }
});
