import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });
test.setTimeout(90_000);

test("separate stores cancel purchases without changing balances or ownership", async ({ page }) => {
  const f=await createIsolatedBalanceFixture(1), titleId=randomUUID();
  try {
    expect((await f.service.from("users").update({coin_balance:500}).eq("id",f.users[0].id)).error).toBeNull();
    expect((await f.service.from("clans").update({coin_balance:500}).eq("id",f.clanId)).error).toBeNull();
    expect((await f.service.from("nameplate_options").insert({id:titleId,game_id:f.gameId,category:"sub",code:"title-e2e-"+titleId,name_ko:"취소 검증 칭호",unlock_source:"store",price_coins:50})).error).toBeNull();
    const item=await f.service.from("store_items").select("name_ko").eq("slug","clan_emoji_slots_3").single();expect(item.error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[0]);await page.goto(f.path.replace(/balance$/,"store"));
    await page.getByRole("radiogroup",{name:"클랜 꾸미기 분류",exact:true}).getByRole("radio",{name:"반응",exact:true}).click();
    await page.getByRole("article",{name:item.data!.name_ko,exact:true}).getByRole("button",{name:"구매",exact:true}).click();
    await page.getByRole("dialog",{name:"꾸미기 구매",exact:true}).getByRole("button",{name:"취소",exact:true}).click();
    await page.goto("/store");
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"칭호",exact:true}).click();
    await page.getByRole("button",{name:"취소 검증 칭호 구매",exact:true}).click();
    await page.getByRole("dialog",{name:"네임카드 디자인 구매",exact:true}).getByRole("button",{name:"취소",exact:true}).click();
    expect((await f.service.from("users").select("coin_balance").eq("id",f.users[0].id).single()).data?.coin_balance).toBe(500);
    expect((await f.service.from("clans").select("coin_balance").eq("id",f.clanId).single()).data?.coin_balance).toBe(500);
    expect((await f.service.from("purchases").select("id").eq("user_id",f.users[0].id)).data).toEqual([]);
    expect((await f.service.from("user_nameplate_inventory").select("option_id").eq("user_id",f.users[0].id)).data).toEqual([]);
  } finally {await f.cleanup();expect((await f.service.from("nameplate_options").delete().eq("id",titleId)).error).toBeNull();}
});
