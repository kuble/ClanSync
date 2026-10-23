import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("award families show the latest pin and open every monthly/yearly award in the history dialog", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const isolated = await createIsolatedBalanceFixture(2);
  const previousYear = new Date().getUTCFullYear() - 1;
  const user = isolated.users[0];
  const statsUrl = isolated.path.replace(/balance$/, "stats") + "?player=" + user.id;
  try {
    const matches = await ok(isolated.service.from("matches").insert([
      `${previousYear - 1}-06-12T10:00:00Z`, `${previousYear}-02-12T10:00:00Z`, `${previousYear}-12-12T10:00:00Z`,
    ].map(played_at => ({
      clan_id: isolated.clanId, game_id: isolated.gameId, match_type: "intra", status: "finished",
      played_at, map_label: "네팔", created_by: user.id,
    } as const))).select("id"));
    await ok(isolated.service.from("match_players").insert(matches.flatMap(match => [
      { match_id: match.id, user_id: user.id, team: 1 },
      { match_id: match.id, user_id: isolated.users[1].id, team: 2 },
    ])));
    await ok(isolated.service.from("match_results").insert(matches.map(match => ({ match_id: match.id, winner_team: 1 }))));
    await ok(isolated.service.from("clan_personal_emblem_picks").upsert({ clan_id: isolated.clanId, user_id: user.id, emblem_keys: [] }));
    await loginIsolatedBalanceUser(page, user);
    await page.goto(statsUrl);
    const trigger = page.getByRole("region", { name: "플레이어 배너", exact: true })
      .getByRole("link", { name: `${user.nickname} 엠블럼 케이스 열기`, exact: true });
    await expect(trigger).toHaveAttribute("href", isolated.path.replace(/balance$/, "emblems") + "?player=" + user.id);
    await trigger.click();
    await expect(page.getByRole("heading", { name: "개인 엠블럼 케이스", level: 2, exact: true })).toBeVisible();
    const collection = page.getByRole("region", { name: "개인 엠블럼", exact: true });
    await expect(collection).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const filters = collection.getByRole("radiogroup", { name: "엠블럼 분류", exact: true });
    await expect(collection.locator('[data-emblem-key="year-' + previousYear + '-승률"]')).toHaveCount(1);
    await expect(collection.locator('[data-emblem-key="month-' + previousYear + '-12-승률"]')).toHaveCount(0);
    await filters.getByRole("radio", { name: "월간", exact: true }).click();
    await collection.getByRole("combobox", { name: "엠블럼 연도", exact: true }).selectOption(String(previousYear));
    const monthly = collection.locator(`[data-emblem-key^="month-${previousYear}-12-"]`);
    await expect(monthly.first()).toBeVisible();
    await expect(collection.locator(`[data-emblem-key^="month-${previousYear}-02-"]`)).toHaveCount(0);
    const monthlyWin = collection.getByRole("button", { name: "월간 승률 1위 획득", exact: true });
    await expect(monthlyWin).toHaveAttribute("data-emblem-key", `month-${previousYear}-12-승률`);
    await collection.getByRole("combobox", { name: "엠블럼 연도", exact: true }).selectOption(String(previousYear - 1));
    await expect(monthlyWin).toHaveAttribute("data-emblem-key", `month-${previousYear - 1}-06-승률`);
    await collection.getByRole("combobox", { name: "엠블럼 연도", exact: true }).selectOption(String(previousYear));
    const monthlyImage = await monthlyWin.locator("img").getAttribute("src");
    expect(decodeURIComponent(monthlyImage ?? "")).toContain("/awards/month/victory-gold.png");
    const images = await monthly.locator("img").evaluateAll(elements => elements.map(image => image.getAttribute("src")));
    expect(new Set(images).size).toBeGreaterThan(1);
    await page.setViewportSize({ width: 1304, height: 1100 });
    await collection.screenshot({ animations: "disabled", path: info.outputPath("personal-emblem-awards-desktop.png") });
    await monthlyWin.click();
    const details = page.getByRole("dialog");
    await expect(page.getByRole("dialog", { name: "월간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByRole("heading", { name: "월간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByText(`${previousYear}년 12월`, { exact: true })).toBeVisible();
    await expect(details.getByText("금 · 1위", { exact: true })).toBeVisible();
    const history = details.getByRole("group", { name: "같은 종류의 수상 이력", exact: true });
    await expect(history.getByRole("button")).toHaveCount(5);
    const earlier = history.locator(`[data-emblem-key="month-${previousYear}-02-승률"]`);
    await earlier.click();
    await expect(earlier).toHaveAttribute("aria-pressed", "true");
    await expect(details.getByText(`${previousYear}년 2월`, { exact: true })).toBeVisible();
    await details.getByRole("button", { name: "대표 엠블럼 지정", exact: true }).click();
    await expect(details.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeEnabled();
    expect((await isolated.service.from("clan_personal_emblem_picks").select("emblem_keys").eq("clan_id", isolated.clanId).eq("user_id", user.id).single()).data?.emblem_keys)
      .toEqual([`month-${previousYear}-02-승률`]);
    await details.screenshot({ path: info.outputPath("personal-emblem-award-detail-desktop.png") });
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
    await expect(monthlyWin).toBeFocused();
    await expect(monthlyWin).toHaveAttribute("data-emblem-key", `month-${previousYear}-12-승률`);
    await filters.getByRole("radio", { name: "연간", exact: true }).click();
    const yearlyWin = collection.getByRole("button", { name: "연간 승률 1위 획득", exact: true });
    const yearlyImage = await yearlyWin.locator("img").getAttribute("src");
    expect(decodeURIComponent(yearlyImage ?? "")).toContain("/awards/year/victory-gold.png");
    expect(yearlyImage).not.toBe(monthlyImage);
    await yearlyWin.click();
    await expect(page.getByRole("dialog", { name: "연간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByRole("heading", { name: "연간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByText(`${previousYear}년 연간`, { exact: true })).toBeVisible();
    await expect(history.getByRole("button")).toHaveCount(5);
    await history.locator(`[data-emblem-key="year-${previousYear - 1}-승률"]`).click();
    await expect(details.getByText(`${previousYear - 1}년 연간`, { exact: true })).toBeVisible();
    await details.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(details).toHaveCount(0);
    await expect(yearlyWin).toBeFocused();

    const touchContext = await browser.newContext({ baseURL: new URL(page.url()).origin,
      hasTouch: true, viewport: { width: 320, height: 844 }, storageState: await page.context().storageState() });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto(statsUrl);
      await touchPage.getByRole("region", { name: "플레이어 배너", exact: true })
        .getByRole("link", { name: `${user.nickname} 엠블럼 케이스 열기`, exact: true }).tap();
      const touchCollection = touchPage.getByRole("region", { name: "개인 엠블럼", exact: true });
      await expect(touchCollection).toBeVisible();
      await touchCollection.getByRole("radio", { name: "월간", exact: true }).tap();
      const monthlyTouchPin = touchCollection.getByRole("button", { name: "월간 승률 1위 획득", exact: true });
      await monthlyTouchPin.tap();
      const touchDetails = touchPage.getByRole("dialog", { name: "월간 승률 1위", exact: true });
      await expect(touchDetails.getByRole("heading", { name: "월간 승률 1위", exact: true })).toBeVisible();
      await expect(touchDetails.getByText(`${previousYear}년 12월`, { exact: true })).toBeVisible();
      const touchHistory = touchDetails.getByRole("group", { name: "같은 종류의 수상 이력", exact: true });
      await expect(touchHistory.getByRole("button")).toHaveCount(5);
      await touchHistory.locator(`[data-emblem-key="month-${previousYear}-02-승률"]`).tap();
      await expect(touchDetails.getByText(`${previousYear}년 2월`, { exact: true })).toBeVisible();
      expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await touchDetails.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
      await touchDetails.screenshot({ path: info.outputPath("personal-emblem-award-detail-mobile.png") });
      await touchDetails.getByRole("button", { name: "닫기", exact: true }).tap();
      await expect(touchDetails).toHaveCount(0);
      await expect(touchCollection).toBeVisible();
    } finally { await touchContext.close(); }
  } finally { await isolated.cleanup(); }
});
