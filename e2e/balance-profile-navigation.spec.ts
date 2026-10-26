import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("내전의 출전자·관전자는 네임카드로 프로필을 방문하고 운영 조작은 유지한다", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture();
  const memberContext = await browser.newContext();
  const spectatorContext = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 900 } });
  const memberPage = await memberContext.newPage(), spectatorPage = await spectatorContext.newPage();
  const errors: string[] = [];
  for (const target of [page, memberPage, spectatorPage]) target.on("pageerror", (error) => errors.push(error.message));
  async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
    const result = await query;
    expect(result.error, JSON.stringify(result.error)).toBeNull();
    return result.data!;
  }
  const ids = f.users.slice(0, 10).map((user) => user.id);
  const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
  const profilePath = `/profile/${f.users[0].id}`;
  const links = 'a[href^="/profile/"]';
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(1);
    async function openRoom(actor: typeof leader, kind: "regular" | "flash") {
      const created = await ok(actor.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: kind, p_title: "Profile navigation" }));
      const seriesId = (created as { series_id: string }).series_id;
      const room = await ok(f.service.from("balance_rooms").select("id").eq("series_id", seriesId).single());
      const round = await f.activeRound(seriesId);
      await ok(f.service.from("balance_sessions").update({ roster, map_ban_enabled: false, hero_ban_enabled: false }).eq("id", round.id));
      // Changing the roster clears the prior map; select it after that update.
      await ok(f.service.from("balance_sessions").update({ resolved_map_label: "부산" }).eq("id", round.id));
      return { round, url: `${f.path}?room=${room.id}` };
    }
    const regular = await openRoom(leader, "regular");
    await loginIsolatedBalanceUser(page, f.users[0]);
    await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await loginIsolatedBalanceUser(spectatorPage, f.users[11]);
    const response = await page.goto(regular.url);
    expect(response?.status(), page.url()).toBe(200);
    await expect(page.getByTestId("clan-balance-session-panel")).toBeVisible();
    const operator = page.getByTestId("clan-balance-session-panel");
    await expect(operator.locator(links)).toHaveCount(0);
    const slot = operator.locator('[data-roster-slot="team1:d0"]');
    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await slot.press("Escape");
    await expect(slot).toHaveAttribute("aria-pressed", "false");

    await memberPage.goto(regular.url);
    const memberPanel = memberPage.getByTestId("clan-balance-session-panel");
    await expect(memberPanel.locator(links)).toHaveCount(10);
    await expect(memberPanel.locator("button a")).toHaveCount(0);
    const profile = memberPanel.locator(`a[href="${profilePath}"]`);
    await expect(profile.locator("[data-namecard]")).toBeVisible();
    await profile.focus();
    await profile.press("Enter");
    await expect(memberPage).toHaveURL(profilePath);
    await expect(memberPage.getByRole("heading", { name: "플레이어 프로필", exact: true })).toBeVisible();
    await expect(memberPage.getByRole("tab", { name: "계정 정보", exact: true })).toHaveCount(0);

    await spectatorPage.goto(regular.url);
    const spectatorPanel = spectatorPage.getByTestId("clan-balance-session-panel");
    await expect(spectatorPanel.locator(links)).toHaveCount(10);
    await spectatorPanel.locator(`a[href="${profilePath}"]`).tap();
    await expect(spectatorPage).toHaveURL(profilePath);

    await ok(f.service.from("balance_sessions").update({ phase: "match_live" }).eq("id", regular.round.id));
    await page.reload();
    await expect(operator.locator(links)).toHaveCount(0);
    await expect(operator.getByRole("button", { name: "1팀 승리 선택", exact: true })).toBeVisible();
    const score = operator.locator("[data-score-editor]").first();
    await score.getByRole("button").first().click();
    await score.locator("input").fill("2.5");
    await score.locator('button[type="submit"]').click();
    await expect(score).toHaveAttribute("data-score-editor", "idle");
    const saved = await ok(f.service.from("balance_sessions").select("ma_snapshot,match_outcome").eq("id", regular.round.id).single());
    expect((saved.ma_snapshot as Record<string, { m: number }>)[ids[1]].m).toBe(2.5);
    expect(saved.match_outcome).toBe("pending");
    await memberPage.goto(regular.url);
    await expect(memberPanel.locator(links)).toHaveCount(10);
    await memberPanel.locator(`a[href="${profilePath}"]`).click();
    await expect(memberPage).toHaveURL(profilePath);

    // A member hosting a flash room operates the board despite their clan role.
    const flash = await openRoom(member, "flash");
    await memberPage.goto(flash.url);
    await expect(memberPanel.locator('[data-roster-slot="team1:d0"]')).toBeVisible();
    await expect(memberPanel.locator(links)).toHaveCount(0);
    await spectatorPage.goto(flash.url);
    await expect(spectatorPanel.locator(links)).toHaveCount(10);
    expect(errors).toEqual([]);
  } finally {
    await Promise.allSettled([memberContext.close(), spectatorContext.close()]);
    await f.cleanup();
  }
});
