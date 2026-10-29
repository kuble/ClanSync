import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { NORMAL_NAMECARD_BACKGROUNDS } from "../src/lib/profile/backgrounds";
import { COSMETIC_COLOR_PRESETS } from "../src/lib/cosmetics/color-presets";

test("free backgrounds preview, persist and remain readable in both themes and shared profiles", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f=await createIsolatedBalanceFixture(2),peerContext=await browser.newContext();
  try {
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.goto("/store");
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"배경",exact:true}).click();
    await expect(page.getByRole("article")).toHaveCount(6);
    for(const background of NORMAL_NAMECARD_BACKGROUNDS){
      const item=page.getByRole("article",{name:background.name,exact:true});
      await expect(item.getByText("기본 제공",{exact:true})).toBeVisible();
      await expect(item.getByText("노말",{exact:true})).toBeVisible();
      await item.getByRole("button",{name:`${background.name} 미리보기`,exact:true}).click();
      const dialog=page.getByRole("dialog",{name:`${background.name} 미리보기`,exact:true});
      const card=dialog.locator(`[data-namebar="${background.id}"]`);
      await expect(card).toHaveAttribute("data-background-palette",background.paletteId);
      await expect(card.locator('[aria-hidden="true"]').first()).toHaveCSS("mask-image",new RegExp(`${background.id}\\.svg`));
      const palette=dialog.getByRole("group",{name:/배경 색상/});
      if(background.id==="rail") for(const color of COSMETIC_COLOR_PRESETS){
        await palette.getByRole("radio",{name:color.name,exact:true}).check();
        await expect(card).toHaveAttribute("data-background-palette",color.id);
        const rgb=[1,3,5].map(start=>parseInt(color.background.slice(start,start+2),16));
        await expect(card).toHaveCSS("background-color",`rgb(${rgb.join(", ")})`);
      }
      await palette.getByRole("radio",{name:"로즈",exact:true}).check();
      await expect(card).toHaveAttribute("data-background-palette","rose");
      await expect(card.locator("strong")).toHaveCSS("color","rgb(241, 245, 243)");
      await expect(card.locator("small")).toHaveCSS("color","rgb(195, 208, 202)");
      await expect(card.locator("[data-symbol-art]")).toHaveCSS("filter","none");
      await dialog.getByRole("button",{name:`${background.name} 적용`,exact:true}).click();
      await expect(dialog.getByRole("button",{name:`${background.name} 적용`,exact:true})).toBeDisabled();
      await dialog.getByRole("button",{name:"미리보기 닫기",exact:true}).click();
    }
    await page.reload();
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"배경",exact:true}).click();
    await expect(page.getByRole("article",{name:"타일",exact:true}).getByRole("button",{name:"타일 적용",exact:true})).toBeDisabled();
    await expect(page.getByRole("article",{name:"타일",exact:true}).locator('[data-namebar="tile"]')).toHaveAttribute("data-background-palette","rose");
    await page.setViewportSize({width:1100,height:900});
    await page.screenshot({path:test.info().outputPath("background-store-desktop.png")});
    await page.getByRole("button",{name:"라이트 테마",exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("article",{name:"타일",exact:true}).getByRole("button",{name:"타일 미리보기",exact:true}).click();
    const light=page.getByRole("dialog",{name:"타일 미리보기",exact:true});
    await expect(light.locator("[data-namecard] strong")).toHaveCSS("color","rgb(241, 245, 243)");
    await expect(light.locator("[data-symbol-art]")).toHaveCSS("filter","none");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath("background-preview-mobile-light.png"),animations:"disabled"});
    await light.getByRole("group",{name:/배경 색상/}).getByRole("radio",{name:"블루",exact:true}).check();
    await light.getByRole("button",{name:"미리보기 닫기",exact:true}).click();
    await page.reload();
    await page.getByRole("radiogroup",{name:"개인 꾸미기 분류"}).getByRole("radio",{name:"배경",exact:true}).click();
    await expect(page.getByRole("article",{name:"타일",exact:true}).locator('[data-namebar="tile"]')).toHaveAttribute("data-background-palette","rose");
    await page.goto("/profile");
    await page.getByRole("button",{name:"네임카드 꾸미기",exact:true}).click();
    const editor=page.getByRole("dialog",{name:"네임카드 꾸미기",exact:true});
    await editor.getByRole("group",{name:"네임카드 꾸미기 분류"}).getByRole("button",{name:"배경",exact:true}).click();
    await editor.getByRole("group",{name:/배경 색상/}).getByRole("radio",{name:"그린",exact:true}).click();
    await expect(editor.getByRole("region",{name:"현재 네임카드"}).locator('[data-namebar="tile"]')).toHaveAttribute("data-background-palette","green");
    const peer=await peerContext.newPage();
    await loginIsolatedBalanceUser(peer,f.users[1]);
    await peer.goto(f.path.replace(/balance$/,"stats")+"?player="+f.users[0].id);
    await expect(peer.getByRole("region",{name:"플레이어 배너"}).locator('[data-namebar="tile"]')).toHaveAttribute("data-background-palette","green");
    expect((await f.service.from("coin_transactions").select("id").eq("user_id",f.users[0].id)).data).toEqual([]);
    expect((await f.service.from("user_nameplate_inventory").select("option_id").eq("user_id",f.users[0].id)).data).toEqual([]);
  } finally {await peerContext.close();await f.cleanup();}
});
