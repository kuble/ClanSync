import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("discovery filters account demographics before pagination and preserves other filters", async ({page}, testInfo) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const ids: string[] = [];
  const prefix = `Fit-${f.clanId.slice(0,8)}`;
  try {
    const removed = await f.service.from("clan_members").delete().eq("clan_id",f.clanId).eq("user_id",f.users[1].id);
    expect(removed.error).toBeNull();
    const profile = await f.service.from("users").update({gender:"male"}).eq("id",f.users[1].id);
    expect(profile.error).toBeNull();
    const conditions = [
      {birth_year_from:null,min_birth_year:null,gender_policy:"all" as const},
      {birth_year_from:2000,min_birth_year:2000,gender_policy:"male" as const},
      {birth_year_from:1990,min_birth_year:2000,gender_policy:"all" as const},
      {birth_year_from:2000,min_birth_year:null,gender_policy:"all" as const},
      {birth_year_from:null,min_birth_year:2005,gender_policy:"male" as const},
      {birth_year_from:1999,min_birth_year:2001,gender_policy:"male" as const},
      {birth_year_from:2001,min_birth_year:null,gender_policy:"all" as const},
      {birth_year_from:null,min_birth_year:1999,gender_policy:"all" as const},
      {birth_year_from:null,min_birth_year:null,gender_policy:"female" as const},
      {birth_year_from:1990,min_birth_year:2010,gender_policy:"female" as const},
    ];
    const created = await f.service.from("clans").insert(conditions.map((condition,index)=>({
      ...condition, game_id:f.gameId, name:`${prefix}-${index}`, style:index===0?"casual" as const:"social" as const,
      tier_range:[index===5?"diamond":"gold"],
    }))).select("id,name");
    expect(created.error).toBeNull(); ids.push(...created.data!.map(row=>row.id));
    await loginIsolatedBalanceUser(page,f.users[1]);
    await page.goto(`/games/overwatch/clan?q=${prefix}`);
    const filter=page.getByRole("checkbox",{name:"가입 가능한 클랜만 보기",exact:true});
    const results=page.getByText(/^함께할 클랜 \d+$/);
    const cards=page.getByRole("button",{name:new RegExp(`^${prefix}.*클랜 상세 보기$`)});
    await expect(results).toHaveText("함께할 클랜 10");
    await filter.check();
    await expect(page).toHaveURL(/eligible=1/);
    await expect(results).toHaveText("함께할 클랜 6");
    await expect(cards).toHaveCount(5);
    for (const label of await cards.allTextContents()) expect(label).not.toMatch(new RegExp(`${prefix}-[6789]`));
    await page.getByRole("navigation",{name:"클랜 목록 페이지"}).getByRole("link",{name:"다음",exact:true}).click();
    await expect(page).toHaveURL(/page=2.*eligible=1/);
    await expect(cards).toHaveCount(1);
    await expect(filter).toBeChecked();
    await page.goBack({waitUntil:"commit",timeout:15_000});
    await expect(cards).toHaveCount(5);
    await expect(filter).toBeChecked();
    await page.getByRole("combobox",{name:"지향",exact:true}).selectOption("social");
    await page.getByRole("combobox",{name:"모집 티어",exact:true}).selectOption("gold");
    await page.getByRole("button",{name:"검색",exact:true}).click();
    await expect(results).toHaveText("함께할 클랜 4");
    await page.reload({waitUntil:"domcontentloaded",timeout:15_000});
    await expect(filter).toBeChecked();
    await expect(page.getByRole("combobox",{name:"지향",exact:true})).toHaveValue("social");
    await filter.uncheck();
    await expect(results).toHaveText("함께할 클랜 8");
    await page.goBack({waitUntil:"commit",timeout:15_000});
    await expect(filter).toBeChecked();
    await expect(results).toHaveText("함께할 클랜 4");
    await page.getByRole("link",{name:"초기화",exact:true}).click();
    await expect(filter).not.toBeChecked();
    await expect(page.getByRole("textbox",{name:"클랜 검색",exact:true})).toHaveValue("");
    for (const [gender,total] of [["female",5],["undisclosed",3]] as const) {
      const update=await f.service.from("users").update({gender}).eq("id",f.users[1].id);
      expect(update.error).toBeNull();
      await page.goto(`/games/overwatch/clan?q=${prefix}&eligible=1`);
      await expect(results).toHaveText(`함께할 클랜 ${total}`);
      await expect(cards).toHaveCount(total);
      await expect(page.getByRole("button",{name:"가입 조건 미충족",exact:true})).toHaveCount(0);
    }
    await page.setViewportSize({width:1304,height:884});
    if ((await page.locator("html").getAttribute("class"))?.includes("dark")) await page.getByTitle("라이트 / 다크 테마 전환",{exact:true}).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.screenshot({path:testInfo.outputPath("clan-discovery-filter-light.png"),fullPage:true});
    await page.getByTitle("라이트 / 다크 테마 전환",{exact:true}).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.screenshot({path:testInfo.outputPath("clan-discovery-filter-dark.png"),fullPage:true});
    await page.setViewportSize({width:320,height:844});
    await expect(filter).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath("clan-discovery-filter-mobile.png"),fullPage:true});
    await page.getByRole("textbox",{name:"클랜 검색",exact:true}).fill(`${prefix}-1`);
    await page.getByRole("button",{name:"검색",exact:true}).click();
    await expect(results).toHaveText("함께할 클랜 0");
    await expect(page.getByText("조건에 맞는 클랜이 없습니다.",{exact:false})).toBeVisible();
    await expect(filter).toBeChecked();
  } finally {
    if(ids.length) { const removed=await f.service.from("clans").delete().in("id",ids); expect(removed.error).toBeNull(); }
    await f.cleanup();
  }
});
