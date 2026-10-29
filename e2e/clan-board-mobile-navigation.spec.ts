import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { BOARD_SECTIONS } from "../src/lib/clan/board";

test.use({ hasTouch: true });

test("mobile board picker shows every section without horizontal scrolling and retains history", async ({ page }) => {
  test.setTimeout(120_000); page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(1), base = f.path.replace(/\/balance$/, ""), id = randomUUID();
  try {
    expect((await f.service.from("clan_board_posts").insert({ id, clan_id: f.clanId, kind: "free", author_id: f.users[0].id, title: "선택 메뉴 확인", content: "목록과 상세 이동" })).error).toBeNull();
    await page.setViewportSize({ width: 533, height: 1004 });
    await loginIsolatedBalanceUser(page, f.users[0]); await page.goto(base + "/board/memories");
    const nav = page.getByRole("navigation", { name: "게시판 목차", exact: true });
    const trigger = nav.getByRole("button", { name: /^게시판 선택:/ });
    const menu = page.getByRole("menu", { name: /^게시판 선택:/ });
    for (const { key, label } of BOARD_SECTIONS) {
      await trigger.tap(); await expect(menu.getByRole("menuitem")).toHaveCount(5);
      for (const section of BOARD_SECTIONS) {
        const row = menu.getByRole("menuitem", { name: section.label, exact: true });
        await expect(row).toBeVisible(); expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await menu.getByRole("menuitem", { name: label, exact: true }).tap();
      await expect(page).toHaveURL(base + "/board/" + key); await expect(menu).toBeHidden(); await expect(trigger).toHaveText(label);
    }
    for (const width of [533, 390, 320]) {
      await page.setViewportSize({ width, height: 1004 }); await trigger.tap();
      const rect = (await menu.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(await nav.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(menu.getByRole("menuitem", { name: "추억 열람방", exact: true })).toHaveAttribute("aria-current", "page");
      await page.screenshot({ path: test.info().outputPath(`board-picker-${width}.png`), animations: "disabled" });
      await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
    }
    await page.goto(`${base}/board/free/${id}`); await expect(trigger).toHaveText("자유 게시판");
    await trigger.tap(); await menu.getByRole("menuitem", { name: "자유 게시판", exact: true }).tap();
    await expect(page).toHaveURL(base + "/board/free"); await expect(page.getByRole("link", { name: /선택 메뉴 확인/ })).toBeVisible();
    await page.goBack(); await expect(page).toHaveURL(`${base}/board/free/${id}`); await expect(trigger).toHaveText("자유 게시판");
    await trigger.focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "추억 열람방", exact: true })).toBeFocused();
    await page.keyboard.press("Enter"); await expect(page).toHaveURL(base + "/board/memories");
    await trigger.tap(); await page.setViewportSize({ width: 1015, height: 884 });
    await expect(page.getByRole("button", { name: "게시판 선택: 추억 열람방", exact: true, includeHidden: true })).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeHidden(); await expect(trigger).toHaveCount(0);
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link", { name: "추억 열람방", exact: true })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: test.info().outputPath("board-links-desktop.png"), animations: "disabled" });
    await page.setViewportSize({ width: 533, height: 1004 }); await expect(trigger).toHaveText("추억 열람방"); await expect(trigger).toHaveAttribute("aria-expanded", "false");
  } finally { await f.cleanup(); }
});
