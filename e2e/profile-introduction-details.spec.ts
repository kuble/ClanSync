import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("소개의 부계정은 게임과 공개 권한을 따르고 비공개 통계의 멤버도 검색한다", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3), owner = f.users[0], member = f.users[1];
  const stats = f.path.replace(/balance$/, "stats");
  async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) { const r = await query; expect(r.error).toBeNull(); return r.data!; }
  try {
    await ok(f.service.from("user_game_profiles").update({ battle_tag: "FindPlayer#1111" }).eq("user_id", owner.id).eq("game_id", f.gameId));
    const other = await ok(f.service.from("games").select("id").eq("slug", "valorant").single());
    await ok(f.service.from("user_game_profiles").insert({ user_id: owner.id, game_id: other.id, game_uid: "other-provider", riot_id: "Other#KR1", is_verified: true }));
    await ok(f.service.from("user_alt_accounts").insert([
      { user_id: owner.id, game_id: f.gameId, alt_nick: "SidePlayer#2222", note: "private-alt-note" },
      { user_id: owner.id, game_id: other.id, alt_nick: "OtherSide#KR1", note: "private-other-note" },
      { user_id: member.id, game_id: f.gameId, alt_nick: "MySide#3333" },
    ]));
    await ok(f.service.from("clan_settings").update({ permissions: { view_alt_accounts: ["leader"] }, hof_config: { personal_record_min_role: "leader" } }).eq("clan_id", f.clanId));
    await loginIsolatedBalanceUser(page, owner);
    await page.goto("/profile");
    const identity = page.getByRole("region", { name: "플레이어 소개", exact: true });
    await expect(identity.getByRole("region", { name: "부계정", exact: true })).toContainText("SidePlayer#2222");
    await expect(identity.getByRole("article")).not.toContainText("OtherSide#KR1");
    const fontSizes = await Promise.all(["게임 프로필", "한 줄 소개", "대표 엠블럼"].map(name => identity.getByRole("heading", { name, exact: true }).evaluate(el => getComputedStyle(el).fontSize)));
    expect(new Set(fontSizes).size).toBe(1);
    const facts = await identity.getByRole("region", { name: "기본 정보", exact: true }).locator("..").boundingBox();
    const aside = await identity.getByRole("region", { name: "대표 엠블럼", exact: true }).locator("..").boundingBox();
    expect(Math.abs(facts!.height - aside!.height)).toBeLessThan(1);
    const edit = identity.getByRole("button", { name: "한 줄 소개 편집", exact: true });
    const summary = await edit.locator("..").evaluate(el => ({ border: getComputedStyle(el).borderTopWidth, height: el.getBoundingClientRect().height }));
    expect(summary.border).toBe("1px"); expect(summary.height).toBeGreaterThanOrEqual(88);
    await page.screenshot({ path: info.outputPath("profile-introduction-details.png") });
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, member);
    await page.goto(stats);
    await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
    await expect(page.getByRole("region", { name: "개인 기록 멤버 목록", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "멤버 이름 검색", exact: true }).fill("FindPlayer");
    await page.getByRole("button", { name: "FindPlayer 개인 기록 열기", exact: true }).click();
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    await expect(banner).toContainText("FindPlayer#1111");
    await expect(banner.getByRole("region", { name: "부계정", exact: true })).toContainText("공개된 부계정이 없습니다.");
    expect((await page.request.get(`/api/clans/${f.clanId}/stats?section=personal&userId=${owner.id}`)).status()).toBe(403);
    const endpoint = `/api/player-profiles/${owner.id}?clanId=${f.clanId}`;
    const hidden = await (await page.request.get(endpoint)).json();
    expect(hidden.profile.clanProfile.altAccounts).toEqual([]);
    expect((await (await page.request.get(`/api/player-profiles/${member.id}?clanId=${f.clanId}`)).json()).profile.clanProfile.altAccounts).toEqual(["MySide#3333"]);
    await ok(f.service.from("clan_settings").update({ permissions: { view_alt_accounts: ["leader", "member"] } }).eq("clan_id", f.clanId));
    const shown = await (await page.request.get(endpoint)).json();
    expect(shown.profile.clanProfile.altAccounts).toEqual(["SidePlayer#2222"]);
    expect(JSON.stringify(shown)).not.toContain("OtherSide#KR1"); expect(JSON.stringify(shown)).not.toContain("private-alt-note");
    expect(JSON.stringify((await (await page.request.get(`/api/player-profiles/${owner.id}`)).json()))).not.toContain("SidePlayer#2222");
    await page.goto(stats + "?player=" + owner.id);
    await expect(banner.getByRole("region", { name: "부계정", exact: true })).toContainText("SidePlayer#2222");
    await page.setViewportSize({ width: 320, height: 884 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole("button", { name: "멤버 선택", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "멤버 이름 검색", exact: true })).toBeVisible();
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[2]);
    expect((await (await page.request.get(endpoint)).json()).profile.clanProfile).toBeUndefined();
  } finally { await f.cleanup(); }
});
