import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("개인 상점은 여러 게임 클랜의 공통 잔액을 사용하고 프레임의 Premium 조건을 유지한다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const otherClanId = `00000000-${randomUUID().slice(9)}`;
  let otherCreated = false;
  try {
    const user = f.users[0];
    const game = await f.service.from("games").select("id").eq("slug", "valorant").single();
    expect(game.error).toBeNull();
    expect((await f.service.from("user_game_profiles").insert({ user_id: user.id, game_id: game.data!.id, game_uid: `provider:${randomUUID()}`, riot_id: "StorePlayer#1234", is_verified: true })).error).toBeNull();
    expect((await f.service.from("clans").insert({ id: otherClanId, game_id: game.data!.id, name: `StoreUI-${user.id.slice(0, 8)}`, subscription_tier: "free" })).error).toBeNull();
    otherCreated = true;
    expect((await f.service.from("clan_members").insert({ clan_id: otherClanId, user_id: user.id, role: "member", status: "active" })).error).toBeNull();
    expect((await f.service.from("users").update({ coin_balance: 1_000 }).eq("id", user.id)).error).toBeNull();
    const frame = await f.service.from("store_items").select("name_ko,price_coins").eq("slug", "profile_entrance_fx").single();
    expect(frame.error).toBeNull();
    const before = await f.service.from("clans").select("id,coin_balance").in("id", [f.clanId, otherClanId]).order("id");
    expect(before.error).toBeNull();

    await loginIsolatedBalanceUser(page, user);
    await page.goto("/store");
    await expect(page.getByRole("heading", { name: "네임카드 상점", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "현재 네임카드" })).toContainText("StorePlayer#1234");
    await page.getByRole("radiogroup", { name: "개인 꾸미기 분류", exact: true }).getByRole("radio", { name: "카드 프레임", exact: true }).click();
    await page.getByRole("textbox", { name: "디자인 검색" }).fill("프리미엄 골드");
    const product = page.getByRole("article", { name: "프리미엄 골드 프레임", exact: true });
    await product.getByRole("button", { name: "프리미엄 골드 프레임 구매", exact: true }).click();
    await page.getByRole("dialog", { name: "네임카드 디자인 구매", exact: true }).getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(page.locator('[aria-label="보유 코인"] strong')).toHaveText((1_000 - frame.data!.price_coins).toLocaleString("ko-KR"));
    await expect(product).toBeVisible();
    const previewRegion = page.getByRole("region", { name: "현재 네임카드" });
    await previewRegion.getByRole("button", { name: "프리미엄 골드 프레임 적용", exact: true }).click();
    await expect(previewRegion.getByRole("button", { name: "프리미엄 골드 프레임 적용", exact: true })).toHaveText("적용 중");

    const inventory = await f.service.from("user_nameplate_inventory").select("option_id,nameplate_options(category,code)").eq("user_id", user.id);
    expect(inventory.error).toBeNull();
    const ownedFrame = inventory.data!.find((row) => row.nameplate_options?.code.startsWith("pf_entrance_store:"));
    expect(ownedFrame).toBeDefined();
    const after = await f.service.from("clans").select("id,coin_balance").in("id", [f.clanId, otherClanId]).order("id");
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
    const ledger = await f.service.from("coin_transactions").select("amount,clan_id,pool_type").eq("user_id", user.id);
    expect(ledger.error).toBeNull();
    expect(ledger.data).toEqual([{ amount: -frame.data!.price_coins, clan_id: null, pool_type: "personal" }]);
    await page.goto(`/games/valorant/clan/${otherClanId}/store`);
    await expect(page.getByRole("heading", { name: frame.data!.name_ko, exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "개인 상점", exact: true }).click();
    await expect(page.locator('[aria-label="보유 코인"] strong')).toHaveText((1_000 - frame.data!.price_coins).toLocaleString("ko-KR"));
  } finally {
    if (otherCreated) expect((await f.service.from("clans").delete().eq("id", otherClanId)).error).toBeNull();
    await f.cleanup();
  }
});


test("상점은 보유 상품도 실제 추가일 최신순으로 표시하고 선택 메뉴를 제공하지 않는다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const prefix = "정렬QA" + randomUUID().slice(0, 8);
  const ids = Array.from({ length: 14 }, () => randomUUID());
  const names = ids.map((_, index) => prefix + "-" + String(index).padStart(2, "0"));
  try {
    expect((await f.service.from("nameplate_options").insert(ids.map((id, index) => ({
      id, game_id: f.gameId, category: "sub" as const, code: "title-e2e-" + id, name_ko: names[index],
      unlock_source: "store" as const, price_coins: 20, is_active: true,
      created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    })))).error).toBeNull();
    expect((await f.service.from("user_nameplate_inventory").insert({ user_id: f.users[0].id, option_id: ids[13] })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/store");
    await expect(page.getByRole("combobox")).toHaveCount(0);
    const categories = page.getByRole("radiogroup", { name: "개인 꾸미기 분류" });
    for (const label of ["테마", "심벌", "초상 프레임", "배경"]) {
      await categories.getByRole("radio", { name: label, exact: true }).click();
      await expect(page.getByRole("article").first()).toBeVisible();
    }
    await categories.getByRole("radio", { name: "칭호", exact: true }).click();
    const search = page.getByRole("textbox", { name: "디자인 검색" });
    await search.fill(prefix);
    const namesOnPage = () => page.getByRole("article").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label")));
    await expect.poll(namesOnPage).toEqual(names.slice(2).reverse());
    await expect(page.getByRole("article", { name: names[13], exact: true })).toContainText("보유 중");
    const newest = page.getByRole("article", { name: names[13], exact: true });
    const sample = newest.locator("[data-namecard]");
    await expect(sample.locator("img, svg, strong")).toHaveCount(0);
    await newest.getByRole("button", { name: names[13] + " 미리보기", exact: true }).click();
    const current = page.getByRole("region", { name: "현재 네임카드" });
    await expect(current).toContainText(names[13]);
    expect((await f.service.from("user_namecard_selections").select("option_id").eq("user_id", f.users[0].id)).data).toEqual([]);
    await current.getByRole("button", { name: "미리보기 초기화", exact: true }).click();
    await expect(current).not.toContainText(names[13]);
    await newest.getByRole("button", { name: names[13] + " 적용", exact: true }).click();
    await expect(newest.getByRole("button", { name: names[13] + " 적용", exact: true })).toHaveText("적용 중");
    expect((await f.service.from("users").select("coin_balance").eq("id", f.users[0].id).single()).data?.coin_balance).toBe(0);
    const width = (await newest.boundingBox())!.width;
    await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
    await expect.poll(namesOnPage).toEqual([names[1], names[0]]);
    expect((await page.getByRole("article").first().boundingBox())!.width).toBeCloseTo(width, 0);
    await search.fill(prefix + "-none");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "검색 결과가 없습니다." })).toBeVisible();
    await page.getByRole("button", { name: "검색 지우기" }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByRole("article", { name: "칭호 없음", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/personal-store-desktop.png", fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/personal-store-mobile.png", fullPage: true, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await f.cleanup();
    expect((await f.service.from("nameplate_options").delete().in("id", ids)).error).toBeNull();
  }
});

test("클랜 미가입자도 칭호를 구매·적용하며 Premium 프레임은 구매할 수 없다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  try {
    const user = f.users[0];
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", user.id)).error).toBeNull();
    expect((await f.service.from("users").update({ coin_balance: 100 }).eq("id", user.id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, user);
    await page.goto("/store");
    const categories = page.getByRole("radiogroup", { name: "개인 꾸미기 분류" });
    await categories.getByRole("radio", { name: "카드 프레임", exact: true }).click();
    const search = page.getByRole("textbox", { name: "디자인 검색" });
    await search.fill("프리미엄 골드");
    const premium = page.getByRole("article", { name: "프리미엄 골드 프레임", exact: true });
    await expect(premium.getByRole("button", { name: "프리미엄 골드 프레임 구매", exact: true })).toBeDisabled();
    await expect(premium).toContainText("Premium 필요");
    await categories.getByRole("radio", { name: "칭호", exact: true }).click();
    await search.fill("함께하는 플레이어");
    const product = page.getByRole("article", { name: "함께하는 플레이어", exact: true });
    await product.getByRole("button", { name: "함께하는 플레이어 구매", exact: true }).click();
    await page.getByRole("dialog", { name: "네임카드 디자인 구매", exact: true }).getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(page.locator('[aria-label="보유 코인"] strong')).toHaveText("10");
    await expect(search).toHaveValue("함께하는 플레이어");
    await expect(product).toBeVisible();
    const current = page.getByRole("region", { name: "현재 네임카드" });
    await current.getByRole("button", { name: "함께하는 플레이어 적용", exact: true }).click();
    await expect(current.getByRole("button", { name: "함께하는 플레이어 적용", exact: true })).toHaveText("적용 중");
    await expect(page.getByRole("region", { name: "현재 네임카드" })).toContainText("함께하는 플레이어");
    await page.reload();
    await expect(page.getByRole("region", { name: "현재 네임카드" })).toContainText("함께하는 플레이어");
  } finally { await f.cleanup(); }
});
