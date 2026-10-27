import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("개인 소개 지연·실패·재시도에도 데스크톱과 모바일 배치를 유지한다", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), player = f.users[1];
  const intro = "함께 즐기는 플레이어입니다. ".repeat(6).slice(0, 120);
  const profileUrl = `**/api/player-profiles/${player.id}`;
  let release = () => {};
  let gate = Promise.resolve();
  let fail = false;
  try {
    expect((await f.service.auth.admin.updateUserById(player.id, { user_metadata: { profile_intro: intro } })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.route(profileUrl, async route => {
      await gate;
      if (fail) await route.fulfill({ status: 503, json: { error: "unavailable" } });
      else await route.continue();
    });
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    const identity = banner.getByRole("region", { name: "플레이어 소개", exact: true });
    const card = identity.locator("[data-namecard]");
    const facts = banner.getByRole("region", { name: "기본 정보", exact: true });
    const introRegion = banner.getByRole("region", { name: "한 줄 소개", exact: true });
    const caseLink = banner.getByRole("link", { name: / 엠블럼 케이스 열기$/ });
    const bounds = async () => Promise.all([banner, card, facts, introRegion, caseLink].map(locator => locator.boundingBox()));
    for (const width of [1280, 390, 320]) {
      gate = new Promise<void>(resolve => { release = resolve; });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + player.id);
      await expect(banner).toHaveAttribute("aria-busy", "true");
      await expect(introRegion.getByRole("status")).toContainText("플레이어 소개를 불러오는 중");
      await expect(card).toBeVisible();
      await expect(facts).toBeVisible();
      await expect(caseLink).toBeVisible();
      const before = await bounds();
      const identityNode = await identity.elementHandle(), cardNode = await card.elementHandle(), caseNode = await caseLink.elementHandle();
      if (width === 1280) await page.screenshot({ path: info.outputPath("profile-loading-desktop.png") });
      release();
      await expect(banner).toHaveAttribute("aria-busy", "false");
      await expect(introRegion).toContainText(intro);
      const after = await bounds();
      for (let i = 0; i < before.length; i++) for (const axis of ["x", "y", "width", "height"] as const) {
        expect(Math.abs(before[i]![axis] - after[i]![axis]), `${width}px element ${i} ${axis}`).toBeLessThan(1);
      }
      for (const node of [identityNode, cardNode, caseNode]) expect(await node!.evaluate(element => element.isConnected)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 320) {
        expect(await introRegion.locator("[data-profile-intro]").evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
        await page.screenshot({ path: info.outputPath("profile-loaded-mobile.png"), fullPage: true });
      }
    }
    fail = true;
    gate = Promise.resolve();
    await page.reload();
    await expect(banner.getByRole("alert")).toContainText("플레이어 소개를 불러오지 못했습니다.");
    const errorBounds = await bounds();
    fail = false;
    gate = new Promise<void>(resolve => { release = resolve; });
    await banner.getByRole("button", { name: "다시 불러오기", exact: true }).click();
    await expect(banner).toHaveAttribute("aria-busy", "true");
    const retryBounds = await bounds();
    expect(retryBounds[0]!.height).toBe(errorBounds[0]!.height);
    release();
    await expect(introRegion).toContainText(intro);
    expect((await banner.boundingBox())!.height).toBe(errorBounds[0]!.height);
  } finally { release(); await page.unroute(profileUrl); await f.cleanup(); }
});
