import { randomUUID } from "node:crypto";
import { expect,test } from "@playwright/test";
import { createIsolatedBalanceFixture,loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardThumbnail } from "../src/lib/clan/board";

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
test("클랜원 게시판 작성·댓글·공감·리플레이 상태·방송 채널·읽기 권한",async({page})=>{
  test.setTimeout(240_000);const f=await createIsolatedBalanceFixture(3),base=f.path.replace(/\/balance$/,"");
  try{
    await ok(f.service.from("clans").update({rules:"서로 존중하며 플레이해요."}).eq("id",f.clanId));
    await ok(f.service.from("clan_notices").insert({clan_id:f.clanId,created_by:f.users[0].id,title:"클랜 소식",content:"중요한 약속",is_pinned:true}));
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
    await page.getByLabel("댓글 내용",{exact:true}).fill("좋아요, 같이 해요!");
    await page.getByRole("button",{name:"댓글 등록",exact:true}).click();
    await expect(page.getByText("좋아요, 같이 해요!",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"공감 0",exact:true}).click();await expect(page.getByRole("button",{name:"공감 1",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.reload();await expect(page.getByRole("button",{name:"공감 1",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.goto(base+"/board/feedback");await page.getByRole("button",{name:"피드백 신청",exact:true}).click();
    await editor.getByLabel("제목",{exact:true}).fill("아나 위치 선정 질문");
    await editor.getByLabel("역할·영웅",{exact:true}).fill("지원 · 아나");
    await editor.getByLabel("리플레이 코드",{exact:true}).fill("ABC123");
    await editor.getByLabel("궁금한 장면·시간",{exact:true}).fill("03:20 첫 한타");
    await editor.getByLabel("궁금한 점",{exact:true}).fill("어디에 서 있어야 했을까요?");
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/feedback\/[0-9a-f-]{36}$/);
    await page.getByLabel("신청 상태",{exact:true}).selectOption("complete");
    await expect.poll(async()=>{const rows=await ok(f.service.from("clan_board_posts").select("status").eq("clan_id",f.clanId).eq("kind","feedback").single());return rows.status;}).toBe("complete");
    await page.goto(base+"/board/channels");await page.getByRole("button",{name:"채널 소개",exact:true}).click();
    await editor.getByLabel("제목",{exact:true}).fill("우리 클랜 게임 방송");
    await editor.getByLabel("방송 채널 링크",{exact:true}).fill("https://www.youtube.com/@clansync");
    await editor.getByLabel("채널 소개",{exact:true}).fill("게임과 클랜 이야기를 나눠요.");
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/channels\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("link",{name:"방송 채널 열기 ↗",exact:true})).toHaveAttribute("href","https://www.youtube.com/@clansync");
    await page.context().clearCookies();await loginIsolatedBalanceUser(page,f.users[2]);await page.goto(base+"/board/free/"+freeId);
    await expect(page.getByRole("button",{name:"편집",exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"댓글 편집",exact:true})).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});await page.goto(base+"/board/free");
    await expect(page.getByRole("combobox",{name:"게시판 공간",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await ok(f.service.from("clan_members").update({status:"left"}).eq("clan_id",f.clanId).eq("user_id",f.users[2].id));
    await page.goto(base+"/board/free/"+freeId);
    await expect(page.getByRole("heading",{name:"다음 내전 같이 해요",exact:true})).toHaveCount(0);
  }finally{await cleanupPhotos(f);await f.cleanup();}
});

test("추억 사진 업로드·미리보기·앨범 이동·모바일·삭제와 사진 접근 차단",async({page})=>{
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
    await editor.getByLabel("촬영일",{exact:true}).fill("2026-10-13");
    await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(page).toHaveURL(/\/board\/memories\/[0-9a-f-]{36}$/,{timeout:20000});
    const first=await ok(f.service.from("clan_board_posts").select("id,image_path").eq("clan_id",f.clanId).eq("kind","memories").single());
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
    await ok(f.service.from("clan_board_posts").insert({id:secondId,clan_id:f.clanId,author_id:f.users[1].id,kind:"memories",title:"두 번째 사진",content:"다시 만나자",image_path:secondPath}));
    await page.goto(base+"/board/memories");await expect(page.getByText("1 / 2",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"다음 추억",exact:true}).click();await expect(page.getByText("2 / 2",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"전체 보기",exact:true}).click();await expect(page.getByRole("link",{name:/첫 번째 함께한 날/})).toBeVisible();
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
