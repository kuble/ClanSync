import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("promotion photos are inline text atoms with deletion, undo and one continuous editor",async({page},testInfo)=>{
  test.setTimeout(120_000);
  const f=await createIsolatedBalanceFixture(1), paths=new Set<string>();
  let uploads=0;
  page.on("response",response=>{if(response.request().method()==="POST" && response.url().includes("/promotion-images") && response.status()===200) uploads++;});
  try {
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.goto(f.path.replace(/\/balance$/,"/manage?tab=promotion"));
    await page.bringToFront();
    await page.getByLabel("제목",{exact:true}).fill("우리 클랜의 이야기");
    const editor=page.getByRole("textbox",{name:"내용",exact:true});
    await expect(editor).toHaveCount(1);
    await editor.fill("앞글뒤글");
    await expect(page.getByText("4 / 8,000자",{exact:true})).toBeVisible();
    async function cursorAt(offset:number) {
      await editor.scrollIntoViewIfNeeded();
      const point=await editor.evaluate((element,offset)=>{
        const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
        let node;while((node=walker.nextNode())) {
          const size=node.textContent?.length??0;
          if(offset<=size) {const range=document.createRange();range.setStart(node,offset);range.collapse(true);const rect=range.getBoundingClientRect();return {x:rect.x+.1,y:rect.y+rect.height/2};}
          offset-=size;
        }
        throw new Error("Text cursor position is missing");
      },offset);
      await page.mouse.click(point.x,point.y);
    }
    await cursorAt(2);
    await expect.poll(()=>editor.evaluate(element=>{
      const selection=window.getSelection(); if(!selection?.anchorNode) return null;
      const range=document.createRange();range.selectNodeContents(element);range.setEnd(selection.anchorNode,selection.anchorOffset);return range.toString();
    })).toBe("앞글");
    const chooser=page.waitForEvent("filechooser");
    await page.getByRole("button",{name:"사진 넣기",exact:true}).click();
    await (await chooser).setFiles("public/images/overwatch/maps/busan.webp");
    const photo=editor.locator("img[data-promotion-key]");
    await expect(photo).toHaveCount(1);
    await expect(editor.locator("p")).toHaveCount(1);
    expect(await photo.evaluate(element=>({before:element.previousSibling?.textContent,after:element.nextSibling?.textContent}))).toEqual({before:"앞글",after:"뒤글"});
    await expect.poll(()=>photo.evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.setViewportSize({width:1304,height:884});
    await page.screenshot({path:testInfo.outputPath("promotion-inline-photo.png"),fullPage:true});
    await photo.click();
    await page.getByRole("button",{name:"선택한 사진 삭제",exact:true}).click();
    await expect(photo).toHaveCount(0);
    await expect(editor).toHaveText("앞글뒤글");
    await expect(editor.locator("p")).toHaveCount(1);
    await expect(page.getByRole("region",{name:"홍보글 작성",exact:true}).locator("textarea")).toHaveCount(0);
    await page.screenshot({path:testInfo.outputPath("promotion-inline-deleted.png"),fullPage:true});
    await page.getByRole("button",{name:"실행 취소",exact:true}).click();
    await expect(photo).toHaveCount(1);
    await page.getByRole("button",{name:"다시 실행",exact:true}).click(); await expect(photo).toHaveCount(0);
    await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(photo).toHaveCount(1);
    await photo.click(); await editor.press("Delete");
    await expect(photo).toHaveCount(0);
    await expect(editor).toHaveText("앞글뒤글");
    await editor.press("Control+z"); await expect(photo).toHaveCount(1);
    await photo.click(); await editor.press("Backspace"); await expect(photo).toHaveCount(0);
    await editor.press("Control+z"); await expect(photo).toHaveCount(1);
    // Copying an owned inline image keeps its file identity and uploads it once.
    const html=await photo.evaluate(element=>element.outerHTML);
    await cursorAt(4);
    await expect(page.getByRole("button",{name:"선택한 사진 삭제",exact:true})).toHaveCount(0);
    await editor.evaluate((element,html)=>{const data=new DataTransfer();data.setData("text/html",`<p>${html}</p>`);element.dispatchEvent(new ClipboardEvent("paste",{bubbles:true,cancelable:true,clipboardData:data}));},html);
    await expect(photo).toHaveCount(2);
    await page.getByRole("button",{name:"변경사항 저장",exact:true}).click();
    await expect(page.getByRole("status").filter({hasText:"홍보글과 가입 조건을 저장했습니다."})).toBeVisible();
    expect(uploads).toBe(1);
    const saved=await f.service.from("board_posts").select("id,content_blocks").eq("clan_id",f.clanId).eq("post_type","promotion").single();
    expect(saved.error).toBeNull();
    const blocks=saved.data!.content_blocks as {type:string;path?:string;text?:string}[];
    const savedPhotos=blocks.filter(block=>block.type==="image");
    expect(savedPhotos).toHaveLength(2);
    expect(savedPhotos[0].path).toBe(savedPhotos[1].path);
    savedPhotos.forEach(block=>paths.add(block.path!));
    await page.reload();
    await expect(editor).toHaveCount(1); await expect(photo).toHaveCount(2);
    await expect(editor).toHaveText("앞글뒤글");
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath("promotion-inline-mobile.png"),fullPage:true});
    await page.getByRole("link",{name:"클랜 찾기에서 보기",exact:true}).click();
    const body=page.getByRole("region",{name:"클랜 홍보 내용"});
    await expect(body).toHaveText("앞글뒤글");
    await expect(body.locator("img")).toHaveCount(2);
    await expect(body.locator("figure")).toHaveCount(0);
    expect(await body.locator("img").first().evaluate(element=>getComputedStyle(element).display)).toBe("inline-block");
  } finally {
    const saved=await f.service.from("board_posts").select("content_blocks").eq("clan_id",f.clanId);
    for(const post of saved.data??[]) for(const block of (post.content_blocks as {path?:string}[])) if(block.path?.startsWith(f.clanId+"/")) paths.add(block.path);
    await f.cleanup(); if(paths.size) await f.service.storage.from("clan-promotion-images").remove([...paths]);
  }
});
