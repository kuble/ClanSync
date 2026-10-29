import { randomUUID } from "node:crypto";
import { expect,test } from "@playwright/test";
import { createIsolatedBalanceFixture,loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardDate,boardThumbnail } from "../src/lib/clan/board";
test.use({actionTimeout:20_000});

async function ok<T>(query:PromiseLike<{data:T;error:unknown}>){const {data,error}=await query;expect(error,JSON.stringify(error)).toBeNull();return data as NonNullable<T>;}
async function cleanupPhotos(f:Awaited<ReturnType<typeof createIsolatedBalanceFixture>>){
  const bucket=f.service.storage.from("clan-board-images"),paths:string[]=[];
  for(const owner of await ok(bucket.list(f.clanId))){
    for(const post of await ok(bucket.list(f.clanId+"/"+owner.name))){
      const folder=f.clanId+"/"+owner.name+"/"+post.name;
      for(const file of await ok(bucket.list(folder)))paths.push(folder+"/"+file.name);
    }
  }
  if(paths.length)await ok(bucket.remove(paths));
}
test("클랜원 게시판 작성·댓글·공감·리플레이 상태·방송 채널·읽기 권한",async({page,browser})=>{
  test.setTimeout(240_000);const f=await createIsolatedBalanceFixture(3),base=f.path.replace(/\/balance$/,"");
  try{
    await ok(f.service.from("clans").update({rules:"서로 존중하며 플레이해요."}).eq("id",f.clanId));
    await ok(f.service.from("clan_notices").insert({clan_id:f.clanId,created_by:f.users[0].id,title:"클랜 소식",content:"중요한 약속",is_pinned:true}));
    await ok(f.service.from("clan_board_coaches").insert({clan_id:f.clanId,user_id:f.users[0].id,expertise:"지원 · 아나"}));
    await loginIsolatedBalanceUser(page,f.users[1]);await page.goto(base+"/board");
    await expect(page).toHaveURL(/\/board\/notices$/);
    await expect(page.getByText("서로 존중하며 플레이해요.",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"공지 작성",exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"규칙 저장",exact:true})).toHaveCount(0);
    await page.getByRole("link",{name:"클랜 소식",exact:true}).click();await expect(page.getByText("중요한 약속",{exact:true})).toBeVisible();
    await page.goto(base+"/manage?tab=notices");await expect(page).toHaveURL(/\/board\/notices$/);
    await page.getByRole("navigation",{name:"게시판 목차"}).getByRole("link",{name:"자유 게시판",exact:true}).click();
    await page.getByRole("button",{name:"글 작성",exact:true}).click();
    const editor=page.getByRole("dialog");
    await editor.getByLabel("제목",{exact:true}).fill("다음 내전 같이 해요");
    await editor.getByLabel("본문",{exact:true}).fill("같이 즐겁게 플레이해요.");
    await editor.getByRole("button",{name:"저장",exact:true}).click();
    await expect(page).toHaveURL(/\/board\/free\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading",{name:"다음 내전 같이 해요",exact:true})).toBeVisible();
    const freeId=page.url().split("/").at(-1)!;
    const peerContent="시간과 말풍선 확인을 위한 다른 멤버의 댓글이에요.";
    await ok(f.service.from("clan_board_comments").insert({post_id:freeId,author_id:f.users[2].id,content:peerContent,created_at:"2026-10-28T15:04:00Z"}));
    await page.reload();
    const comments=page.locator("#comments"),peerComment=comments.getByRole("listitem").filter({hasText:peerContent});
    await expect(peerComment.locator("time")).toHaveText("오전 12:04");
    await expect(peerComment.locator("time")).toHaveAttribute("title",/2026.*10.*29/);
    await expect(peerComment.getByRole("button",{name:"댓글 편집",exact:true})).toHaveCount(0);
    await expect(peerComment.getByRole("button",{name:"댓글 삭제",exact:true})).toHaveCount(0);
    await page.getByLabel("댓글 내용",{exact:true}).fill("좋아요, 같이 해요!");
    await page.getByRole("button",{name:"댓글 등록",exact:true}).click();
    const ownComment=comments.getByRole("listitem").filter({hasText:"좋아요, 같이 해요!"});
    await expect(ownComment).toBeVisible();
    await expect(ownComment.locator("time")).toHaveText(/^(오전|오후) \d{1,2}:\d{2}$/);
    await expect(ownComment.locator("time")).toHaveAttribute("title",/\d{4}.*\d{1,2}.*\d{1,2}/);
    for(const {row,mine} of [{row:ownComment,mine:true},{row:peerComment,mine:false}]){
      await expect(row.locator("[data-comment-row]")).toHaveCSS("flex-direction",mine?"row-reverse":"row");
      const bubble=(await row.locator("p").boundingBox())!,time=(await row.locator("time").boundingBox())!;
      if(mine)expect(time.x+time.width).toBeLessThanOrEqual(bubble.x);
      else expect(time.x).toBeGreaterThanOrEqual(bubble.x+bubble.width);
      expect(time.y+time.height).toBeCloseTo(bubble.y+bubble.height,0);
    }
    const editComment=ownComment.getByRole("button",{name:"댓글 편집",exact:true}),deleteComment=ownComment.getByRole("button",{name:"댓글 삭제",exact:true});
    const postHeading=page.getByRole("heading",{name:"다음 내전 같이 해요",exact:true});
    await page.getByLabel("댓글 내용",{exact:true}).focus();await postHeading.hover();
    await expect(editComment).toHaveCSS("opacity","0");await expect(deleteComment).toHaveCSS("opacity","0");
    await ownComment.hover();
    await expect(editComment).toHaveCSS("opacity","1");await expect(deleteComment).toHaveCSS("opacity","1");
    const ownBubble=(await ownComment.locator("p").boundingBox())!,editBox=(await editComment.boundingBox())!,deleteBox=(await deleteComment.boundingBox())!,ownTime=(await ownComment.locator("time").boundingBox())!;
    expect(Math.max(editBox.x+editBox.width,deleteBox.x+deleteBox.width)).toBeLessThanOrEqual(ownBubble.x);
    expect(Math.max(editBox.y+editBox.height,deleteBox.y+deleteBox.height)).toBeLessThanOrEqual(ownTime.y);
    await expect(editComment.locator("svg")).toBeVisible();
    await expect(editComment).toHaveText("");
    await postHeading.hover();await editComment.focus();await page.keyboard.press("Tab");
    await expect(deleteComment).toBeFocused();await expect(deleteComment).toHaveCSS("opacity","1");
    await page.keyboard.press("Shift+Tab");await expect(editComment).toBeFocused();await expect(editComment).toHaveCSS("opacity","1");
    await page.keyboard.press("Enter");await page.getByLabel("댓글 내용",{exact:true}).fill("수정한 댓글이에요.");
    await page.getByRole("button",{name:"댓글 수정",exact:true}).click();
    const editedComment=comments.getByRole("listitem").filter({hasText:"수정한 댓글이에요."});
    await expect(editedComment).toBeVisible();
    const touchContext=await browser.newContext({baseURL:new URL(page.url()).origin,storageState:await page.context().storageState(),viewport:{width:390,height:844},hasTouch:true});
    try{
      const touchPage=await touchContext.newPage();await touchPage.goto(base+"/board/free/"+freeId);
      const touchComment=touchPage.locator("#comments li").filter({hasText:"수정한 댓글이에요."}),touchEdit=touchComment.getByRole("button",{name:"댓글 편집",exact:true});
      await touchComment.scrollIntoViewIfNeeded();
      await expect(touchEdit).toHaveCSS("opacity","1");await expect(touchComment.getByRole("button",{name:"댓글 삭제",exact:true})).toHaveCSS("opacity","1");
      expect(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await touchEdit.tap();await expect(touchPage.getByRole("button",{name:"댓글 수정",exact:true})).toBeVisible();
    }finally{await touchContext.close();}
    const editedDelete=editedComment.getByRole("button",{name:"댓글 삭제",exact:true});await editedComment.hover();
    await expect(editedDelete.locator("svg")).toBeVisible();await editedDelete.click();
    await page.getByRole("dialog").getByRole("button",{name:"삭제",exact:true}).click();
    await expect(page.getByRole("listitem").filter({hasText:"수정한 댓글이에요."})).toHaveCount(0);
    await page.getByRole("button",{name:"공감 0",exact:true}).click();await expect(page.getByRole("button",{name:"공감 1",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.reload();await expect(page.getByRole("button",{name:"공감 1",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.goto(base+"/board/feedback");await page.getByRole("button",{name:"피드백 신청",exact:true}).click();
    await editor.getByLabel("제목",{exact:true}).fill("아나 위치 선정 질문");
    await editor.getByLabel("코칭 선생님",{exact:true}).selectOption(f.users[0].id);
    await editor.getByLabel("역할·영웅",{exact:true}).fill("지원 · 아나");
    await editor.getByLabel("리플레이 코드",{exact:true}).fill("ABC123");
    await editor.getByLabel("궁금한 장면·시간",{exact:true}).fill("03:20 첫 한타");
    await editor.getByLabel("궁금한 점",{exact:true}).fill("어디에 서 있어야 했을까요?");
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/feedback\/[0-9a-f-]{36}$/);
    await page.getByLabel("신청 상태",{exact:true}).selectOption("complete");
    await expect.poll(async()=>{const rows=await ok(f.service.from("clan_board_posts").select("status").eq("clan_id",f.clanId).eq("kind","feedback").single());return rows.status;}).toBe("complete");
    await page.goto(base+"/board/channels");await page.getByRole("button",{name:"채널 등록",exact:true}).click();
    await editor.getByLabel("제목",{exact:true}).fill("우리 클랜 게임 방송");
    await editor.getByLabel("방송 채널 링크 1",{exact:true}).fill("https://www.youtube.com/@clansync");
    await editor.getByRole("button",{name:"방송 플랫폼 추가",exact:true}).click();
    await editor.getByLabel("방송 플랫폼 2",{exact:true}).selectOption("Twitch");
    await editor.getByLabel("방송 채널 링크 2",{exact:true}).fill("https://www.twitch.tv/clansync");
    await expect(editor.getByLabel("채널 소개",{exact:true})).toHaveCount(0);
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/channels\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("link",{name:"YouTube 방송 채널 열기 ↗",exact:true})).toHaveAttribute("href","https://www.youtube.com/@clansync");
    await expect(page.getByRole("link",{name:"Twitch 방송 채널 열기 ↗",exact:true})).toHaveAttribute("href","https://www.twitch.tv/clansync");
    await expect(page.getByText("API 연결 필요",{exact:true})).toHaveCount(0);
    await page.getByRole("button",{name:"편집",exact:true}).click();
    await expect(editor.getByLabel("방송 채널 링크 2",{exact:true})).toHaveValue("https://www.twitch.tv/clansync");
    await editor.getByRole("button",{name:"방송 채널 2 삭제",exact:true}).click();
    await editor.getByRole("button",{name:"저장",exact:true}).click();
    await expect(page.getByRole("link",{name:"Twitch 방송 채널 열기 ↗",exact:true})).toHaveCount(0);
    await page.context().clearCookies();await loginIsolatedBalanceUser(page,f.users[2]);await page.goto(base+"/board/free/"+freeId);
    await expect(page.getByRole("button",{name:"편집",exact:true})).toHaveCount(0);
    await expect(page.locator("#comments li").filter({hasText:peerContent}).locator("[data-comment-row]")).toHaveCSS("flex-direction","row-reverse");
    await expect(page.getByRole("button",{name:"댓글 편집",exact:true})).toHaveCount(1);
    await page.setViewportSize({width:390,height:844});await page.goto(base+"/board/free");
    await expect(page.getByRole("navigation",{name:"게시판 목차",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await ok(f.service.from("clan_members").update({status:"left"}).eq("clan_id",f.clanId).eq("user_id",f.users[2].id));
    await page.goto(base+"/board/free/"+freeId);
    await expect(page.getByRole("heading",{name:"다음 내전 같이 해요",exact:true})).toHaveCount(0);
  }finally{await cleanupPhotos(f);await f.cleanup();}
});

test("추억 사진 업로드·폴라로이드 목록·게시일·모바일·삭제와 사진 접근 차단",async({page})=>{
  test.setTimeout(240_000);const f=await createIsolatedBalanceFixture(2),base=f.path.replace(/\/balance$/,"");
  const paths:string[]=[];
  async function requestPhoto(postId:string){
    const url=new URL(base+"/board/image/"+postId,page.url()).href;
    // Secure cookies are valid on Chromium loopback; APIRequest's URL filter omits them on HTTP.
    const target=new URL(url);
    const cookies=(await page.context().cookies()).filter(c=>c.domain.replace(/^\./,"")===target.hostname&&target.pathname.startsWith(c.path));
    return page.request.get(url,{maxRedirects:0,headers:{Cookie:cookies.map(c=>c.name+"="+c.value).join("; ")}});
  }
  try{
    await loginIsolatedBalanceUser(page,f.users[1]);await page.goto(base+"/board/memories");
    const image=await page.screenshot();
    await page.getByRole("button",{name:"추억 남기기",exact:true}).click();
    const editor=page.getByRole("dialog");await editor.getByLabel("사진",{exact:true}).setInputFiles({name:"memory.png",mimeType:"image/png",buffer:image});
    await editor.getByLabel("사진 아래 한마디",{exact:true}).fill("첫 번째 함께한 날");
    await expect(editor.getByLabel("촬영일",{exact:true})).toHaveCount(0);
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/memories\/[0-9a-f-]{36}$/,{timeout:20000});
    const first=await ok(f.service.from("clan_board_posts").select("id,image_path,created_at,details").eq("clan_id",f.clanId).eq("kind","memories").single());
    expect(first.details).toEqual({photoFrame:"classic",photoSticker:"none"});
    paths.push(first.image_path!,boardThumbnail(first.image_path!));
    await expect(page.getByRole("img",{name:"첫 번째 함께한 날",exact:true})).toBeVisible();
    const photo=await requestPhoto(first.id);
    expect(photo.status(),JSON.stringify({location:photo.headers().location,type:photo.headers()["content-type"]})).toBe(200);
    expect(photo.headers()["content-type"]).toBe("image/png");
    await expect.poll(()=>page.getByRole("img",{name:"첫 번째 함께한 날",exact:true}).evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const secondId=randomUUID(),secondPath=f.clanId+"/"+f.users[1].id+"/"+secondId+"/"+randomUUID()+".png";
    paths.push(secondPath,boardThumbnail(secondPath));
    await ok(f.service.storage.from("clan-board-images").upload(secondPath,image,{contentType:"image/png"}));
    await ok(f.service.storage.from("clan-board-images").upload(boardThumbnail(secondPath),image,{contentType:"image/png"}));
    const postedAt="2026-10-13T15:30:00.000Z";
    await ok(f.service.from("clan_board_posts").insert({id:secondId,clan_id:f.clanId,author_id:f.users[1].id,kind:"memories",title:"두 번째 사진",content:"다시 만나자",image_path:secondPath,created_at:postedAt,details:{takenAt:"2020-01-01"}}));
    await page.goto(base+"/board/memories");
    const gallery=page.getByRole("region",{name:"추억 앨범",exact:true}),cards=gallery.getByRole("link");
    await expect(cards).toHaveCount(2);
    for(const name of ["앨범으로 보기","전체 보기","다음 추억","이전 추억"])await expect(page.getByRole("button",{name,exact:true})).toHaveCount(0);
    await expect(cards.filter({hasText:"첫 번째 함께한 날"}).locator("time")).toHaveText(boardDate(first.created_at));
    await expect(cards.filter({hasText:"다시 만나자"}).locator("time")).toHaveText("2026. 10. 14.");
    await expect(page.getByText("2020-01-01",{exact:true})).toHaveCount(0);
    await cards.filter({hasText:"다시 만나자"}).click();
    await expect(page.locator("article header time")).toHaveText(boardDate(postedAt,true));
    await page.getByRole("button",{name:"편집",exact:true}).click();await expect(editor.getByLabel("촬영일",{exact:true})).toHaveCount(0);
    await editor.getByLabel("사진 아래 한마디",{exact:true}).fill("수정해도 게시일 유지");await editor.getByRole("button",{name:"저장",exact:true}).click();
    await expect(editor).toBeHidden();
    await expect(page.getByText("수정해도 게시일 유지",{exact:true})).toBeVisible();
    const edited=await ok(f.service.from("clan_board_posts").select("created_at,details").eq("id",secondId).single());
    expect(Date.parse(edited.created_at)).toBe(Date.parse(postedAt));expect(edited.details).toEqual({takenAt:"2020-01-01",photoFrame:"classic",photoSticker:"none"});
    await page.goto(base+"/board/memories");await expect(cards).toHaveCount(2);
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.goto(base+"/board/memories/"+first.id);
    await page.getByRole("button",{name:"삭제",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"삭제",exact:true}).click();
    await expect(page).toHaveURL(/\/board\/memories$/);
    expect(await ok(f.service.from("clan_board_posts").select("id").eq("id",first.id))).toHaveLength(0);
    const removedImage=await requestPhoto(first.id);
    expect({status:removedImage.status(),type:removedImage.headers()["content-type"]??""}).toMatchObject({status:404});
    await ok(f.service.from("clan_members").update({status:"left"}).eq("clan_id",f.clanId).eq("user_id",f.users[1].id));
    const denied=await requestPhoto(secondId);
    expect(denied.status()).not.toBe(200);
    expect(denied.headers()["content-type"]??"").not.toMatch(/^image\//);
  }finally{if(paths.length)await ok(f.service.storage.from("clan-board-images").remove(paths));await cleanupPhotos(f);await f.cleanup();}
});
