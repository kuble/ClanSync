import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("통합 소개 API는 로그인 방문자에게 공개 정보만 제공하고 계정·보관함·미인증 ID를 제외한다", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2), owner = f.users[0];
  const visitorContext = await browser.newContext(), visitor = await visitorContext.newPage();
  const battleTag = "Public" + owner.id.slice(0, 8) + "#1234", intro = "공개 프로필 소개";
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
    await ok(f.service.from("user_game_profiles").insert({ user_id: owner.id, game_id: valorant.id, game_uid: "private-provider-id", riot_id: "UnverifiedPublic#KR1", is_verified: false }));
    expect((await f.service.auth.admin.updateUserById(owner.id, { user_metadata: { profile_intro: intro } })).error).toBeNull();
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: owner.id, family: "victory", rank: 1 }] }));
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await expect(page.getByRole("region", { name: "내 계정", exact: true }).getByText(owner.email, { exact: true })).toBeVisible();
    await loginIsolatedBalanceUser(visitor, f.users[1]);
    const endpoint = "/api/player-profiles/" + owner.id;
    async function read() {
      const response = await visitor.request.get(endpoint);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      const body = await response.text();
      for (const value of [owner.email, owner.nickname, "UnverifiedPublic#KR1", "private-provider-id", "coinBalance", "auto_login", "birth_year", "housing", "inventory"])
        expect(body).not.toContain(value);
      return JSON.parse(body).profile;
    }
    let identity = await read();
    expect(Object.keys(identity).sort()).toEqual(["appearance", "games", "intro", "memberships", "userId"]);
    expect(identity).toMatchObject({ userId: owner.id, intro, appearance: { title: title.name_ko } });
    expect(identity.games).toEqual(expect.arrayContaining([{ gameSlug: "overwatch", gameName: "오버워치", accountId: battleTag }, { gameSlug: "valorant", gameName: "발로란트", accountId: null }]));
    await visitor.goto("/profile/" + owner.id);
    await expect(visitor).toHaveURL(`/profile/${owner.id}/emblems`);
    await expect(visitor.getByRole("heading", { name: "엠블럼 케이스", exact: true })).toBeVisible();
    await expect(visitor.locator("[data-emblem-feature-key]")).toHaveCount(0);
    const api = await visitor.request.get("/api/personal-emblems/featured?player=" + owner.id);
    const collection = (await api.json()).collection;
    expect(collection.canFeature).toBe(false);
    expect(collection.sources.every((source: { emblems: { earned: boolean; progress?: number }[] }) => source.emblems.every(e => e.earned && e.progress === undefined))).toBe(true);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("user_id", owner.id));
    identity = await read(); expect(identity.memberships).toEqual([]); expect(identity.intro).toBe(intro);
    await ok(f.service.from("user_game_profiles").update({ battle_tag: null, game_uid: "internal#not-a-battletag" }).eq("user_id", owner.id).eq("game_id", f.gameId));
    identity = await read(); expect(JSON.stringify(identity)).not.toContain("internal#not-a-battletag");
    expect(identity.games.find((game: { gameSlug: string }) => game.gameSlug === "overwatch").accountId).toBeNull();
    await ok(f.service.from("user_game_profiles").delete().eq("user_id", owner.id));
    expect((await read()).games).toEqual([]);
    const guestContext = await browser.newContext();
    try {
      const guest = await guestContext.newPage();
      expect((await guest.request.get(endpoint)).status()).toBe(401);
      await guest.goto("/profile/" + owner.id); await expect(guest).toHaveURL(/\/sign-in\?next=/);
    } finally { await guestContext.close(); }
    expect((await visitor.request.get("/api/player-profiles/not-a-player")).status()).toBe(400);
    expect((await visitor.request.get("/api/player-profiles/" + f.clanId)).status()).toBe(404);
  } finally { try { await visitorContext.close(); } finally { await f.cleanup(); } }
});
