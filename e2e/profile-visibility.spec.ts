import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

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
    expect((await f.service.auth.admin.updateUserById(owner.id, { user_metadata: { profile_intro: intro } })).error).toBeNull();
    await ok(f.service.from("profile_visibility").insert({ user_id: owner.id, room_public: false, show_intro: false, show_games: false, show_clan: false, show_emblems: false }));
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
    for (const value of [owner.email, owner.nickname, stored.id, "coinBalance", "auto_login", "birth_year"]) expect(html).not.toContain(value);
    await expect(visitor.getByText(intro, { exact: true })).toBeVisible();
    await expect(visitor.getByRole("article").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(visitor.getByRole("tab", { name: "계정 정보", exact: true })).toHaveCount(0);
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
    await expect(visitor.getByText(intro, { exact: true })).toBeVisible();
    await expect(tray.locator("[data-featured-emblem-reference]")).toHaveCount(1);
    await expect(visitor.getByRole("button", { name: "꾸미기", exact: true })).toHaveCount(0);
    await expect(visitor.getByRole("img", { name: "작은 여우", exact: true })).toBeVisible();
    for (const width of [1023, 320]) {
      await visitor.setViewportSize({ width, height: 884 });
      expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await visitor.screenshot({ path: info.outputPath("profile-public-visitor-mobile.png"), fullPage: true });
    const guestContext = await browser.newContext();
    try { const guest = await guestContext.newPage(); await guest.goto(visitUrl); await expect(guest).toHaveURL(/\/sign-in\?next=/); } finally { await guestContext.close(); }
    await visitor.goto("/profile/not-a-player"); await expect(visitor.getByTestId("profile-hero")).toHaveCount(0);
  } finally { await visitorContext.close(); await f.cleanup(); }
});
