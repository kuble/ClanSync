import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId:"Asia/Seoul" });
async function ok<T>(query:PromiseLike<{data:T;error:unknown}>) {
  const {data,error}=await query;expect(error,JSON.stringify(error)).toBeNull();return data as NonNullable<T>;
}
type Metrics=Record<string,{count:number;dates:Record<string,string>}>;

test("확장 배지의 회차·완료 신청·자유 글 집계와 동료 연속 기간·6계열 상세",async({page})=>{
  test.setTimeout(720_000);
  const f=await createIsolatedBalanceFixture(10),base=f.path.replace(/\/balance$/,"");
  const metrics=async()=>await ok(f.service.rpc("read_clan_badge_metrics",{p_clan_id:f.clanId})) as unknown as Metrics;
  const past=new Date(Date.now()-86_400_000).toISOString();
  try {
    const established=new Date(Date.now()-3_600_000);established.setUTCFullYear(established.getUTCFullYear()-11);
    await ok(f.service.from("clans").update({created_at:established.toISOString()}).eq("id",f.clanId));
    const regular=Array.from({length:50},()=>randomUUID()),flash=Array.from({length:10},()=>randomUUID());
    const invalid=[randomUUID(),randomUUID()];
    const series=[...regular,...flash,...invalid];
    await ok(f.service.from("balance_session_series").insert(series.map(id=>({id,clan_id:f.clanId,game_id:f.gameId,host_user_id:f.users[0].id,opened_at:past,closed_at:past}))));
    await ok(f.service.from("balance_rooms").update({kind:"flash"}).in("id",flash));
    await ok(f.service.from("balance_rooms").insert({clan_id:f.clanId,game_id:f.gameId,created_by:f.users[0].id,kind:"regular",title:"배지 제외 예약",status:"scheduled"}));
    const rounds=series.map((series_id,i)=>({id:randomUUID(),series_id,clan_id:f.clanId,game_id:f.gameId,host_user_id:f.users[0].id,round_number:1,
      opened_at:past,closed_at:past,phase:"match_live" as const,match_outcome:i===60?"void" as const:i===61?"pending" as const:(["team1","team2","draw"] as const)[i%3]}));
    await ok(f.service.from("balance_sessions").insert(rounds));
    await ok(f.service.from("balance_sessions").insert([2,3].map(round_number=>({...rounds[0],id:randomUUID(),round_number,match_outcome:"draw" as const}))));
    // A canonical match shadows the same round without adding a second series.
    await ok(f.service.from("matches").insert({id:rounds[0].id,clan_id:f.clanId,game_id:f.gameId,status:"finished",match_type:"intra",played_at:past,created_by:f.users[0].id}));
    await ok(f.service.from("match_results").insert({match_id:rounds[0].id,winner_team:1}));
    const first=await metrics();
    expect(first.regular.count).toBe(50);expect(first.flash.count).toBe(10);
    expect(first.regular.dates["50"]).toBeTruthy();expect(first.regular.dates["100"]).toBeUndefined();
    const member=await f.memberClient(1);
    expect((await member.rpc("read_clan_badge_metrics",{p_clan_id:f.clanId})).error).toBeTruthy();

    for(const years of [1,3,5,10]) {
      const joined=new Date(Date.now()-3_600_000);joined.setUTCFullYear(joined.getUTCFullYear()-years);
      await ok(f.service.from("clan_members").update({joined_at:joined.toISOString()}).eq("clan_id",f.clanId));
      const value=await metrics();expect(value["tenure-"+years].count).toBe(10);expect(value["tenure-"+years].dates["10"]).toBeTruthy();
    }
    const joined=new Date(Date.now()-3_600_000);joined.setUTCFullYear(joined.getUTCFullYear()-5);
    await ok(f.service.from("clan_members").update({joined_at:joined.toISOString()}).eq("clan_id",f.clanId));
    await ok(f.service.from("clan_members").update({joined_at:null}).eq("clan_id",f.clanId).eq("user_id",f.users[9].id));
    expect((await metrics())["tenure-1"].count).toBe(9);
    await ok(f.service.from("clan_members").update({joined_at:joined.toISOString()}).eq("clan_id",f.clanId).eq("user_id",f.users[9].id));

    const coachIds:string[]=[],postIds:string[]=[];
    await ok(f.service.from("clan_board_coaches").insert({clan_id:f.clanId,user_id:f.users[1].id,expertise:"리플레이 검토",accepting:true}));
    async function addPosts(kind:"feedback"|"free",amount:number) {
      for(let offset=0;offset<amount;offset+=500) {
        const rows=Array.from({length:Math.min(500,amount-offset)},()=>({id:randomUUID(),clan_id:f.clanId,author_id:f.users[0].id,kind,coach_id:kind==="feedback"?f.users[1].id:null,title:"격리 배지 집계",
          status:kind==="feedback"?"complete" as const:"requested" as const,created_at:past}));
        await ok(f.service.from("clan_board_posts").insert(rows));
        (kind==="feedback"?coachIds:postIds).push(...rows.map(row=>row.id));
      }
    }
    let total=0;
    for(const target of [5,10,100,1000]) {await addPosts("feedback",target-total);total=target;expect((await metrics()).coaching.count).toBe(target);}
    await ok(f.service.from("clan_board_posts").update({status:"answering"}).eq("id",coachIds[0]));
    expect((await metrics()).coaching.count).toBe(999);
    await ok(f.service.from("clan_board_posts").update({status:"complete"}).eq("id",coachIds[0]));
    await ok(f.service.from("clan_board_posts").update({content:"완료 뒤 편집"}).eq("id",coachIds[0]));
    expect((await metrics()).coaching.count).toBe(1000);
    total=0;
    for(const target of [50,100,1000,10000,10001]) {await addPosts("free",target-total);total=target;expect((await metrics()).posts.count).toBe(target);}
    await ok(f.service.from("clan_board_posts").insert({clan_id:f.clanId,kind:"channels",author_id:f.users[0].id,title:"집계 제외 채널"}));
    await ok(f.service.from("clan_board_comments").insert({post_id:postIds[0],author_id:f.users[0].id,content:"댓글은 글 횟수가 아니에요"}));
    await ok(f.service.from("clan_board_posts").update({content:"같은 글의 편집"}).eq("id",postIds[0]));
    expect((await metrics()).posts.count).toBe(10001);

    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.setViewportSize({width:1100,height:884});
    await page.goto(base+"/badges");
    const main=page.getByRole("group",{name:"배지 진열",exact:true}),dialog=page.getByRole("dialog");
    const related=dialog.getByRole("group",{name:"연관 단계 배지",exact:true}),info=dialog.getByRole("region",{name:"배지 계열 설명",exact:true});
    await expect(main.locator("button")).toHaveCount(9);
    await expect(main.locator('[data-badge="regular-1"] img')).toHaveAttribute("src",/first-regular-1-v1/);
    for(const [family,key,stages,story] of [
      ["regular","regular-50",[50,100,1000,10000],"교차하는 검"],
      ["flash","flash-10",[10,50,100,1000],"모여든 번개"],
      ["tenure","tenure-5",[1,3,5,10],"같은 항로"],
      ["coaching","coaching-1000",[5,10,100,1000],"열린 배움"],
      ["posts","posts-10000",[50,100,1000,10000],"우리의 문장"],
    ] as const) {
      await expect(main.locator('[data-badge^="'+family+'-"]')).toHaveCount(family==="regular"?2:1);
      await main.locator('[data-badge="'+key+'"]').click();await expect(info).toContainText(story);await expect(related.locator("button")).toHaveCount(4);
      for(const stage of stages) {
        await related.locator('[data-badge="'+family+'-'+stage+'"]').click();
        const image=dialog.getByRole("img",{name:/ 배지$/,exact:false});
        await expect(image).toHaveAttribute("src",new RegExp(family+"-"+stage+"-v1"));
        await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
      }
      await page.keyboard.press("Escape");
    }
    if(process.env.BADGE_EXPANSION_CAPTURE_DIR) {
      await mkdir(process.env.BADGE_EXPANSION_CAPTURE_DIR,{recursive:true});
      await page.screenshot({path:path.join(process.env.BADGE_EXPANSION_CAPTURE_DIR,"expanded-case-desktop.png"),animations:"disabled"});
    }
    await main.locator('[data-badge="tenure-5"]').click();
    await expect(info).toContainText("5년 이상 연속 소속된 활성 동료 10명");
    await related.locator('[data-badge="tenure-10"]').click();await expect(info).toContainText("0 / 10명");await expect(info).toContainText("미획득");
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(process.env.BADGE_EXPANSION_CAPTURE_DIR) await page.screenshot({path:path.join(process.env.BADGE_EXPANSION_CAPTURE_DIR,"tenure-detail-mobile.png"),animations:"disabled"});
    await page.keyboard.press("Escape");await page.setViewportSize({width:1100,height:884});

    // Correction/deletion of the canonical record must not resurrect the raw round.
    const victim=rounds[49].id;
    const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(past));
    const rows=await ok(f.service.rpc("read_clan_stats_records",{p_clan_id:f.clanId,p_day:day,p_offset:0}));
    const record=rows.find(row=>(row.payload as {id:string}).id===victim);
    expect(record).toBeDefined();
    const revision=(record!.payload as {_revision:string})._revision;
    await ok(f.service.rpc("edit_clan_match_record",{p_clan_id:f.clanId,p_actor_id:f.users[0].id,p_id:victim,p_operation:"delete",p_revision:revision,p_record:{}}));
    expect((await metrics()).regular.count).toBe(49);
    await ok(f.service.from("clan_board_posts").delete().eq("id",coachIds[0]));
    await ok(f.service.from("clan_board_posts").delete().in("id",postIds.slice(0,2)));
    expect((await metrics()).coaching.count).toBe(999);expect((await metrics()).posts.count).toBe(9999);
    await ok(f.service.from("clan_members").update({status:"left"}).eq("clan_id",f.clanId).eq("user_id",f.users[9].id));
    expect((await metrics())["tenure-5"].count).toBe(9);
    await ok(f.service.from("clan_members").update({status:"active"}).eq("clan_id",f.clanId).eq("user_id",f.users[9].id));
    const returned=await ok(f.service.from("clan_members").select("joined_at").eq("clan_id",f.clanId).eq("user_id",f.users[9].id).single());
    expect(Date.parse(returned.joined_at!)).toBeGreaterThan(Date.now()-60_000);
    expect((await metrics())["tenure-1"].count).toBe(9);
    await page.reload();
    await expect(main.locator('[data-badge="regular-50"]')).toHaveAccessibleName("정규 내전 50회 미획득");
    await expect(main.locator('[data-badge="coaching-100"]')).toHaveAccessibleName("코칭 100회 획득");
    await expect(main.locator('[data-badge="posts-1000"]')).toHaveAccessibleName("게시글 1,000개 획득");
    await expect(main.locator('[data-badge="tenure-1"]')).toHaveAccessibleName("오래 함께한 동료 1년 미획득");
    const revoked=await ok(f.service.from("clan_badge_awards").select("badge_key").eq("clan_id",f.clanId).in("badge_key",["regular-50","coaching-1000","posts-10000","tenure-5"]));
    expect(revoked).toHaveLength(0);
  } finally {await f.cleanup();}
});
