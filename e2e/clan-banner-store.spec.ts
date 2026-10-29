import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { COSMETIC_COLOR_PRESETS } from "@/lib/cosmetics/color-presets";
import { clanBannerUrl } from "@/lib/clan/banner-catalog";

test("카드 색상을 독립적으로 미리 보고 배너 기본 탭과 분류·검색·모달을 유지한다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const base = f.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base + "/store");
    await expect(page.getByRole("radio", { name: "전체", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "배너", exact: true })).toBeChecked();
    await expect(page.getByRole("article")).toHaveCount(10);
    const diagonal = page.getByRole("article", { name: "사선", exact: true });
    const other = page.getByRole("article", { name: "미니 도트", exact: true });
    await expect(diagonal.getByRole("radio")).toHaveCount(6);
    await page.waitForLoadState("networkidle");
    const assetRequests: string[] = [], writes: string[] = [];
    page.on("request", request => {
      if (request.url().includes("/clan-banners/")) assetRequests.push(request.url());
      if (request.method() === "POST") writes.push(request.url());
    });
    const before = await diagonal.boundingBox();
    await diagonal.getByRole("radio", { name: "로즈", exact: true }).check();
    await expect(diagonal.locator('[data-banner-palette="rose"]')).toBeVisible();
    await expect(other.locator('[data-banner-palette="graphite"]')).toBeVisible();
    expect(await diagonal.boundingBox()).toEqual(before);
    expect(assetRequests).toEqual([]);
    await diagonal.getByRole("button", { name: "사선 미리보기", exact: true }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByRole("radio", { name: "로즈", exact: true })).toBeChecked();
    await modal.getByRole("radio", { name: "블루", exact: true }).check();
    await modal.getByRole("button", { name: "닫기", exact: true }).first().click();
    await expect(diagonal.getByRole("radio", { name: "블루", exact: true })).toBeChecked();
    await page.getByLabel("디자인 검색", { exact: true }).fill("사선");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByLabel("디자인 검색", { exact: true }).fill("");
    for (const [category, count] of [["반응", 1], ["사진", 2], ["보유", 0]] as const) {
      await page.getByRole("radio", { name: category, exact: true }).click();
      await expect(page.getByRole("article")).toHaveCount(count);
    }
    await page.getByRole("radio", { name: "배너", exact: true }).click();
    await expect(diagonal.getByRole("radio", { name: "블루", exact: true })).toBeChecked();
    await other.getByRole("radio", { name: "앰버", exact: true }).check();
    await page.screenshot({ path: test.info().outputPath("banner-card-colors-desktop.png"), fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await diagonal.getByRole("radio", { name: "퍼플", exact: true }).check();
      await expect(diagonal.locator('[data-banner-palette="purple"]')).toBeVisible();
      const hit = await diagonal.getByRole("radio", { name: "퍼플", exact: true }).boundingBox();
      expect(hit!.width).toBeGreaterThanOrEqual(44);
      expect(hit!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath("banner-card-colors-mobile.png"), fullPage: true });
    expect(writes).toEqual([]);
    expect((await f.service.from("clans").select("banner_url").eq("id", f.clanId).single()).data!.banner_url).toBeNull();
  } finally { await f.cleanup(); }
});

test("노말 패턴을 10코인에 한 번 구매한 뒤 모든 색상을 추가 차감 없이 적용한다", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  const base = f.path.replace(/\/balance$/, "");
  const memberContext = await browser.newContext();
  const state = async () => (await f.service.from("clans").select("coin_balance,banner_url").eq("id", f.clanId).single()).data;
  try {
    await f.service.from("clans").update({ coin_balance: 100, subscription_tier: "free" }).eq("id", f.clanId);
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "배너", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(10);
    await expect(page.getByRole("article").getByText("노말", { exact: true })).toHaveCount(10);
    const product = page.getByRole("article", { name: "사선", exact: true });
    await product.getByRole("button", { name: "사선 미리보기", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "로즈", exact: true }).check();
    await expect(dialog.locator('[data-banner-palette="rose"]')).toBeVisible();
    await dialog.getByRole("button", { name: "닫기", exact: true }).first().click();
    await product.getByRole("button", { name: "구매", exact: true }).click();
    await expect(dialog.getByText("10 코인", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/모든 제공 색상이 포함/)).toBeVisible();
    await dialog.getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(product.getByText("보유 중", { exact: true })).toBeVisible();
    expect((await state())?.coin_balance).toBe(90);
    await product.getByRole("link", { name: "구매 완료 · 설정하기", exact: true }).click();
    const banners = page.getByRole("region", { name: "클랜 배너", exact: true });
    await banners.getByRole("button", { name: "사선", exact: true }).click();
    for (const palette of COSMETIC_COLOR_PRESETS) {
      await banners.getByRole("radio", { name: palette.name, exact: true }).check();
      await banners.getByRole("button", { name: "배너 적용", exact: true }).click();
      await expect.poll(state).toEqual({ coin_balance: 90, banner_url: clanBannerUrl({ designId: "forest-diagonal", paletteId: palette.id }) });
    }
    await page.reload();
    await expect(banners.getByRole("radio", { name: "앰버", exact: true })).toBeChecked();
    await expect(banners.getByRole("button", { name: "배너 적용", exact: true })).toBeDisabled();
    expect((await f.service.from("purchases").select("id").eq("clan_id", f.clanId)).data).toHaveLength(1);
    await page.goto(base);
    await expect(page.locator('[data-banner-design="forest-diagonal"][data-banner-palette="amber"]')).toBeVisible();
    const member = await memberContext.newPage();
    await loginIsolatedBalanceUser(member, f.users[1]);
    await member.goto(base);
    await expect(member.locator('[data-banner-design="forest-diagonal"][data-banner-palette="amber"]')).toBeVisible();
    await member.goto(base + "/store");
    await expect(member.getByRole("article", { name: "사선", exact: true }).getByRole("button", { name: "권한 필요", exact: true })).toBeDisabled();
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "배너", exact: true }).click();
    await expect(page.getByRole("article", { name: "사선", exact: true }).getByText("적용 중", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("normal-banner-store-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("normal-banner-store-mobile.png"), fullPage: true });
  } finally { await memberContext.close(); await f.cleanup(); }
});
