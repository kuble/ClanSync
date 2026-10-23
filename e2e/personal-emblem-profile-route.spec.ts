import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("개인 엠블럼은 프로필 경로·탐색을 사용하고 클랜별 열람 권한을 유지한다", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3);
  const peerContext = await browser.newContext();
  const peer = await peerContext.newPage();
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  const [owner, member, other] = f.users;
  const path = `/profile/${owner.id}/emblems?clan=${f.clanId}`;
  const legacy = f.path.replace(/balance$/, "emblems");
  try {
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", other.id)).error).toBeNull();
    expect((await f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "member", member_personal_sections: ["emblems", "records"] } }).eq("clan_id", f.clanId)).error).toBeNull();
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp("/sign-in\\?next="));
    expect(new URL(page.url()).searchParams.get("next")).toBe(path);
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const launcher = page.getByRole("region", { name: "플레이어 소개", exact: true }).getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true });
    await expect(launcher).toHaveAttribute("href", `/profile/${owner.id}/emblems`);
    await launcher.click();
    await expect(page).toHaveURL(`/profile/${owner.id}/emblems`);
    await expect(page.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toBeVisible();
    const breadcrumb = page.getByRole("navigation", { name: "현재 위치", exact: true });
    await expect(breadcrumb.getByRole("link", { name: "프로필", exact: true })).toHaveAttribute("href", "/profile");
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("개인 엠블럼");
    await expect(page.getByRole("navigation", { name: "클랜 메뉴", exact: true })).toHaveCount(0);
    for (const width of [1023, 390, 320]) {
      await page.setViewportSize({ width, height: 884 });
      await expect(breadcrumb).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.setViewportSize({ width: 1023, height: 884 });
    const appearance = await breadcrumb.evaluate((element) => ({ fontSize: getComputedStyle(element).fontSize, gap: getComputedStyle(element).gap }));
    await page.goto(f.path);
    const clanBreadcrumb = page.getByRole("navigation", { name: "현재 위치", exact: true });
    expect(await clanBreadcrumb.evaluate((element) => ({ fontSize: getComputedStyle(element).fontSize, gap: getComputedStyle(element).gap }))).toEqual(appearance);
    await expect(page.locator('[data-header-breadcrumbs] [data-brand-symbol]')).toBeVisible();
    await page.goto(path);
    await page.screenshot({ path: info.outputPath("profile-emblem-case.png"), fullPage: true });
    for (const url of [legacy, legacy + "?player=" + owner.id]) {
      await page.goto(url);
      await expect(page).toHaveURL(path);
      await expect(breadcrumb).toBeVisible();
    }
    await loginIsolatedBalanceUser(peer, member);
    await peer.goto(legacy + "?player=" + owner.id);
    await expect(peer).toHaveURL(path);
    await expect(peer.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toBeVisible();
    await expect(peer.getByRole("navigation", { name: "현재 위치", exact: true }).getByRole("link", { name: "프로필", exact: true })).toHaveAttribute("href", `/profile/${owner.id}`);
    await expect(peer.locator("[data-emblem-feature-key]")).toHaveCount(0);
    await loginIsolatedBalanceUser(outsider, other);
    await outsider.goto(path);
    await expect(outsider.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toHaveCount(0);
    await expect(outsider.getByText("접근 권한이 없습니다", { exact: false })).toBeVisible();
    for (const url of [`/profile/${owner.id}/emblems?clan=invalid`, `/profile/${owner.id}/emblems?clan=${f.clanId}&clan=${f.clanId}`]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toHaveCount(0);
    }
  } finally {
    await peerContext.close();
    await outsiderContext.close();
    await f.cleanup();
  }
});
