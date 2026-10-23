import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("award cases prefer the best recent grade and filter full history by gold, silver and bronze", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const isolated = await createIsolatedBalanceFixture(3);
  const previousYear = new Date().getUTCFullYear() - 1;
  const user = isolated.users[0];
  const statsUrl = isolated.path.replace(/balance$/, "stats") + "?player=" + user.id;
  try {
    const matches = await ok(isolated.service.from("matches").insert([
      `${previousYear - 1}-06-12T10:00:00Z`, `${previousYear}-02-12T10:00:00Z`, `${previousYear}-04-12T10:00:00Z`, `${previousYear}-12-12T10:00:00Z`,
    ].map(played_at => ({
      clan_id: isolated.clanId, game_id: isolated.gameId, match_type: "intra", status: "finished",
      played_at, map_label: "네팔", created_by: user.id,
    } as const))).select("id"));
    await ok(isolated.service.from("match_players").insert(matches.flatMap((match, index) => [
      { match_id: match.id, user_id: user.id, team: index >= 2 ? 2 : 1 },
      { match_id: match.id, user_id: isolated.users[1].id, team: index >= 2 ? 1 : 2 },
      ...(index === 3 ? [{ match_id: match.id, user_id: isolated.users[2].id, team: 1 }] : []),
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
    const collection = page.locator('section[aria-label="개인 엠블럼"]');
    await expect(collection).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const filters = collection.getByRole("radiogroup", { name: "엠블럼 분류", exact: true });
    await expect(filters.getByRole("radio")).toHaveText(["전체", "수상", "달성"]);
    await expect(collection.getByRole("combobox")).toHaveCount(0);
    await expect(collection.getByRole("heading", { name: "수상", exact: true })).toBeVisible();
    const tray = collection.locator('section[aria-label="대표 엠블럼 진열"]');
    await expect(tray.getByRole("img", { name: "빈 대표 엠블럼 칸", exact: true })).toHaveCount(3);
    await expect(collection.locator('[data-emblem-key="month-' + previousYear + '-02-승률"]')).toHaveCount(1);
    await expect(collection.locator('[data-emblem-key="month-' + previousYear + '-12-승률"]')).toHaveCount(0);
    await filters.getByRole("radio", { name: "달성", exact: true }).click();
    await expect(collection.getByRole("region", { name: "누적 달성 엠블럼", exact: true })).toBeVisible();
    await expect(collection.locator('[data-emblem-key^="month-"],[data-emblem-key^="year-"]')).toHaveCount(0);
    await filters.getByRole("radio", { name: "수상", exact: true }).click();
    await expect(collection.locator('[data-emblem-key^="milestone-"]')).toHaveCount(0);
    const monthlyWin = collection.getByRole("button", { name: "월간 승률 1위 획득", exact: true });
    await expect(monthlyWin).toHaveAttribute("data-emblem-key", `month-${previousYear}-02-승률`);
    const monthlyImage = await monthlyWin.locator("img").getAttribute("src");
    expect(decodeURIComponent(monthlyImage ?? "")).toContain("/awards/month/victory-gold.png");
    const images = await collection.locator('[data-emblem-key] img').evaluateAll(elements => elements.map(image => image.getAttribute("src")));
    expect(new Set(images).size).toBeGreaterThan(1);
    await page.setViewportSize({ width: 1304, height: 1100 });
    await collection.screenshot({ animations: "disabled", path: info.outputPath("personal-emblem-awards-desktop.png") });
    await monthlyWin.click();
    const details = page.getByRole("dialog");
    await expect(page.getByRole("dialog", { name: "월간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByRole("heading", { name: "월간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByText(`${previousYear}년 2월`, { exact: true })).toBeVisible();
    await expect(details.getByText("금 · 1위", { exact: true })).toBeVisible();
    const history = details.getByRole("group", { name: "같은 종류의 수상 이력", exact: true });
    await expect(history.getByRole("button")).toHaveCount(6);
    const grades = details.getByRole("radiogroup", { name: "수상 등급", exact: true });
    await grades.getByRole("radio", { name: "금", exact: true }).click();
    await expect(history.getByRole("button")).toHaveCount(3);
    await expect(history.getByRole("button", { name: /1위 획득/ })).toHaveCount(3);
    await grades.getByRole("radio", { name: "은", exact: true }).click();
    await expect(history.getByRole("button")).toHaveCount(1);
    await expect(details.getByRole("heading", { name: "월간 승률 2위", exact: true })).toBeVisible();
    await expect(details.getByText(`${previousYear}년 4월`, { exact: true })).toBeVisible();
    await grades.getByRole("radio", { name: "동", exact: true }).click();
    await expect(history.getByRole("button")).toHaveCount(2);
    await expect(history.getByRole("button", { name: /3위 획득/ })).toHaveCount(2);
    await grades.getByRole("radio", { name: "전체", exact: true }).click();
    await expect(history.getByRole("button")).toHaveCount(6);
    const earlier = history.locator(`[data-emblem-key="month-${previousYear - 1}-06-승률"]`);
    await earlier.click();
    await expect(earlier).toHaveAttribute("aria-pressed", "true");
    await expect(details.getByText(`${previousYear - 1}년 6월`, { exact: true })).toBeVisible();
    await details.getByRole("button", { name: "대표 엠블럼 지정", exact: true }).click();
    await expect(details.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeEnabled();
    expect((await isolated.service.from("clan_personal_emblem_picks").select("emblem_keys").eq("clan_id", isolated.clanId).eq("user_id", user.id).single()).data?.emblem_keys)
      .toEqual([`month-${previousYear - 1}-06-승률`]);
    await expect(tray.locator('[data-featured-emblem-key]')).toHaveCount(1);
    await details.getByRole("button", { name: "대표 엠블럼 해제", exact: true }).click();
    await expect(tray.locator('[data-featured-emblem-key]')).toHaveCount(0);
    await expect(details.getByRole("button", { name: "대표 엠블럼 지정", exact: true })).toBeEnabled();
    await details.getByRole("button", { name: "대표 엠블럼 지정", exact: true }).click();
    await expect(tray.locator('[data-featured-emblem-key]')).toHaveCount(1);
    await details.screenshot({ path: info.outputPath("personal-emblem-award-detail-desktop.png") });
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
    await expect(monthlyWin).toBeFocused();
    await expect(monthlyWin).toHaveAttribute("data-emblem-key", `month-${previousYear}-02-승률`);
    await expect(collection.locator('[aria-busy="true"]')).toHaveCount(0);
    for (const width of [320, 390, 568, 640, 685, 768, 1024, 1074, 1304]) {
      await page.setViewportSize({ width, height: 1004 });
      const featuredBounds = await tray.locator('[data-featured-emblem-key]').boundingBox();
      expect(featuredBounds).not.toBeNull();
      expect(Math.abs(featuredBounds!.width - 44)).toBeLessThan(1);
      expect(Math.abs(featuredBounds!.height - 44)).toBeLessThan(1);
      const featuredImageBounds = await tray.locator('[data-featured-emblem-key] img').boundingBox();
      expect(featuredImageBounds).not.toBeNull();
      const headerBounds = await collection.locator("header").boundingBox();
      const headingBounds = await collection.locator("header > div").boundingBox();
      const trayBounds = await tray.boundingBox();
      expect(Math.abs(trayBounds!.x + trayBounds!.width - headerBounds!.x - headerBounds!.width)).toBeLessThan(1);
      if (width >= 390) {
        expect(trayBounds!.x).toBeGreaterThanOrEqual(headingBounds!.x + headingBounds!.width);
        expect(Math.abs(trayBounds!.y + trayBounds!.height / 2 - headingBounds!.y - headingBounds!.height / 2)).toBeLessThan(1);
      } else expect(trayBounds!.y).toBeGreaterThanOrEqual(headingBounds!.y + headingBounds!.height);
      const frameBounds = await collection.locator('[aria-busy]').evaluateAll(elements => elements.map(element => {
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, width: bounds.width };
      }));
      expect(Math.abs(frameBounds[0].width - 158)).toBeLessThan(1);
      expect(Math.abs(frameBounds[1].x - headerBounds!.x)).toBeLessThan(1);
      expect(Math.abs(frameBounds[1].width - headerBounds!.width)).toBeLessThan(1);
      let catalogSize: number | undefined;
      for (const category of ["전체", "수상", "달성"]) {
        await filters.getByRole("radio", { name: category, exact: true }).click();
        const sizes = await collection.locator('[data-emblem-key]').evaluateAll(elements => elements.map(element => {
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height, left: bounds.left, right: bounds.right };
        }));
        expect(sizes.length).toBeGreaterThan(0);
        catalogSize ??= sizes[0].width;
        for (const size of sizes) {
          expect(size.width).toBeGreaterThan(featuredBounds!.width);
          expect(Math.abs(size.width - catalogSize)).toBeLessThan(1);
          expect(Math.abs(size.height - catalogSize)).toBeLessThan(1);
          expect(size.left).toBeGreaterThanOrEqual(0);
          expect(size.right).toBeLessThanOrEqual(width);
        }
        const artworkSizes = await collection.locator('[data-emblem-key] img').evaluateAll(elements => elements.map(element => {
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height };
        }));
        for (const size of artworkSizes) {
          expect(size.width).toBeGreaterThan(featuredImageBounds!.width);
          expect(Math.abs(size.width - size.height)).toBeLessThan(1);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([568, 685, 1074].includes(width)) {
        await filters.getByRole("radio", { name: "수상", exact: true }).click();
        await collection.screenshot({ animations: "disabled", path: info.outputPath(`personal-emblem-grid-${width}.png`) });
      }
    }
    await filters.getByRole("radio", { name: "수상", exact: true }).click();
    await collection.screenshot({ animations: "disabled", path: info.outputPath("personal-emblem-awards-desktop.png") });
    const featuredPin = tray.locator('[data-featured-emblem-key]');
    await featuredPin.click();
    await expect(details.getByText(`${previousYear - 1}년 6월`, { exact: true })).toBeVisible();
    await expect(grades.getByRole("radio", { name: "전체", exact: true })).toBeChecked();
    await history.locator(`[data-emblem-key="year-${previousYear - 1}-승률"]`).click();
    const yearlyImage = await details.getByRole("region", { name: "엠블럼 상세", exact: true }).locator("..").locator("img").first().getAttribute("src");
    expect(decodeURIComponent(yearlyImage ?? "")).toContain("/awards/year/victory-gold.png");
    expect(yearlyImage).not.toBe(monthlyImage);
    await expect(page.getByRole("dialog", { name: "연간 승률 1위", exact: true })).toBeVisible();
    await expect(details.getByRole("heading", { name: "연간 승률 1위", exact: true })).toBeVisible();
    await expect(history.getByRole("button")).toHaveCount(6);
    await expect(details.getByText(`${previousYear - 1}년 연간`, { exact: true })).toBeVisible();
    await details.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(details).toHaveCount(0);
    await expect(featuredPin).toBeFocused();

    const touchContext = await browser.newContext({ baseURL: new URL(page.url()).origin,
      hasTouch: true, viewport: { width: 320, height: 844 }, storageState: await page.context().storageState() });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto(statsUrl);
      await touchPage.getByRole("region", { name: "플레이어 배너", exact: true })
        .getByRole("link", { name: `${user.nickname} 엠블럼 케이스 열기`, exact: true }).tap();
      const touchCollection = touchPage.getByRole("region", { name: "개인 엠블럼", exact: true });
      await expect(touchCollection).toBeVisible();
      await touchCollection.getByRole("radio", { name: "수상", exact: true }).tap();
      const monthlyTouchPin = touchCollection.getByRole("button", { name: "월간 승률 1위 획득", exact: true });
      await monthlyTouchPin.tap();
      const touchDetails = touchPage.getByRole("dialog");
      await expect(touchDetails.getByRole("heading", { name: "월간 승률 1위", exact: true })).toBeVisible();
      await expect(touchDetails.getByText(`${previousYear}년 2월`, { exact: true })).toBeVisible();
      const touchHistory = touchDetails.getByRole("group", { name: "같은 종류의 수상 이력", exact: true });
      await expect(touchHistory.getByRole("button")).toHaveCount(6);
      const touchGrades = touchDetails.getByRole("radiogroup", { name: "수상 등급", exact: true });
      await touchGrades.getByRole("radio", { name: "동", exact: true }).tap();
      await expect(touchHistory.getByRole("button")).toHaveCount(2);
      await touchGrades.getByRole("radio", { name: "금", exact: true }).tap();
      await expect(touchHistory.getByRole("button")).toHaveCount(3);
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
      await expect(touchCollection.locator('[data-featured-emblem-key]')).toHaveCount(1);
      await touchCollection.screenshot({ animations: "disabled", path: info.outputPath("personal-emblem-awards-mobile.png") });
    } finally { await touchContext.close(); }
  } finally { await isolated.cleanup(); }
});
