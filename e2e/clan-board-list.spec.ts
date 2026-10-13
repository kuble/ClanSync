import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {createIsolatedBalanceFixture,loginIsolatedBalanceUser} from './isolated-balance-fixture';
test.use({actionTimeout:20_000});
async function ok<T>(query:PromiseLike<{data:T;error:unknown}>){const {data,error}=await query;expect(error,JSON.stringify(error)).toBeNull();return data as NonNullable<T>;}

test('게시판 목록의 경량 데이터·정렬·밀도·모바일과 방송 조회 제거',async({page})=>{
  test.setTimeout(180_000);
  const f=await createIsolatedBalanceFixture(3),base=f.path.replace(/\/balance$/,''),body='BODY_ONLY_'+randomUUID();
  try{
    await ok(f.service.from('clan_board_coaches').insert({clan_id:f.clanId,user_id:f.users[2].id,expertise:'지원 · 위치 선정'}));
    const posts=await ok(f.service.from('clan_board_posts').insert(Array.from({length:26},(_,i)=>({clan_id:f.clanId,author_id:f.users[1].id,coach_id:f.users[2].id,kind:'feedback',title:i===0?'아주 긴 피드백 제목 '.repeat(10):'목록 신청 '+i,content:body+'가'.repeat(19000),details:{role:'지원 · 아나',replay:'ABC123'},status:i%3===0?'complete':i%3===1?'answering':'requested',created_at:new Date(Date.now()-i*60_000).toISOString()}))).select('id'));
    await ok(f.service.from('clan_board_comments').insert({post_id:posts[0].id,author_id:f.users[2].id,content:'목록 댓글'}));
    await loginIsolatedBalanceUser(page,f.users[1]);
    const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/board/live/'))requests.push(r.url());});
    await page.setViewportSize({width:1100,height:884});
    const response=await page.goto(base+'/board/feedback');
    const html=await response!.text();expect(html).not.toContain(body);
    const rows=page.getByRole('region',{name:'피드백 신청 목록',exact:true}).getByRole('listitem');
    await expect(rows).toHaveCount(24);
    await expect(rows.first().getByLabel('댓글 1',{exact:true})).toBeVisible();
    expect((await rows.first().boundingBox())!.height).toBeLessThanOrEqual(86);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('navigation',{name:'게시글 페이지',exact:true}).getByRole('link',{name:'다음',exact:true}).click();
    await expect(rows).toHaveCount(2);
    await page.goto(base+'/board/feedback/'+posts[0].id);
    await expect(page.getByText(new RegExp(body))).toBeVisible();
    await page.setViewportSize({width:390,height:844});await page.goto(base+'/board/feedback');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await rows.first().boundingBox())!.height).toBeLessThanOrEqual(110);
    await ok(f.service.from('clan_board_posts').insert({clan_id:f.clanId,author_id:f.users[1].id,kind:'channels',title:'방송 링크',content:'방송 소개',details:{channels:[{platform:'YouTube',url:'https://www.youtube.com/@clansync'},{platform:'Twitch',url:'https://www.twitch.tv/clansync'}]}}));
    await page.goto(base+'/board/channels');
    await expect(page.getByRole('link',{name:'YouTube 방송 채널 열기 ↗',exact:true})).toBeVisible();
    await expect(page.getByText(/API 연결 필요|라이브 확인 중|자동 확인 미지원/)).toHaveCount(0);
    expect(requests).toHaveLength(0);
    console.log(JSON.stringify({feedbackListBytes:Buffer.byteLength(html),omittedBodyBytes:24*(Buffer.byteLength(body)+19000*3)}));
  }finally{await f.cleanup();}
});
