import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("기본 디자인과 공통 잔액은 여러 게임 클랜에서 동일하다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const otherClanId = randomUUID();
  try {
    const game = await f.service.from("games").select("id").eq("slug", "valorant").single();
    expect(game.error).toBeNull();
    expect((await f.service.from("user_game_profiles").insert({user_id:f.users[0].id,game_id:game.data!.id,game_uid:"provider:"+randomUUID(),riot_id:"Store"+f.users[0].id.slice(0,8)+"#QA1",is_verified:true})).error).toBeNull();
    expect((await f.service.from("clans").insert({id:otherClanId,game_id:game.data!.id,name:"StoreUI-"+otherClanId.slice(0,8)})).error).toBeNull();
    expect((await f.service.from("clan_members").insert({clan_id:otherClanId,user_id:f.users[0].id,role:"member",status:"active"})).error).toBeNull();
    expect((await f.service.from("users").update({coin_balance:1000}).eq("id",f.users[0].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.goto("/store");
    await expect(page.getByRole("main").getByLabel("보유 코인").locator("strong")).toHaveText("1,000");
    const categories=page.getByRole("radiogroup",{name:"개인 꾸미기 분류"});
    await categories.getByRole("radio",{name:"카드 프레임",exact:true}).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article",{name:"기본 카드 프레임",exact:true})).toBeVisible();
    await expect(page.getByRole("article",{name:"프리미엄 골드 프레임",exact:true})).toHaveCount(0);
    await page.goto("/games/valorant/clan/"+otherClanId+"/store");
    await page.getByRole("link",{name:"프로필",exact:true}).click();
    await page.getByRole("link",{name:"개인 상점",exact:true}).click();
    await expect(page.getByRole("main").getByLabel("보유 코인").locator("strong")).toHaveText("1,000");
    expect((await f.service.from("coin_transactions").select("id").eq("user_id",f.users[0].id)).data).toEqual([]);
  } finally { await f.service.from("clans").delete().eq("id",otherClanId);await f.cleanup(); }
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
      if (label === "테마") await expect(page.getByRole("article")).toHaveCount(0);
      else await expect(page.getByRole("article").first()).toBeVisible();
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

test("클랜 미가입자도 임시 칭호를 구매·적용하며 삭제된 프레임은 표시하지 않는다", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(1);
  const titleId = randomUUID();
  try {
    expect((await f.service.from("nameplate_options").insert({id:titleId,game_id:f.gameId,category:"sub",code:"title-e2e-"+titleId,name_ko:"함께하는 플레이어",unlock_source:"store",price_coins:90})).error).toBeNull();
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
    await expect(premium).toHaveCount(0);
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
  } finally { await f.cleanup(); expect((await f.service.from("nameplate_options").delete().eq("id",titleId)).error).toBeNull(); }
});
