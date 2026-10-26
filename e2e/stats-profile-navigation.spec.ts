import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000, hasTouch: true });

test("개인 기록의 공통 네임카드는 해당 플레이어 소개로, 엠블럼은 해당 플레이어 케이스로 연결한다", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), player = f.users[1];
  const battleTag = "RecordPlayer#2222", statsUrl = f.path.replace(/balance$/, "stats") + "?player=" + player.id;
  async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) { const r = await query; expect(r.error).toBeNull(); return r.data!; }
  try {
    await ok(f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", player.id).eq("game_id", f.gameId));
    const title = await ok(f.service.from("nameplate_options").select("id,name_ko").eq("code", "title-team-player").single());
    await ok(f.service.from("user_nameplate_inventory").insert({ user_id: player.id, option_id: title.id }));
    const cardOwner = await f.memberClient(1);
    try { await ok(cardOwner.from("user_namecard_selections").insert({ user_id: player.id, category: "sub", option_id: title.id })); }
    finally { await cardOwner.auth.signOut(); }
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: player.id, family: "victory", rank: 1 }] }));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(statsUrl);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    const card = banner.getByRole("link", { name: `${battleTag} 프로필 보기`, exact: true });
    const namecard = banner.locator("[data-namecard]");
    await expect(namecard).toContainText(battleTag);
    await expect(namecard).toContainText(title.name_ko);
    await expect(card).toHaveAttribute("href", "/profile/" + player.id);
    await expect(card.getByRole("link")).toHaveCount(0);
    await expect(banner.getByRole("link", { name: "미니룸 방문", exact: true })).toHaveCount(0);
    await expect(banner.getByRole("link", { name: "엠블럼 케이스 보기 →", exact: true })).toHaveCount(0);
    const caseLink = namecard.getByRole("link", { name: / 엠블럼 케이스 열기$/ });
    await expect(banner.getByRole("link")).toHaveCount(2);
    await expect(banner.locator("a a")).toHaveCount(0);
    await expect(caseLink).toHaveAttribute("href", `/profile/${player.id}/emblems?clan=${f.clanId}`);
    const cardBounds = (await namecard.boundingBox())!, caseBounds = (await caseLink.boundingBox())!;
    expect(caseBounds.x).toBeGreaterThan(cardBounds.x + cardBounds.width / 2);
    expect(caseBounds.x + caseBounds.width).toBeLessThan(cardBounds.x + cardBounds.width);
    expect(caseBounds.y).toBeGreaterThan(cardBounds.y);
    expect(caseBounds.y + caseBounds.height).toBeLessThan(cardBounds.y + cardBounds.height);
    await page.screenshot({ path: info.outputPath("stats-player-namecard.png"), fullPage: false });
    await caseLink.click({ position: { x: 2, y: 2 } });
    await expect(page).toHaveURL(new RegExp(`/profile/${player.id}/emblems`));
    await expect(page.getByRole("heading", { name: "엠블럼 케이스", level: 2, exact: true })).toBeVisible();
    const api = await page.request.get("/api/personal-emblems/featured?player=" + player.id);
    const collection = (await api.json()).collection;
    expect(collection.userId).toBe(player.id);
    expect(collection.canFeature).toBe(false);
    expect(collection.sources.some((source: { emblems: { earned: boolean }[] }) => source.emblems.some(emblem => emblem.earned))).toBe(true);
    await page.goto(statsUrl);
    await card.press("Enter");
    await expect(page).toHaveURL("/profile/" + player.id);
    const identity = page.getByRole("region", { name: "플레이어 소개", exact: true });
    await expect(identity.locator("[data-namecard]")).toContainText(battleTag);
    await expect(identity.locator("[data-namecard]")).toContainText(title.name_ko);
    await expect(identity.getByText("아직 작성한 소개가 없습니다.", { exact: true })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "네임카드 도구", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 884 });
    await page.goto(statsUrl);
    await expect(card).toBeVisible();
    await expect(caseLink).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const mobileCard = (await namecard.boundingBox())!, mobileCase = (await caseLink.boundingBox())!;
    expect(mobileCase.height).toBeGreaterThanOrEqual(44);
    expect(mobileCase.x + mobileCase.width).toBeLessThan(mobileCard.x + mobileCard.width);
    expect(mobileCase.y + mobileCase.height).toBeLessThan(mobileCard.y + mobileCard.height);
    await caseLink.tap();
    await expect(page).toHaveURL(new RegExp(`/profile/${player.id}/emblems`));
    await page.goto(statsUrl);
    await card.tap();
    await expect(page).toHaveURL("/profile/" + player.id);
  } finally { await f.cleanup(); }
});
