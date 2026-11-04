import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("new members see links, rules and notices once per membership; completion is private", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  const base = f.path.replace(/\/balance$/, "");
  async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) { const result = await query; expect(result.error).toBeNull(); return result.data; }
  try {
    await ok(f.service.from("clans").update({ rules: "1. 서로 존중합니다.\n2. 함께 즐겁게 플레이합니다." }).eq("id", f.clanId));
    await ok(f.service.from("clan_settings").update({ community_links: { discord: "https://discord.gg/welcome-test" } }).eq("clan_id", f.clanId));
    await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, created_by: f.users[0].id, title: "신규 멤버 공지", content: "이번 주 토요일에 함께합니다.", is_pinned: true }));
    await ok(f.service.from("clan_members").update({ welcome_completed_at: null }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    const member = await f.memberClient(1), former = await f.memberClient(2);
    const membership = async () => (await ok(f.service.from("clan_members").select("joined_at,welcome_completed_at").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single()))!;
    const before = await membership();
    const tierArgs = { p_clan_id: f.clanId, p_joined_at: before.joined_at!, p_tiers: { tank: 17 } };
    expect(await ok(former.rpc("complete_balance_tier_welcome", tierArgs))).toBe(false);
    expect(await ok(member.rpc("complete_balance_tier_welcome", { ...tierArgs, p_tiers: { tank: 45 } }))).toBe(false);
    expect(await ok(former.rpc("complete_clan_welcome", { p_clan_id: f.clanId, p_joined_at: before.joined_at! }))).toBe(false);
    expect(await ok(member.rpc("complete_clan_welcome", { p_clan_id: f.clanId, p_joined_at: "2000-01-01T00:00:00Z" }))).toBe(false);
    const direct = await member.from("clan_members").update({ welcome_completed_at: new Date().toISOString() }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id).select();
    expect(direct.error || !direct.data?.length).toBeTruthy();
    expect((await membership()).welcome_completed_at).toBeNull();
    await former.auth.signOut();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/events");
    const guide = page.getByRole("dialog", { name: /에 오신 것을 환영합니다/ });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("link", { name: "Discord", exact: true })).toHaveAttribute("href", "https://discord.gg/welcome-test");
    await guide.getByRole("button", { name: "다음", exact: true }).click();
    await expect(guide.getByText("서로 존중합니다.", { exact: true })).toBeVisible();
    await guide.getByRole("button", { name: "다음", exact: true }).click();
    await expect(guide.getByText("신규 멤버 공지", { exact: true })).toBeVisible();
    expect(await guide.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await guide.getByRole("button", { name: "다음", exact: true }).click();
    const tankTier = guide.getByRole("combobox", { name: "탱커" });
    await expect(tankTier.locator("option")).toHaveCount(46);
    await expect(tankTier.locator('option[value="44"]')).toHaveText("챔피언 1");
    await tankTier.selectOption({ label: "플래티넘 3" });
    await guide.getByRole("combobox", { name: "딜러" }).selectOption({ label: "에메랄드 3" });
    await expect(guide.getByRole("combobox", { name: "힐러" })).toHaveValue("");
    await guide.getByRole("button", { name: "안내 완료", exact: true }).click();
    await expect(guide).toBeHidden();
    expect((await membership()).welcome_completed_at).not.toBeNull();
    expect(await ok(member.rpc("read_own_balance_entry_tiers", { p_clan_id: f.clanId }))).toEqual({ tank: 17, dmg: 22 });
    expect(await ok(member.rpc("complete_balance_tier_welcome", { ...tierArgs, p_tiers: { tank: 44, sup: 0 } }))).toBe(true);
    expect(await ok(member.rpc("read_own_balance_entry_tiers", { p_clan_id: f.clanId }))).toEqual({ tank: 17, dmg: 22, sup: 0 });
    await page.reload();
    await expect(guide).toHaveCount(0);
    await page.goto(base);
    await page.getByRole("button", { name: "클랜 이용 안내", exact: true }).click();
    await expect(guide).toBeVisible();
    await page.keyboard.press("Escape");
    // A later membership must not inherit completion of the previous one.
    await ok(f.service.from("clan_members").update({ joined_at: new Date(Date.now() + 1000).toISOString() }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    await page.reload();
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("heading", { name: "함께할 채팅방", exact: true })).toBeVisible();
  } finally { await f.cleanup(); }
});
