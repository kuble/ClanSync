import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanStatsDetail, loadClanStatsPage } from "../src/lib/clan/stats/load-clan-stats";

test("personal banners use game-specific BattleTags and signup details within personal-record access", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(4);
  const suffix = String(Date.now()).slice(-8);
  const tag = `OldName#${suffix}`;
  try {
    const [leader, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(3)]);
    expect((await f.service.from("users").update({ gender: "male", birth_year: 1990 }).eq("id", f.users[0].id)).error).toBeNull();
    expect((await f.service.from("users").update({ gender: "female", birth_year: 1997 }).eq("id", f.users[1].id)).error).toBeNull();
    expect((await f.service.from("users").update({ gender: "undisclosed", birth_year: 2002 }).eq("id", f.users[2].id)).error).toBeNull();
    // Legacy tag in game_uid must still win over an unrelated website nickname.
    expect((await f.service.from("user_game_profiles").update({ game_uid: tag }).eq("game_id", f.gameId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ battle_tag: `NewTag#${suffix}` }).eq("game_id", f.gameId).eq("user_id", f.users[0].id)).error).toBeNull();
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[3].id)).error).toBeNull();
    expect((await f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "member", member_personal_sections: ["records"] } }).eq("clan_id", f.clanId)).error).toBeNull();
    const [full, initial, detail] = await Promise.all([
      loadClanStatsPage(leader, f.users[0].id, f.clanId),
      loadClanStatsPage(leader, f.users[0].id, f.clanId, { deferDetails: true }),
      loadClanStatsDetail(leader, f.users[0].id, f.clanId, f.users[1].id),
    ]);
    const expected = { battleTag: tag, gender: "female", birthYear: 1997, clanJoinedAt: expect.any(String) };
    expect(full?.personal.people.find((p) => p.userId === f.users[1].id)?.profile).toEqual(expected);
    expect(initial?.personal.people.find((p) => p.userId === f.users[1].id)?.profile).toEqual(expected);
    expect(detail?.kind === "personal" && detail.person.profile).toEqual(expected);
    expect(await loadClanStatsPage(outsider, f.users[3].id, f.clanId, { deferDetails: true })).toBeNull();
    expect(await loadClanStatsDetail(outsider, f.users[3].id, f.clanId, f.users[1].id)).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    const stats = f.path.replace(/balance$/, "stats");
    await page.goto(`${stats}?player=${f.users[1].id}`);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    await expect(banner.getByText(tag, { exact: true })).toBeVisible();
    await expect(banner.getByRole("region", { name: "기본 정보", exact: true })).toContainText("여성");
    await expect(banner.getByRole("region", { name: "기본 정보", exact: true })).toContainText("1997");
    await expect(banner).not.toContainText(f.users[1].email);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await banner.screenshot({ path: info.outputPath("personal-battletag-mobile.png") });
    await page.goto(`${stats}?player=${f.users[2].id}`);
    await expect(banner.getByRole("region", { name: "기본 정보", exact: true })).toContainText("비공개");
    await expect(banner.getByRole("region", { name: "기본 정보", exact: true })).toContainText("2002");
    await expect(banner).not.toContainText(f.users[2].nickname);
    const allowed = await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[2].id);
    expect(allowed?.kind === "personal" && allowed.person.profile?.gender).toBe("undisclosed");
    expect((await f.service.from("clan_settings").update({ hof_config: { personal_record_min_role: "leader" } }).eq("clan_id", f.clanId)).error).toBeNull();
    expect((await loadClanStatsPage(member, f.users[1].id, f.clanId, { deferDetails: true }))?.personal.people).toEqual([]);
    expect(await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[2].id)).toBeNull();
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    const denied = await page.request.get(`/api/clans/${f.clanId}/stats?section=personal&userId=${f.users[2].id}`);
    expect(denied.ok()).toBe(false);
    expect(await denied.text()).not.toContain("2002");
    await page.goto("/games");
  } finally { await f.cleanup(); }
});
