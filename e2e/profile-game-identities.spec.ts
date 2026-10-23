import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("계정 닉네임 없이 클랜별 콜아웃에 해당 게임 ID를 표시하고 게임을 좌측 정렬한다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const otherClanId = randomUUID();
  let otherCreated = false;
  const battleTag = `Battle${f.users[0].id.slice(0, 8)}#1234`;
  const riotId = `Riot${f.users[0].id.slice(0, 8)}#QA1`;
  try {
    const game = await f.service.from("games").select("id").eq("slug", "valorant").single();
    expect(game.error).toBeNull();
    expect((await f.service.from("clans").insert({ id: otherClanId, name: `Identity-${f.users[0].id.slice(0, 8)}`, game_id: game.data!.id })).error).toBeNull();
    otherCreated = true;
    expect((await f.service.from("clan_members").insert({ clan_id: otherClanId, user_id: f.users[0].id, role: "member", status: "active" })).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", f.users[0].id).eq("game_id", f.gameId)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").insert({ user_id: f.users[0].id, game_id: game.data!.id, game_uid: `provider:${randomUUID()}`, riot_id: riotId, is_verified: true })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    const identity = page.getByRole("region", { name: "플레이어 소개", exact: true });
    const ow = identity.getByRole("article").filter({ has: page.getByText(battleTag, { exact: true }) });
    const val = identity.getByRole("article").filter({ has: page.getByText(riotId, { exact: true }) });
    await expect(identity.getByRole("article")).toHaveCount(2);
    await expect(ow.getByText("배틀태그", { exact: true })).toBeVisible();
    await expect(val.getByText("라이엇 ID", { exact: true })).toBeVisible();
    await expect(ow.getByText(riotId, { exact: true })).toHaveCount(0);
    await expect(val.getByText(battleTag, { exact: true })).toHaveCount(0);
    await expect(identity.getByText(f.users[0].nickname, { exact: true })).toHaveCount(0);
    await expect(identity.getByRole("combobox")).toHaveCount(0);
    const games = identity.locator('p').filter({ has: page.getByRole("img", { name: "오버워치 로고", exact: true }) }).first();
    expect(await games.evaluate((element) => getComputedStyle(element).justifyContent)).toBe("flex-start");
    for (const width of [1280, 1023, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(ow.getByText(battleTag, { exact: true })).toBeVisible();
      await expect(val.getByText(riotId, { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: test.info().outputPath("profile-clan-identities-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.screenshot({ path: test.info().outputPath("profile-clan-identities.png"), fullPage: true });
    await page.goto("/games");
    await page.locator('summary[aria-label="프로필 메뉴"]').click();
    await expect(page.getByText("내 계정", { exact: true })).toBeVisible();
    await expect(page.getByText(f.users[0].nickname, { exact: true })).toHaveCount(0);
  } finally {
    if (otherCreated) expect((await f.service.from("clans").delete().eq("id", otherClanId)).error).toBeNull();
    await f.cleanup();
  }
});
