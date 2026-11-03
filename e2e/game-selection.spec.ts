import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("출시 예정 데드록을 한글·영문으로 검색하고 게임 메뉴에서도 확인한다", async ({ page }) => {
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    await page.setViewportSize({ width: 1226, height: 884 });
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const title = page.getByRole("heading", { name: "게임 선택", exact: true });
    await expect(title).toBeVisible();
    const brand = page.getByRole("banner").getByRole("link", { name: "ClanSync 홈" });
    expect(Math.abs((await title.boundingBox())!.x - (await brand.boundingBox())!.x)).toBeLessThan(2);
    const main = page.getByRole("main");
    await expect(main).not.toContainText("PUBG");
    for (const query of ["deadlock", "데드록"]) {
      await main.getByRole("searchbox").fill(query);
      await expect(main.getByRole("listitem")).toHaveCount(1);
      await expect(main.getByRole("listitem")).toContainText("데드록");
    }
    await page.getByRole("button", { name: "게임 선택", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "데드록" })).toBeDisabled();
  } finally {
    await fixture.cleanup();
  }
});
