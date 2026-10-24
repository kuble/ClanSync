import { expect,test } from "@playwright/test";
import sharp from "sharp";
import { createIsolatedBalanceFixture,loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import type { ShowcaseDocument } from "../src/lib/showcase/domain";

test("진열장: 호버 보관함·필터·놓는 순간 자동 저장·실패 복구·터치",async({page,browser},info)=>{
  test.setTimeout(240_000);page.setDefaultTimeout(15_000);
  const f=await createIsolatedBalanceFixture(2);
  const owner=await f.memberClient(0);
  const visitor=await browser.newContext();
  try{
    for(const id of ["wood-label","trailing-ivy","potted-plant","brass-light","shelf-offset"]){expect((await owner.rpc("claim_showcase_product",{p_catalog_id:id})).error).toBeNull();}
    await page.setViewportSize({width:1365,height:1115});
    await loginIsolatedBalanceUser(page,f.users[0]);await page.goto("/profile");
    const showcase=page.getByRole("region",{name:"진열장",exact:true});
    const scene=showcase.getByTestId("showcase-scene"),drawer=showcase.getByTestId("showcase-drawer");
    const saved=()=>expect(page.getByTestId("showcase-save-status")).toHaveText("저장 완료");
    const open=async(category?:string)=>{await showcase.getByRole("button",{name:"보관함",exact:true}).hover();await expect(drawer).toHaveAttribute("data-open","true");if(category)await drawer.getByRole("button",{name:category,exact:true}).click();};
    const outside=async()=>{await page.mouse.move(0,0);await expect(drawer).toHaveAttribute("data-open","false");};
    const read=async()=>{const result=await f.service.from("user_showcase_libraries").select("revision,document").eq("user_id",f.users[0].id).maybeSingle();expect(result.error).toBeNull();return result.data;};
    await expect(scene).toBeVisible();await outside();
    const intro=page.getByRole("region",{name:"플레이어 소개",exact:true});
    const panelColor=await intro.evaluate(el=>getComputedStyle(el).backgroundColor);
    await expect(showcase).toHaveCSS("background-color",panelColor);await expect(drawer).toHaveCSS("background-color",panelColor);
    await expect(showcase).toHaveCSS("border-top-left-radius","0px");await expect(showcase).toHaveCSS("border-bottom-left-radius","0px");
    await expect(showcase.getByRole("heading",{name:"진열장",exact:true})).toBeVisible();
    await expect(showcase.getByText("좋아하는 것들이 모이는 곳")).toHaveCount(0);
    await expect(showcase.getByRole("button",{name:/꾸미기|저장하고 닫기|편집 취소/})).toHaveCount(0);
    await expect(showcase.getByText("이 진열장에 놓인 물건",{exact:true})).toHaveCount(0);
    expect(Math.abs((await drawer.boundingBox())!.y-((await scene.boundingBox())!.y+(await scene.boundingBox())!.height))).toBeLessThan(2);
    await page.screenshot({path:info.outputPath("showcase-hover-closed.png"),fullPage:true});
    const closedHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
    await open("굿즈");
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(closedHeight);
    const openedPanel=(await page.locator("#showcase-inventory-panel").boundingBox())!;
    expect(openedPanel.height).toBeLessThan(190);
    expect(openedPanel.y+openedPanel.height).toBeLessThanOrEqual((await drawer.boundingBox())!.y+1);
    await expect(drawer.getByRole("button",{name:"초록 화분 꺼내기",exact:true})).toBeVisible();
    await drawer.getByLabel("보관함 검색").fill("없는 상품");await expect(drawer.getByText("해당하는 항목이 없어요.")).toBeVisible();
    await drawer.getByLabel("보관함 검색").fill("");await drawer.getByLabel("보관함 배치 상태").selectOption("stored");
    await expect(drawer.getByRole("button",{name:"산빛 액자 배치 보기",exact:true})).toHaveCount(0);
    await drawer.getByLabel("보관함 배치 상태").selectOption("placed");await expect(drawer.getByRole("button",{name:"산빛 액자 배치 보기",exact:true})).toBeVisible();
    await drawer.getByLabel("보관함 배치 상태").selectOption("all");
    expect(await read()).toBeNull(); // Hover and filter changes never write the layout.
    await page.screenshot({path:info.outputPath("showcase-hover-inventory.png"),fullPage:true});
    const plant=drawer.getByRole("button",{name:"초록 화분 꺼내기",exact:true});
    const from=(await plant.boundingBox())!,target=(await scene.boundingBox())!;
    await page.mouse.move(from.x+from.width/2,from.y+20);await page.mouse.down();
    await page.mouse.move(target.x+target.width*.5,target.y+target.height*.45,{steps:8});
    await expect(drawer).toHaveAttribute("data-open","false");expect(await read()).toBeNull();
    await page.mouse.up();await saved();
    await expect(scene.getByRole("button",{name:"초록 화분 선택",exact:true})).toHaveCount(1);
    expect(((await read())!.document as ShowcaseDocument).cabinets[0].items.find(i=>i.catalogId==="potted-plant")!.shelf).toBe(0);
    // Dragging a placed object over the closed drawer opens it; release returns the unit.
    const placed=(await scene.getByRole("button",{name:"초록 화분 선택",exact:true}).boundingBox())!;
    const dock=(await drawer.boundingBox())!;
    await page.mouse.move(placed.x+placed.width/2,placed.y+placed.height/2);await page.mouse.down();
    await page.mouse.move(dock.x+dock.width/2,dock.y+20,{steps:8});await expect(drawer).toHaveAttribute("data-open","true");
    await page.mouse.up();await saved();await expect(scene.getByRole("button",{name:"초록 화분 선택",exact:true})).toHaveCount(0);
    await outside();
    // Cancel and invalid drops do not save or consume inventory.
    await open("굿즈");const before=(await read())!.revision;const source=(await plant.boundingBox())!;
    await page.mouse.move(source.x+source.width/2,source.y+20);await page.mouse.down();await page.mouse.move(5,100,{steps:8});await page.mouse.up();
    expect((await read())!.revision).toBe(before);
    await open();const again=(await plant.boundingBox())!;const board=(await scene.boundingBox())!;
    await page.mouse.move(again.x+again.width/2,again.y+20);await page.mouse.down();await page.mouse.move(board.x+board.width*.5,board.y+board.height*.45,{steps:8});await page.keyboard.press("Escape");await page.mouse.up();
    expect((await read())!.revision).toBe(before);
    // Wallpaper changes must leave the wood frame and shelves pixel-identical.
    for(const template of ["중앙 강조형","기본 3단형"]){
      await open("선반");await drawer.getByRole("button",{name:template+" 선반 적용",exact:true}).click();await saved();
      await open("벽지");await drawer.getByRole("button",{name:"숲빛 벽지 적용",exact:true}).click();await saved();await outside();
      const original=await sharp(await scene.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
      for(const wallpaper of ["크림","밤하늘"]){
        await open("벽지");await drawer.getByRole("button",{name:wallpaper+" 벽지 적용",exact:true}).click();await saved();await outside();
        const changed=await sharp(await scene.screenshot({path:info.outputPath(`wallpaper-${template}-${wallpaper}.png`)})).removeAlpha().raw().toBuffer({resolveWithObject:true});
        expect(changed.info).toEqual(original.info);
        const pixel=(data:Buffer,x:number,y:number)=>{const offset=(Math.floor(y*original.info.height)*original.info.width+Math.floor(x*original.info.width))*3;return [...data.subarray(offset,offset+3)];};
        for(const [x,y] of [[.015,.5],[.985,.5],[.5,.015],[.5,.98],...(template==="중앙 강조형"?[[.5,.07],[.5,.90]]:[[.2,.36]])])expect(pixel(changed.data,x,y),`${template} ${wallpaper}: wood at ${x},${y}`).toEqual(pixel(original.data,x,y));
        expect(pixel(changed.data,.25,.8)).not.toEqual(pixel(original.data,.25,.8));
      }
    }
    // Styles live inside the inventory and persist without a separate save button.
    await open("벽지");await drawer.getByRole("button",{name:"크림 벽지 적용",exact:true}).click();await saved();
    await open("선반");await expect(drawer.getByRole("button",{name:"계단형 선반 적용",exact:true})).toHaveCount(0);
    await drawer.getByRole("button",{name:"엇갈림형 선반 적용",exact:true}).click();await saved();
    await page.reload();await expect(scene).toHaveClass(/cream/);
    await open("선반");await expect(drawer.getByRole("button",{name:"엇갈림형 선반 적용",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.screenshot({path:info.outputPath("showcase-hover-shelves.png"),fullPage:true});
    await open("벽지");await drawer.getByRole("button",{name:"숲빛 벽지 적용",exact:true}).click();await saved();
    await open("장식");await drawer.getByRole("button",{name:"늘어진 이파리 꺼내기",exact:true}).click();await saved();
    await drawer.getByRole("button",{name:"나무 주제 명패 꺼내기",exact:true}).click();await saved();
    await drawer.getByLabel("명패 문구").fill("나의 작은 숲");await drawer.getByLabel("명패 문구").press("Enter");await saved();
    await open("조명");await drawer.getByRole("button",{name:"황동 조명 꺼내기",exact:true}).click();await saved();await expect(scene.getByTestId("showcase-light-beam")).toHaveCount(1);
    await drawer.getByRole("button",{name:"보관함에 넣기",exact:true}).click();await saved();await expect(scene.getByTestId("showcase-light-beam")).toHaveCount(0);
    // Save failure keeps subsequent changes; one retry saves the latest layout.
    let fail=true;await page.route("**/profile",route=>{if(fail&&route.request().method()==="POST"){fail=false;return route.abort("failed");}return route.continue();});
    await open("벽지");await drawer.getByRole("button",{name:"크림 벽지 적용",exact:true}).click();
    await expect(showcase.getByRole("alert")).toContainText("저장하지 못했습니다");
    await open("벽지");await drawer.getByRole("button",{name:"밤하늘 벽지 적용",exact:true}).click();
    await showcase.getByRole("button",{name:"자동 저장 다시 시도",exact:true}).click();await saved();await page.unroute("**/profile");
    await page.reload();await expect(scene).toHaveClass(/midnight/);
    // Moving through the account panel must retain the latest automatic save.
    await page.getByRole("tab",{name:"계정 정보",exact:true}).click();await page.getByRole("tab",{name:"진열장",exact:true}).click();await expect(scene).toHaveClass(/midnight/);
    await open("벽지");await drawer.getByRole("button",{name:"숲빛 벽지 적용",exact:true}).click();await saved();
    await showcase.getByRole("button",{name:"진열장 관리",exact:true}).click();
    const manage=page.getByRole("dialog",{name:"진열장 관리",exact:true});
    await manage.getByRole("button",{name:"새 진열장",exact:true}).click();await saved();
    await manage.getByRole("button",{name:"대표로 설정",exact:true}).click();await saved();await page.keyboard.press("Escape");
    await open("굿즈");await expect(drawer.getByRole("button",{name:"작은 여우 배치 보기",exact:true})).toBeDisabled();
    await showcase.getByRole("button",{name:"진열장 관리",exact:true}).click();await manage.getByLabel("진열장 선택").selectOption({label:"진열장 1"});await page.keyboard.press("Escape");
    // Touch fallback opens the inline dock and supports the same drop transaction.
    await page.setViewportSize({width:390,height:844});await outside();await drawer.scrollIntoViewIfNeeded();
    const touch=await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
    const tap=async(x:number,y:number)=>{await touch.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});await touch.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});};
    const toggle=(await drawer.getByRole("button",{name:"보관함",exact:true}).boundingBox())!;await tap(toggle.x+20,toggle.y+15);await expect(drawer).toHaveAttribute("data-open","true");
    await drawer.getByRole("button",{name:"굿즈",exact:true}).click();await plant.scrollIntoViewIfNeeded();
    const mobileFrom=(await plant.boundingBox())!,mobileTo=(await scene.boundingBox())!;
    await touch.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:mobileFrom.x+mobileFrom.width/2,y:mobileFrom.y+20,id:1}]});
    for(let step=1;step<=8;step++)await touch.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:mobileFrom.x+mobileFrom.width/2+(mobileTo.x+mobileTo.width*.2-mobileFrom.x-mobileFrom.width/2)*step/8,y:mobileFrom.y+20+(mobileTo.y+mobileTo.height*.88-mobileFrom.y-20)*step/8,id:1}]});
    await touch.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await saved();
    await expect(scene.getByRole("button",{name:"초록 화분 선택",exact:true})).toHaveCount(1);
    const mobileToggle=(await drawer.getByRole("button",{name:"보관함",exact:true}).boundingBox())!;
    await tap(mobileToggle.x+20,mobileToggle.y+15);await expect(drawer).toHaveAttribute("data-open","true");
    const wallpaperTab=(await drawer.getByRole("button",{name:"벽지",exact:true}).boundingBox())!;
    await tap(wallpaperTab.x+15,wallpaperTab.y+15);await expect(drawer).toHaveAttribute("data-open","true");
    expect((await page.locator("#showcase-inventory-panel").boundingBox())!.height).toBeLessThan(250);
    await page.screenshot({path:info.outputPath("showcase-hover-mobile.png"),fullPage:true});
    await expect(drawer).toHaveAttribute("data-open","true");
    await tap(mobileToggle.x+20,mobileToggle.y+15);await expect(drawer).toHaveAttribute("data-open","false");
    await touch.send("Emulation.setTouchEmulationEnabled",{enabled:false});await touch.detach();
    for(const width of [802,390,320]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    const visiting=await visitor.newPage();await loginIsolatedBalanceUser(visiting,f.users[1]);await visiting.goto(`/profile/${f.users[0].id}`);
    await expect(visiting.getByRole("region",{name:"진열장",exact:true})).toBeVisible();await expect(visiting.getByTestId("showcase-drawer")).toHaveCount(0);
    await expect(visiting.getByLabel("진열장 선택").locator("option:checked")).toHaveText("진열장 2 · 대표");
    // Conflicts and changed accounts cannot overwrite another saved composition.
    await page.setViewportSize({width:1365,height:1115});await page.bringToFront();await outside();
    const latest=(await read())!;expect((await f.service.from("user_showcase_libraries").update({revision:latest.revision+1,document:latest.document}).eq("user_id",f.users[0].id)).error).toBeNull();
    await open("벽지");await drawer.getByRole("button",{name:"크림 벽지 적용",exact:true}).click();await expect(showcase.getByRole("alert")).toContainText("다른 화면에서 변경되었습니다");
    await showcase.getByRole("button",{name:"최신 내용 불러오기",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"최신 내용 불러오기",exact:true}).click();await saved();
    await page.context().clearCookies();await page.context().addCookies(await visitor.cookies());
    await open("벽지");await drawer.getByRole("button",{name:"밤하늘 벽지 적용",exact:true}).click();await expect(showcase.getByRole("alert")).toContainText("계정이 변경되었습니다");
  }finally{await visitor.close();await owner.auth.signOut();await f.cleanup();}
});
