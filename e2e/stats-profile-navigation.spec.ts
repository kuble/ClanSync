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
    await ok(f.service.from("users").update({ gender: "female", birth_year: 1998 }).eq("id", player.id));
    await ok(f.service.from("clan_members").update({ joined_at: "2021-04-05T23:30:00Z" }).eq("clan_id", f.clanId).eq("user_id", player.id));
    const otherGame = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    await ok(f.service.from("user_game_profiles").insert({ user_id: player.id, game_id: otherGame.id, game_uid: "different-game-provider", riot_id: "OtherGame#KR1", is_verified: true }));
    expect((await f.service.auth.admin.updateUserById(player.id, { user_metadata: { profile_intro: "함께 즐기는 플레이어" } })).error).toBeNull();
    const title = await ok(f.service.from("nameplate_options").insert({ game_id: f.gameId, category: "sub", code: "title-fixture-" + f.clanId, name_ko: "함께하는 플레이어", unlock_source: "store", price_coins: 90 }).select("id,name_ko").single());
    await ok(f.service.from("user_nameplate_inventory").insert({ user_id: player.id, option_id: title.id }));
    const cardOwner = await f.memberClient(1);
    try { await ok(cardOwner.from("user_namecard_selections").insert({ user_id: player.id, category: "sub", option_id: title.id })); }
    finally { await cardOwner.auth.signOut(); }
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: player.id, family: "victory", rank: 1 }] }));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(statsUrl);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    const filter = page.getByRole("region", { name: "개인 기록 기간", exact: true });
    await expect(banner).toBeVisible();
    const filterBounds = (await filter.boundingBox())!, bannerBounds = (await banner.boundingBox())!;
    expect(filterBounds.y + filterBounds.height).toBeLessThanOrEqual(bannerBounds.y);
    const identity = banner.getByRole("region", { name: "플레이어 소개", exact: true });
    await expect(identity).toBeVisible();
    await expect(banner.getByRole("link", { name: /프로필 보기$/ })).toHaveCount(0);
    const namecard = banner.locator("[data-namecard]");
    await expect(namecard).toContainText(battleTag);
    await expect(namecard).toContainText(title.name_ko);

    await expect(banner.getByRole("link", { name: "미니룸 방문", exact: true })).toHaveCount(0);
    await expect(banner.getByRole("link", { name: "엠블럼 케이스 보기 →", exact: true })).toHaveCount(0);
    const facts = banner.getByRole("region", { name: "기본 정보", exact: true });
    await expect(facts.getByRole("term")).toHaveText(["성별", "출생 연도", "클랜 가입일"]);
    await expect(facts.getByRole("definition")).toHaveText(["여성", "1998", "2021. 4. 6."]);
    await expect(banner.getByRole("article")).toHaveCount(1);
    await expect(banner.getByRole("navigation", { name: "게임별 클랜", exact: true })).toHaveCount(0);
    await expect(banner).not.toContainText("OtherGame#KR1");
    await expect(banner.getByRole("link", { name: /^BalanceUI-/ })).toHaveCount(0);
    await expect(banner.getByText("멤버", { exact: true })).toHaveCount(0);
    await expect(namecard.getByRole("link")).toHaveCount(0);
    const tray = banner.getByRole("region", { name: "대표 엠블럼", exact: true });
    const caseLink = tray.getByRole("link", { name: / 엠블럼 케이스 열기$/ });

    await expect(banner.locator("a a")).toHaveCount(0);
    await expect(caseLink).toHaveAttribute("href", `/profile/${player.id}/emblems`);
    const cardBounds = (await namecard.boundingBox())!, caseBounds = (await caseLink.boundingBox())!;
    expect(caseBounds.width).toBeGreaterThanOrEqual(300);
    const introBounds = (await banner.getByRole("region", { name: "한 줄 소개", exact: true }).boundingBox())!;
    expect(caseBounds.y).toBeGreaterThanOrEqual(introBounds.y + introBounds.height);
    expect(caseBounds.y + caseBounds.height > cardBounds.y + cardBounds.height || caseBounds.x > cardBounds.x + cardBounds.width).toBe(true);
    await page.screenshot({ path: info.outputPath("stats-player-namecard.png"), fullPage: false });
    await caseLink.click({ position: { x: 6, y: 6 } });
    await expect(page).toHaveURL(new RegExp(`/profile/${player.id}/emblems`));
    await expect(page.getByRole("heading", { name: "엠블럼 케이스", level: 2, exact: true })).toBeVisible();
    const api = await page.request.get("/api/personal-emblems/featured?player=" + player.id);
    const collection = (await api.json()).collection;
    expect(collection.userId).toBe(player.id);
    expect(collection.canFeature).toBe(false);
    expect(collection.sources.some((source: { emblems: { earned: boolean }[] }) => source.emblems.some(emblem => emblem.earned))).toBe(true);
    await page.goto(statsUrl);
    await expect(identity).toBeVisible();
    await page.goto("/profile/" + player.id);
    await expect(page).toHaveURL(statsUrl);
    await expect(identity).toBeVisible();
    await expect(identity.locator("[data-namecard]")).toContainText(battleTag);
    await expect(identity.locator("[data-namecard]")).toContainText(title.name_ko);
    await expect(identity.getByText("함께 즐기는 플레이어", { exact: true })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "네임카드 도구", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 884 });
    await page.goto(statsUrl);
    await expect(identity).toBeVisible();
    await expect(caseLink).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const mobileCard = (await namecard.boundingBox())!, mobileCase = (await caseLink.boundingBox())!;
    expect(mobileCase.width).toBeGreaterThanOrEqual(200);
    expect(mobileCase.height).toBeGreaterThanOrEqual(44);
    expect(mobileCase.y).toBeGreaterThan(mobileCard.y + mobileCard.height);
    expect(mobileCase.y).toBeGreaterThanOrEqual((await banner.getByRole("region", { name: "한 줄 소개", exact: true }).boundingBox())!.y);
    await caseLink.tap();
    await expect(page).toHaveURL(new RegExp(`/profile/${player.id}/emblems`));
    await page.goto(statsUrl);
    await expect(identity).toBeVisible();
    await ok(f.service.from("users").update({ gender: "undisclosed" }).eq("id", player.id));
    await ok(f.service.from("clan_members").update({ joined_at: null }).eq("clan_id", f.clanId).eq("user_id", player.id));
    await page.reload();
    await expect(facts.getByRole("definition")).toHaveText(["비공개", "1998", "미등록"]);
  } finally { await f.cleanup(); expect((await f.service.from("nameplate_options").delete().eq("code", "title-fixture-" + f.clanId)).error).toBeNull(); }
});

test("모든 역할은 멤버 검색으로 시작하고 통계 제한 대상도 소개를 연다", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3);
  const tags = ["StaffEntry#1111", "MemberEntry#2222", "OfficerEntry#3333"];
  const statsUrl = f.path.replace(/balance$/, "stats");
  try {
    expect((await f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "member" } }).eq("clan_id", f.clanId)).error).toBeNull();
    expect((await f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    for (let i = 0; i < f.users.length; i++) expect((await f.service.from("user_game_profiles").update({ battle_tag: tags[i] }).eq("user_id", f.users[i].id).eq("game_id", f.gameId)).error).toBeNull();
    const picker = page.getByRole("region", { name: "개인 기록 멤버 목록", exact: true });
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    for (const index of [0, 1, 2]) {
      await page.context().clearCookies();
      await loginIsolatedBalanceUser(page, f.users[index]);
      await page.goto(statsUrl);
      await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
      await expect(picker).toBeVisible();
      await expect(banner).toHaveCount(0);
      await page.getByRole("textbox", { name: "멤버 이름 검색", exact: true }).fill(tags[0].split("#")[0]);
      await picker.getByRole("button", { name: `${tags[0].split("#")[0]} 개인 기록 열기`, exact: true }).click();
      await expect(banner).toContainText(tags[0]);
      await page.screenshot({ path: info.outputPath("personal-member-entry.png") });
      await page.goto(statsUrl + "?player=" + f.users[0].id);
      await expect(banner).toContainText(tags[0]);
      await page.reload();
      await expect(banner).toContainText(tags[0]);
      await page.goto(statsUrl);
      await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
      await expect(picker).toBeVisible();
    }
    expect((await f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "leader" } }).eq("clan_id", f.clanId)).error).toBeNull();
    expect((await f.service.from("users").update({ gender: "male", birth_year: 1991 }).eq("id", f.users[0].id)).error).toBeNull();
    expect((await f.service.from("clan_members").update({ joined_at: "2021-04-05T23:30:00Z" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id)).error).toBeNull();
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const endpoint = `/api/player-profiles/${f.users[0].id}?clanId=${f.clanId}`;
    await page.route(`**${endpoint}`, async route => { await gate; await route.continue(); });
    let before;
    try {
      await page.goto(statsUrl + "?player=" + f.users[0].id);
      await expect(banner.getByRole("region", { name: "기본 정보", exact: true }).getByRole("definition")).toHaveText(["—", "—", "—"]);
      before = await banner.boundingBox();
    } finally { release(); }
    await expect(banner.getByRole("region", { name: "플레이어 소개", exact: true })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "개인 기록", exact: true }).getByText("개인 기록 열람이 제한되어 있습니다.", { exact: true })).toBeVisible();
    const facts = banner.getByRole("region", { name: "기본 정보", exact: true });
    await expect(facts.getByRole("definition")).toHaveText(["남성", "1991", "2021. 4. 6."]);
    const after = await banner.boundingBox();
    for (const axis of ["x", "y", "width", "height"] as const) expect(Math.abs(before![axis] - after![axis])).toBeLessThan(1);
    await page.screenshot({ path: info.outputPath("restricted-stats-public-facts.png") });
    await expect(page.getByRole("button", { name: "멤버 선택", exact: true })).toBeVisible();
    expect((await page.request.get(`/api/clans/${f.clanId}/stats?section=personal&userId=${f.users[0].id}`)).status()).toBe(403);
    const identity = (await (await page.request.get(endpoint)).json()).profile;
    expect(identity.clanProfile).toEqual({ gender: "male", birthYear: 1991, clanJoinedAt: "2021-04-05T23:30:00+00:00", altAccounts: [] });
    expect(JSON.stringify(identity)).not.toContain(f.users[0].email);
    expect((await page.request.get(`/api/player-profiles/${f.users[0].id}?clanId=invalid`)).status()).toBe(400);
    expect((await f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[0].id)).error).toBeNull();
    expect((await (await page.request.get(endpoint)).json()).profile.clanProfile).toBeUndefined();
  } finally { await f.cleanup(); expect((await f.service.from("nameplate_options").delete().eq("code", "title-fixture-" + f.clanId)).error).toBeNull(); }
});
