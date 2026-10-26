import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("프로필은 로그인한 다른 클랜에도 공개하고 계정 정보·보관함·편집 권한은 제공하지 않는다", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), owner = f.users[0];
  const visitorContext = await browser.newContext(), visitor = await visitorContext.newPage();
  const battleTag = "Public" + owner.id.slice(0, 8) + "#1234", intro = "공개 프로필 소개";
  const key = "month-2024-02-승률";
  async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) { const r = await query; expect(r.error).toBeNull(); return r.data!; }
  try {
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await ok(f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", owner.id).eq("game_id", f.gameId));
    const title = await ok(f.service.from("nameplate_options").select("id,name_ko").eq("code", "title-team-player").single());
    await ok(f.service.from("user_nameplate_inventory").insert({ user_id: owner.id, option_id: title.id }));
    const cardOwner = await f.memberClient(0);
    try { await ok(cardOwner.from("user_namecard_selections").insert({ user_id: owner.id, category: "sub", option_id: title.id })); }
    finally { await cardOwner.auth.signOut(); }
    const valorant = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    const privateId = "UnverifiedPublic#KR1";
    await ok(f.service.from("user_game_profiles").insert({ user_id: owner.id, game_id: valorant.id, game_uid: "private-provider-id", riot_id: privateId, is_verified: false }));
    expect((await f.service.auth.admin.updateUserById(owner.id, { user_metadata: { profile_intro: intro } })).error).toBeNull();
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: owner.id, family: "victory", rank: 1 }] }));
    await ok(f.service.from("account_personal_emblem_picks").insert({ user_id: owner.id, emblem_keys: [f.clanId + ":" + key] }));
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const ownerClient = await f.memberClient(0);
    await ok(ownerClient.rpc("get_my_housing"));
    await ownerClient.auth.signOut();
    const stored = await ok(f.service.from("user_housing_inventory").select("id").eq("user_id", owner.id).eq("catalog_id", "small-plant").single());
    await ok(f.service.from("user_housing_inventory").update({ x: null, y: null }).eq("id", stored.id));
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await expect(page.getByRole("heading", { name: "프로필 공개 설정", exact: true })).toHaveCount(0);
    await expect(page.getByRole("switch", { name: /공개/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "내 계정", exact: true }).getByText(owner.email, { exact: true })).toBeVisible();
    await loginIsolatedBalanceUser(visitor, f.users[1]);
    const visitUrl = "/profile/" + owner.id;
    const response = await visitor.goto(visitUrl), html = await response!.text();
    for (const value of [owner.email, owner.nickname, stored.id, privateId, "private-provider-id", "coinBalance", "auto_login", "birth_year"]) expect(html).not.toContain(value);
    const visitorIntro = visitor.getByRole("region", { name: "한 줄 소개", exact: true }).getByText(intro, { exact: true });
    await expect(visitor.getByRole("heading", { name: `${battleTag}의 프로필`, exact: true })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "플레이어 프로필", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("link", { name: "내 프로필", exact: true })).toHaveCount(0);
    await expect(visitorIntro).toBeVisible();
    await expect(visitor.getByRole("article").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(visitor.getByRole("tab", { name: "계정 정보", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("region", { name: "기본 정보", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("region", { name: "공통 네임카드", exact: true })).toHaveCount(0);
    const identity = visitor.getByRole("region", { name: "플레이어 소개", exact: true });
    const gameCard = identity.getByRole("article").filter({ visible: true }).locator("[data-namecard]");
    await expect(gameCard).toContainText(title.name_ko);
    await expect(visitor.getByRole("toolbar", { name: "네임카드 도구", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("button", { name: "한 줄 소개 편집", exact: true })).toHaveCount(0);
    await expect(identity.getByRole("heading", { name: "게임 프로필", exact: true })).toBeVisible();
    await identity.getByRole("button", { name: "발로란트", exact: true }).click();
    await expect(gameCard).toContainText("Player");
    await expect(gameCard).toContainText(title.name_ko);
    await identity.getByRole("button", { name: new RegExp("^오버워치") }).click();
    await expect(gameCard).toContainText(battleTag);
    const main = (await gameCard.boundingBox())!, aside = (await visitorIntro.boundingBox())!;
    expect(main.x + main.width).toBeLessThan(aside.x);
    const tray = visitor.getByRole("region", { name: "대표 엠블럼", exact: true });
    await expect(tray.locator("[data-featured-emblem-reference]")).toHaveCount(1);
    await tray.getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true }).click();
    await expect(visitor.getByRole("heading", { name: "엠블럼 케이스", exact: true })).toBeVisible();
    await expect(visitor.locator("[data-emblem-feature-key]")).toHaveCount(0);
    const api = await visitor.request.get("/api/personal-emblems/featured?player=" + owner.id);
    const collection = (await api.json()).collection;
    expect(collection.canFeature).toBe(false);
    expect(collection.sources.every((source: { emblems: { earned: boolean; progress?: number }[] }) => source.emblems.every(e => e.earned && e.progress === undefined))).toBe(true);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("user_id", owner.id));
    await visitor.goto(visitUrl);
    await expect(visitorIntro).toBeVisible();
    await expect(gameCard).toContainText(battleTag);
    await expect(gameCard).toContainText(title.name_ko);
    await expect(tray.locator("[data-featured-emblem-reference]")).toHaveCount(1);
    await expect(visitor.getByRole("button", { name: "꾸미기", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("region", { name: "진열장", exact: true })).toHaveCount(0);
    for (const width of [1023, 320]) {
      await visitor.setViewportSize({ width, height: 884 });
      expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await visitor.screenshot({ path: info.outputPath("profile-public-visitor-mobile.png"), fullPage: true });
    await ok(f.service.from("user_game_profiles").update({ battle_tag: null, game_uid: "internal#not-a-battletag" }).eq("user_id", owner.id).eq("game_id", f.gameId));
    const invalidIdentityResponse = await visitor.goto(visitUrl);
    expect(await invalidIdentityResponse!.text()).not.toContain("internal#not-a-battletag");
    await expect(gameCard).toContainText("Player");
    await ok(f.service.from("user_game_profiles").delete().eq("user_id", owner.id));
    await visitor.goto(visitUrl);
    await expect(identity.locator("[data-namecard]")).toContainText("Player");
    await expect(identity.locator("[data-namecard]")).toContainText(title.name_ko);
    const guestContext = await browser.newContext();
    try { const guest = await guestContext.newPage(); await guest.goto(visitUrl); await expect(guest).toHaveURL(/\/sign-in\?next=/); } finally { await guestContext.close(); }
    await visitor.goto("/profile/" + f.clanId);
    await expect(visitor.getByRole("heading", { name: "방문할 수 없는 프로필입니다", exact: true })).toBeVisible();
    await expect(identity).toHaveCount(0);
    await visitor.goto("/profile/not-a-player"); await expect(visitor.getByTestId("profile-hero")).toHaveCount(0);
  } finally { try { await visitorContext.close(); } finally { await f.cleanup(); } }
});
