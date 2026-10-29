import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardThumbnail } from "../src/lib/clan/board";

test("mixed photo heights pack tightly in posting order across responsive columns", async ({ page }) => {
  test.setTimeout(150_000); page.setDefaultTimeout(15_000);
  const f=await createIsolatedBalanceFixture(1),svc=f.service,base=f.path.replace(/\/balance$/, "");
  const dimensions=[[500,500],[300,900],[1200,300],[400,650],[800,400],[450,450]];
  const ids=dimensions.map(()=>randomUUID()),paths:string[]=[];
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  try {
    expect((await svc.from("clans").update({coin_balance:1000}).eq("id",f.clanId)).error).toBeNull();
    expect((await svc.rpc("apply_store_purchase",{p_actor_id:f.users[0].id,p_context_clan_id:f.clanId,p_item_slug:"clan_photo_frames",p_checkout_id:randomUUID()})).data).toMatchObject({ok:true});
    const rows=[];
    for(let i=0;i<dimensions.length;i++){
      const [width,height]=dimensions[i],path=`${f.clanId}/${f.users[0].id}/${ids[i]}/${randomUUID()}.png`;
      paths.push(path,boardThumbnail(path));
      const buffer=await sharp({create:{width,height,channels:4,background:["#729f8c","#af8caa","#ba9e64"][i%3]}}).png().toBuffer();
      const thumb=await sharp(buffer).resize({width:600,height:600,fit:"inside",withoutEnlargement:true}).webp().toBuffer();
      expect((await svc.storage.from("clan-board-images").upload(path,buffer,{contentType:"image/png"})).error).toBeNull();
      expect((await svc.storage.from("clan-board-images").upload(boardThumbnail(path),thumb,{contentType:"image/webp"})).error).toBeNull();
      rows.push({id:ids[i],clan_id:f.clanId,kind:"memories" as const,author_id:f.users[0].id,title:`사진 ${i+1}`,content:`사진 ${i+1}`,image_path:path,created_at:new Date(Date.now()-i*60_000).toISOString(),details:{photoFrame:["classic","film","tape"][i%3]}});
    }
    expect((await svc.from("clan_board_posts").insert(rows)).error).toBeNull();
    await loginIsolatedBalanceUser(page,f.users[0]);await page.goto(base+"/board/memories");
    const gallery=page.getByRole("region",{name:"추억 앨범",exact:true}),cards=gallery.getByRole("link");
    for(const [width,height,columns] of [[957,1004,2],[1440,1000,3],[390,844,1],[957,1004,2]]){
      await page.setViewportSize({width,height});
      for(const image of await gallery.getByRole("img").all()){
        await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
      await expect.poll(()=>cards.evaluateAll(nodes=>{
        const rects=nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};});
        const xs=[...new Set(rects.map(r=>Math.round(r.x)))];
        let tight=true,ordered=true;
        rects.forEach((rect,index)=>{
          const previous=rects.slice(0,index).filter(r=>Math.abs(r.x-rect.x)<1).at(-1);
          if(previous&&(rect.y-previous.bottom<7.5||rect.y-previous.bottom>9))tight=false;
          if(index&&rect.y<rects[index-1].y-1)ordered=false;
        });
        return{columns:xs.length,tight,ordered};
      })).toEqual({columns,tight:true,ordered:true});
      expect(await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute("href")!.split("/").at(-1)))).toEqual(ids);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(let i=0;i<dimensions.length;i++){
        const [w,h]=dimensions[i];const image=gallery.getByRole("img",{name:`사진 ${i+1}`,exact:true});
        expect(await image.evaluate(node=>{const s=getComputedStyle(node);return parseFloat(s.width)/parseFloat(s.height);})).toBeCloseTo(w/h,2);
      }
      await cards.first().scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`packed-${width}.png`),animations:"disabled"});
    }
    expect(errors).toEqual([]);
    await cards.nth(2).focus();await page.keyboard.press("Enter");await expect(page).toHaveURL(new RegExp(`/memories/${ids[2]}$`));
  } finally {
    try { if(paths.length)expect((await svc.storage.from("clan-board-images").remove(paths)).error).toBeNull(); }
    finally {await f.cleanup();}
  }
});
