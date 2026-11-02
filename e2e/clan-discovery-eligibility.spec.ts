import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
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
      tier_range:index === 0 ? [] : index === 1 ? ["gold","plat","diamond","master"] : [index === 5 ? "diamond" : "gold"],
      icon_url:index === 1 ? "/images/overwatch/maps/busan.webp" : null,
    }))).select("id,name");
    expect(created.error).toBeNull(); ids.push(...created.data!.map(row=>row.id));
    const withTitle = created.data!.find(row => row.name === prefix + "-1")!;
    const post = await f.service.from("board_posts").insert({
      game_id:f.gameId, clan_id:withTitle.id, created_by:f.users[0].id, post_type:"promotion",
      title:"주말 오버워치 내전 멤버 모집", content:"금요일 저녁에 함께합니다.",
    });
    expect(post.error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[1]);
    const seed = f.clanId;
    await page.goto(`/games/overwatch/clan?q=${prefix}&tier=diamond&seed=${seed}`);
    const tierResults = page.getByRole("article");
    await expect(tierResults).toHaveCount(3);
    for (const tag of ["티어 무관","골드~마스터","다이아몬드"]) {
      await expect(tierResults.getByText(tag,{exact:true})).toBeVisible();
    }
    await expect(tierResults.getByText("주말 오버워치 내전 멤버 모집")).toHaveCount(0);
    for (const width of [1074,390]) {
      await page.setViewportSize({width,height:884});
      const heights = await tierResults.evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    }
    await page.goto(`/games/overwatch/clan?q=${prefix}&seed=${seed}`);
    const filter=page.getByRole("checkbox",{name:"추천 클랜",exact:true});
    const results=page.getByText(/^함께할 클랜 \d+$/);
    const cards=page.getByRole("button",{name:new RegExp(`^${prefix}.*클랜 상세 보기$`)});
    await expect(results).toHaveText("함께할 클랜 10");
    const expectedOrder = created.data!.map(row => ({
      name: row.name, key: createHash("md5").update(seed + row.id).digest("hex"),
    })).sort((a,b) => a.key.localeCompare(b.key));
    await expect(cards.locator("strong")).toHaveText(expectedOrder.slice(0,5).map(row => row.name));
    await filter.hover();
    await expect(page.getByRole("tooltip")).toContainText("내 성별과 출생연도");
    await filter.check();
    await expect(page).toHaveURL(/eligible=1/);
    await expect(results).toHaveText("함께할 클랜 6");
    await expect(cards).toHaveCount(5);
    const firstPage = await cards.allTextContents();
    for (const label of firstPage) expect(label).not.toMatch(new RegExp(`${prefix}-[6789]`));
    await page.getByRole("navigation",{name:"클랜 목록 페이지"}).getByRole("link",{name:"다음",exact:true}).click();
    await expect(page).toHaveURL(/page=2.*eligible=1/);
    await expect(cards).toHaveCount(1);
    const secondPage = await cards.allTextContents();
    expect(firstPage).not.toContain(secondPage[0]);
    await page.reload();
    await expect(cards).toHaveText(secondPage);
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
    await page.getByRole("textbox",{name:"클랜 검색",exact:true}).fill(`${prefix}-6`);
    await page.getByRole("button",{name:"검색",exact:true}).click();
    await expect(results).toHaveText("함께할 클랜 0");
    await expect(page.getByText("조건에 맞는 클랜이 없습니다.",{exact:false})).toBeVisible();
    await expect(filter).toBeChecked();
  } finally {
    if(ids.length) { const removed=await f.service.from("clans").delete().in("id",ids); expect(removed.error).toBeNull(); }
    await f.cleanup();
  }
});
