import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("계정 대표 세 칸은 다른 게임·탈퇴 클랜을 섞고 프로필·필터·새로고침에서 동일하게 유지한다", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2), owner = f.users[0];
  const extra: string[] = [];
  const visitorContext = await browser.newContext(), visitor = await visitorContext.newPage();
  const key = "month-2024-02-승률", next = "month-2024-03-승률";
  async function ok<T>(q: PromiseLike<{ data: T; error: unknown }>) { const r = await q; expect(r.error).toBeNull(); return r.data!; }
  const saved = async () => (await ok(f.service.from("account_personal_emblem_picks").select("emblem_keys").eq("user_id", owner.id).single())).emblem_keys;
  try {
    const val = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    for (const [gameId, name, status] of [[val.id, "QA 계정 발로란트", "active"], [f.gameId, "QA 계정 이전 클랜", "left"]] as const) {
      const clan = await ok(f.service.from("clans").insert({ game_id: gameId, name }).select("id").single());
      extra.push(clan.id);
      await ok(f.service.from("clan_members").insert({ clan_id: clan.id, user_id: owner.id, role: "member", status }));
    }
    await ok(f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "member", member_personal_sections: ["emblems", "records"] } }).eq("clan_id", f.clanId));
    const clans = [f.clanId, ...extra];
    for (const clanId of clans) await ok(f.service.rpc("finalize_clan_personal_emblem_awards", {
      p_clan_id: clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: owner.id, family: "victory", rank: 1 }],
    }));
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", {
      p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2024-03", p_awards: [{ user_id: owner.id, family: "victory", rank: 1 }],
    }));
    await ok(f.service.from("account_personal_emblem_picks").upsert({ user_id: owner.id, emblem_keys: [] }));
    expect((await page.request.get(`/api/personal-emblems/featured?player=${owner.id}`)).status()).toBe(401);
    expect((await page.request.get("/api/personal-emblems/featured?player=invalid")).status()).toBe(400);
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile/emblems");
    const view = page.locator("[data-personal-emblem-case]"), tray = view.getByRole("group", { name: "선택한 대표 엠블럼 3칸", exact: true });
    await expect(view.locator('[aria-busy="true"]')).toHaveCount(0);
    await view.locator('[data-emblem-key$="-승률"]').click();
    const detail = page.getByRole("dialog");
    for (const clanId of clans) {
      const star = detail.locator(`[data-emblem-clan="${clanId}"] [data-emblem-feature-key="${key}"]`);
      await star.focus(); await star.click(); await expect(star).toHaveAttribute("aria-pressed", "true");
    }
    const original = clans.map(id => id + ":" + key);
    expect(await saved()).toEqual(original);
    await page.keyboard.press("Escape");
    const refs = () => tray.locator("[data-featured-emblem-reference]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-featured-emblem-reference")));
    await view.getByRole("radio", { name: "발로란트", exact: true }).click();
    expect(await refs()).toEqual(original);
    await view.getByRole("radio", { name: "오버워치", exact: true }).click();
    const star = view.locator(`[data-emblem-clan="${f.clanId}"] [data-emblem-feature-key="${next}"]`);
    await star.focus(); await star.click();
    const replace = page.getByRole("dialog", { name: "대표 엠블럼 교체", exact: true });
    await expect(replace.locator("[data-replace-emblem-reference]")).toHaveCount(3);
    await replace.getByRole("button", { name: "취소", exact: true }).click();
    expect(await saved()).toEqual(original);
    await star.click();
    await replace.locator(`[data-replace-emblem-reference="${extra[0]}:${key}"]`).click();
    await expect(replace).toHaveCount(0);
    const expected = [original[0], f.clanId + ":" + next, original[2]];
    expect(await saved()).toEqual(expected);
    await page.reload(); await expect(tray.locator("[data-featured-emblem-reference]")).toHaveCount(3);
    expect(await refs()).toEqual(expected);
    await view.screenshot({ path: info.outputPath("account-emblem-case.png") });
    await page.goto("/profile");
    const profileTray = page.getByRole("region", { name: "대표 엠블럼", exact: true });
    await expect(profileTray).toHaveCount(1);
    await expect(profileTray.locator("[data-featured-emblem-reference]")).toHaveCount(3);
    const profileRefs = () => profileTray.locator("[data-featured-emblem-reference]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-featured-emblem-reference")));
    expect(await profileRefs()).toEqual(expected);
    await page.getByRole("button", { name: "다음 클랜", exact: true }).click();
    await expect(page.getByRole("status", { name: "현재 클랜", exact: true })).toHaveText("2 / 2");
    expect(await profileRefs()).toEqual(expected);
    await page.screenshot({ path: info.outputPath("account-emblem-profile.png"), fullPage: true });
    await loginIsolatedBalanceUser(visitor, f.users[1]);
    const endpoint = `/api/personal-emblems/featured?player=${owner.id}`;
    const allowed = await visitor.request.get(endpoint);
    expect(allowed.status()).toBe(200);
    expect((await allowed.json()).collection.accountFeaturedKeys).toEqual(expected);
    await visitor.goto(`/profile/${owner.id}/emblems`);
    await expect(visitor.getByRole("heading", { name: "개인 엠블럼 케이스", exact: true })).toBeVisible();
    await expect(visitor.locator("[data-emblem-feature-key]")).toHaveCount(0);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("user_id", owner.id));
    await page.goto("/profile");
    await expect(profileTray.locator("[data-featured-emblem-reference]")).toHaveCount(3);
    expect(await profileRefs()).toEqual(expected);
    expect((await visitor.request.get(endpoint)).status()).toBe(200);
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("account-emblem-profile-mobile.png"), fullPage: true });
    await profileTray.getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true }).click();
    for (const reference of expected) {
      const [clanId, local] = [reference.slice(0, 36), reference.slice(37)];
      await view.locator('[data-emblem-key$="-승률"]').click();
      const remove = detail.locator(`[data-emblem-clan="${clanId}"] [data-emblem-feature-key="${local}"]`);
      await remove.focus(); await remove.click(); await expect(remove).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("Escape");
    }
    expect(await saved()).toEqual([]);
    await page.reload(); await expect(tray.locator("[data-featured-emblem-reference]")).toHaveCount(0);
  } finally {
    await visitorContext.close();
    for (const id of extra) await f.service.from("clans").delete().eq("id", id);
    await f.cleanup();
  }
});
