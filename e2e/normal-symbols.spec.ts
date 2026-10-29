import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { NORMAL_SYMBOLS } from "../src/lib/profile/symbols";

test("five free symbols apply without purchases and follow the player into comments", async ({ page }) => {
  test.setTimeout(120_000);
  const f=await createIsolatedBalanceFixture(1),postId=randomUUID(),base=f.path.replace(/\/balance$/,"");
  try {
    expect((await f.service.from("users").update({coin_balance:100}).eq("id",f.users[0].id)).error).toBeNull();
    expect((await f.service.from("clan_board_posts").insert({id:postId,clan_id:f.clanId,author_id:f.users[0].id,kind:"free",title:"심벌 확인",content:"프로필 심벌 공유"})).error).toBeNull();
    expect((await f.service.from("clan_board_comments").insert({post_id:postId,author_id:f.users[0].id,content:"심벌 댓글"})).error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.goto("/store");
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"심벌",exact:true}).click();
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(page.getByRole("region",{name:"현재 네임카드"})).toHaveCount(0);
    await expect(page.getByText("기본 방패",{exact:true})).toHaveCount(0);
    for(const symbol of NORMAL_SYMBOLS){
      const item=page.getByRole("article",{name:symbol.name,exact:true});
      await expect(item.getByText("노말",{exact:true})).toBeVisible();
      await expect(item.getByText("기본 제공",{exact:true})).toBeVisible();
      await expect(item.locator(`[data-symbol-art="${symbol.id}"]`)).toBeVisible();
      await item.getByRole("button",{name:`${symbol.name} 미리보기`,exact:true}).click();
      const dialog=page.getByRole("dialog",{name:`${symbol.name} 미리보기`,exact:true});
      await expect(dialog.getByRole("region",{name:"적용 미리보기"}).locator(`[data-symbol-art="${symbol.id}"]`)).toBeVisible();
      await dialog.getByRole("button",{name:`${symbol.name} 적용`,exact:true}).click();
      await expect(dialog.getByRole("button",{name:`${symbol.name} 적용`,exact:true})).toBeDisabled();
      await dialog.getByRole("button",{name:"미리보기 닫기",exact:true}).click();
    }
    await page.reload();
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"심벌",exact:true}).click();
    await expect(page.getByRole("article",{name:"스파크",exact:true}).getByRole("button",{name:"스파크 적용",exact:true})).toBeDisabled();
    await expect(page.getByRole("main").getByLabel("보유 코인").locator("strong")).toHaveText("100");
    expect((await f.service.from("user_nameplate_inventory").select("option_id").eq("user_id",f.users[0].id)).data).toEqual([]);
    expect((await f.service.from("coin_transactions").select("id").eq("user_id",f.users[0].id)).data).toEqual([]);
    await page.setViewportSize({width:1100,height:900});
    await page.screenshot({path:test.info().outputPath("symbols-store-desktop.png")});
    await page.setViewportSize({width:755,height:1004});
    await page.screenshot({path:test.info().outputPath("symbols-store-tablet.png")});
    await page.getByRole("button",{name:"라이트 테마",exact:true}).click();
    await expect(page.getByRole("article",{name:"스파크",exact:true}).locator('[data-symbol-art="spark"]')).toHaveCSS("filter","brightness(0)");
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath("symbols-store-mobile-light.png")});
    await page.goto(`${base}/board/free/${postId}`);
    await expect(page.locator("#comments").getByRole("img",{name:`${f.users[0].nickname} 프로필 심볼`,exact:true})).toHaveAttribute("src",/spark/);
    expect((await page.request.get("/namecards/v1/shield.webp")).status()).toBe(404);
  } finally {await f.cleanup();}
});
