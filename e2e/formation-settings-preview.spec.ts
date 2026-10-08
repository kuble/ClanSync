import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("formation settings illustrate each mode without applying it", async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await createAndEnterBalanceRoom(page, fixture.path, "편성 미리보기 검증");
    const readSettings = async () => {
      const { data, error } = await fixture.service.from("balance_sessions").select("formation_settings").eq("clan_id", fixture.clanId);
      expect(error).toBeNull();
      return data;
    };
    const before = await readSettings();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByRole("button", { name: "라운드 설정", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    const preview = dialog.getByRole("region", { name: "편성 방식 미리보기", exact: true });
    const mode = dialog.getByRole("combobox", { name: "팀원 선발 방식", exact: true });
    const caption = preview.getByTestId("formation-preview-caption");
    await expect(preview).toBeVisible();
    const panel = page.getByTestId("balance-settings-panel");
    const previewBox = await preview.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(previewBox!.x + previewBox!.width).toBeLessThan(panelBox!.x);
    expect(previewBox!.width).toBeGreaterThan(450);
    await expect(caption).toContainText("그대로 사용");
    await mode.selectOption("random");
    await expect(caption).toContainText("역할별로");
    await page.clock.runFor(1700);
    await expect(caption).toContainText("팀을 추첨");
    await preview.getByRole("button", { name: "미리보기 일시정지", exact: true }).click();
    await page.clock.runFor(5000);
    await expect(caption).toContainText("팀을 추첨");
    await preview.getByRole("button", { name: "미리보기 다시 보기", exact: true }).click();
    await expect(caption).toContainText("역할별로");

    await mode.selectOption("draft");
    await page.clock.runFor(3300);
    await expect(caption).toContainText("A팀이 첫");
    await page.clock.runFor(1600);
    await expect(caption).toContainText("B팀이 다음");
    await page.clock.runFor(1600);
    await expect(caption).toContainText("이번에도 B팀");

    await mode.selectOption("auction");
    await dialog.getByRole("spinbutton", { name: "최소·증액 단위", exact: true }).fill("20");
    await page.clock.runFor(3300);
    await expect(preview).toContainText("A팀 20 cr");
    await page.clock.runFor(1600);
    await expect(preview).toContainText("B팀 40 cr");
    await preview.scrollIntoViewIfNeeded();
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("auction-preview.png") });
    await dialog.getByRole("tab", { name: "화면 표시", exact: true }).click();
    await page.clock.runFor(300);
    await expect(preview).toBeHidden();
    await dialog.getByRole("tab", { name: "편성", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(caption).toContainText("다음 선수도");
    await expect(preview.getByRole("button")).toHaveCount(0);
    await mode.selectOption("random");
    await expect(caption).toContainText("각 팀에 돌격 1");
    await page.setViewportSize({ width: 390, height: 844 });
    await preview.scrollIntoViewIfNeeded();
    expect(await preview.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const mobilePreview = await preview.boundingBox();
    const mobilePanel = await panel.boundingBox();
    expect(mobilePreview!.x).toBeGreaterThanOrEqual(mobilePanel!.x);
    expect(mobilePreview!.x + mobilePreview!.width).toBeLessThanOrEqual(mobilePanel!.x + mobilePanel!.width);
    expect(await readSettings()).toEqual(before);
    await page.keyboard.press("Escape");
    await page.clock.runFor(300);
    await expect(dialog).toBeHidden();
  } finally {
    await fixture.cleanup();
  }
});
