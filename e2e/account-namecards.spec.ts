import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("공통 네임카드·칭호 구매·게임별 정보·자동 로그인과 편성자 전용 장식 숨김", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  const suffix = f.users[0].id.replace(/\D/g, "").slice(0, 8).padEnd(8, "1");
  const battleTag = `CardPlayer#${suffix}`;
  try {
    expect((await f.service.from("users").update({ coin_balance: 500 }).eq("id", f.users[0].id)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ battle_tag: battleTag }).eq("user_id", f.users[0].id).eq("game_id", f.gameId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await loginIsolatedBalanceUser(member, f.users[1]);
    await page.goto("/profile");
    const accountTab = page.getByRole("tab", { name: "계정 정보", exact: true });
    await accountTab.click();
    const own = page.getByRole("region", { name: "내 계정", exact: true });
    await expect(own.getByText("표시 이름", { exact: true })).toHaveCount(0);
    const card = page.getByRole("region", { name: "공통 네임카드", exact: true });
    await expect(card.getByText("Player#1234", { exact: true })).toBeVisible();
    const ow = page.getByRole("region", { name: "오버워치 관리", exact: true });
    await expect(ow.getByRole("button", { name: "오버워치 게임 정보", exact: true })).toHaveAttribute("aria-expanded", "false");
    await ow.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await expect(ow.getByText(battleTag, { exact: true })).toBeVisible();
    await expect(ow.getByRole("region", { name: "내 클랜", exact: true })).toBeVisible();
    await expect(ow.getByRole("img", { name: "오버워치 계정 연동됨", exact: true })).toBeVisible();
    expect(await ow.getByRole("button", { name: /딜러/ }).locator("[style]").getAttribute("style")).toContain("damage.svg");
    await expect(page.getByRole("button", { name: "발로란트 게임 정보", exact: true })).toBeVisible();

    const auto = page.getByRole("switch", { name: "자동 로그인", exact: true });
    await expect(auto).not.toBeChecked();
    await auto.click(); await expect(auto).toBeChecked();
    const remembered = (await page.context().cookies()).filter((cookie) => /^sb-.+-auth-token/.test(cookie.name));
    expect(remembered.length).toBeGreaterThan(0);
    for (const cookie of remembered) expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(29 * 86400);
    await page.reload(); await accountTab.click(); await expect(auto).toBeChecked();
    await auto.click(); await expect(auto).not.toBeChecked();
    for (const cookie of (await page.context().cookies()).filter((cookie) => /^sb-.+-auth-token/.test(cookie.name))) expect(cookie.expires - Date.now() / 1000).toBeLessThan(86460);
    await page.route("**/profile", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await auto.click(); await expect(own.getByRole("alert")).toBeVisible(); await expect(auto).not.toBeChecked();
    await page.unroute("**/profile");

    await expect(page.getByRole("button", { name: "칭호 상점", exact: true })).toHaveCount(0);
    // Switching profile tabs keeps the current layout; purchases live in the personal shop.
    const housing = page.getByRole("region", { name: "프로필 하우징", exact: true });
    await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
    const plantId = await f.service.from("user_housing_inventory").select("id").eq("user_id", f.users[0].id).eq("catalog_id", "small-plant").single();
    const plant = housing.locator(`[data-inventory-id="${plantId.data!.id}"]`);
    await plant.focus(); await plant.press("Enter"); await plant.press("Delete");
    await expect(plant).toHaveCount(0);
    await accountTab.click();
    await page.getByRole("tab", { name: "3D 미니룸", exact: true }).click();
    await expect(plant).toHaveCount(0);
    await page.getByRole("link", { name: "개인 상점", exact: true }).click();
    const filters = page.getByRole("group", { name: "개인 꾸미기 분류", exact: true });
    await expect(page.getByRole("heading", { name: "낮은 원목 테이블", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "칭호", exact: true }).click();
    await expect(page.getByRole("heading", { name: "낮은 원목 테이블", exact: true })).toHaveCount(0);
    const title = page.getByRole("article", { name: "함께하는 플레이어", exact: true });
    const buyTitle = title.getByRole("button", { name: "함께하는 플레이어 구매", exact: true });
    await buyTitle.click();
    const checkout = page.getByRole("dialog", { name: "칭호 구매", exact: true });
    await checkout.getByRole("button", { name: "취소", exact: true }).click();
    await expect(buyTitle).toBeFocused();
    await buyTitle.click();
    await page.route("**/store", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await checkout.getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(checkout.getByRole("alert")).toBeVisible();
    await page.unroute("**/store");
    await checkout.getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(checkout).toBeHidden();
    await expect(page.locator('[aria-label="보유 코인"] strong')).toHaveText("410");
    await expect(title.getByRole("link", { name: "보유 중 · 설정하기", exact: true })).toBeVisible();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath("personal-store-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/profile");
    await expect(housing.getByTestId("housing-coin-balance")).toHaveText("410");
    await accountTab.click();
    await card.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await editor.getByRole("combobox", { name: "네임카드 칭호", exact: true }).selectOption({ label: "함께하는 플레이어" });
    await expect(editor.getByRole("status")).toContainText("저장했습니다");
    await page.keyboard.press("Escape");
    await page.reload(); await accountTab.click();
    await expect(card.getByText("함께하는 플레이어", { exact: true })).toBeVisible();
    for (const width of [1280, 1074, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath("account-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await ow.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await page.screenshot({ path: test.info().outputPath("account-desktop.png"), fullPage: true });
    await page.getByRole("link", { name: "발로란트 계정 연결", exact: true }).click();
    await page.getByRole("textbox", { name: "테스트 라이엇 ID", exact: true }).fill("RiotCard#KR1");
    await page.locator("form").getByRole("button", { name: /계속하기/ }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await accountTab.click();
    await page.getByRole("button", { name: "발로란트 게임 정보", exact: true }).click();
    await expect(page.getByRole("region", { name: "발로란트 관리", exact: true }).getByText("RiotCard#KR1", { exact: true })).toBeVisible();

    await page.goto(`/games/overwatch/clan/${f.clanId}/store`);
    await expect(page.getByRole("heading", { name: "함께하는 플레이어", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "낮은 원목 테이블 구매", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "개인 상점", exact: true })).toBeVisible();
    const room = await createAndEnterBalanceRoom(page, f.path);
    const session = await f.activeRound();
    const roster = { team1: { tank: f.users[0].id, dmg: [f.users[1].id, f.users[2].id], sup: [f.users[3].id, f.users[4].id] }, team2: { tank: f.users[5].id, dmg: [f.users[6].id, f.users[7].id], sup: [f.users[8].id, f.users[9].id] } };
    expect((await f.service.from("balance_sessions").update({ roster }).eq("id", session.id)).error).toBeNull();
    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    await expect(panel.locator("[data-namecard-plain]").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(panel.locator("[data-namecard]")).toHaveCount(0);
    await member.goto(room.url);
    await expect(member.getByTestId("clan-balance-session-panel").locator("[data-namecard]").getByText(battleTag, { exact: true })).toBeVisible();
    await expect(member.getByTestId("clan-balance-session-panel").locator("[data-namecard]").getByText("함께하는 플레이어", { exact: true })).toBeVisible();
    expect((await f.service.from("balance_sessions").update({ phase: "match_live", resolved_map_label: "부산" }).eq("id", session.id)).error).toBeNull();
    await page.reload();
    await expect(panel.locator("[data-namecard]").getByText(battleTag, { exact: true })).toBeVisible();
    const ledger = await f.service.from("coin_transactions").select("amount,reason").eq("user_id", f.users[0].id);
    expect(ledger.data).toEqual([{ amount: -90, reason: "purchase_title" }]);
  } finally { await memberContext.close(); await f.cleanup(); }
});
