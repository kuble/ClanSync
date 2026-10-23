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
    await expect(page.getByRole("heading", { name: "나를 꾸미는 상점", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await page.getByRole("group", { name: "개인 꾸미기 분류", exact: true }).getByRole("button", { name: "프레임", exact: true }).click();
    const product = page.getByRole("article").filter({ has: page.getByRole("heading", { name: frame.data!.name_ko, exact: true }) });
    await product.getByRole("button", { name: "구매", exact: true }).click();
    await page.getByRole("dialog", { name: "꾸미기 구매", exact: true }).getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(page.locator('[aria-label="보유 코인"] strong')).toHaveText((1_000 - frame.data!.price_coins).toLocaleString("ko-KR"));
    await expect(product.getByRole("link", { name: "구매 완료 · 설정하기", exact: true })).toBeVisible();

    const inventory = await f.service.from("user_nameplate_inventory").select("option_id,nameplate_options(category,code)").eq("user_id", user.id);
    expect(inventory.error).toBeNull();
    const ownedFrame = inventory.data!.find((row) => row.nameplate_options?.code.startsWith("pf_entrance_store:"));
    expect(ownedFrame).toBeDefined();
    await page.getByRole("link", { name: "프로필", exact: true }).click();
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    await editor.getByRole("combobox", { name: "네임카드 프레임", exact: true }).selectOption(ownedFrame!.option_id);
    await expect(editor.locator('[data-frame="entrance"]')).toBeVisible();
    await page.keyboard.press("Escape");

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
