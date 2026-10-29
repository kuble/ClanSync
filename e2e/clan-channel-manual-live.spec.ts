import {expect,test} from '@playwright/test';
import {createIsolatedBalanceFixture,loginIsolatedBalanceUser} from './isolated-balance-fixture';
import {boardDetails} from '../src/lib/clan/board';

test.use({actionTimeout:20_000});
async function ok<T>(query:PromiseLike<{data:T;error:unknown}>){const {data,error}=await query;expect(error,JSON.stringify(error)).toBeNull();return data as NonNullable<T>;}

test('방송 작성자 수동 상태·권한·편집 보존과 게시판 입력 스타일',async({page})=>{
  test.setTimeout(180_000);
  const f=await createIsolatedBalanceFixture(3),base=f.path.replace(/\/balance$/,''),legacy='이전에 저장한 채널 소개';
  try{
    const post=await ok(f.service.from('clan_board_posts').insert({clan_id:f.clanId,author_id:f.users[1].id,kind:'channels',title:'클랜 방송',content:legacy,details:{platform:'YouTube',channel:'https://www.youtube.com/@clansync',schedule:'화요일 저녁 8시'}}).select('id').single());
    const path=base+'/board/channels/'+post.id;
    const stored=async()=>{const row=await ok(f.service.from('clan_board_posts').select('details,content').eq('id',post.id).single());return {...row,details:boardDetails(row.details)};};
    let action:{id:string;body:string}|undefined;
    page.on('request',r=>{const id=r.headers()['next-action'],body=r.postData();if(id&&body?.includes(post.id))action={id,body};});
    await loginIsolatedBalanceUser(page,f.users[1]);await page.goto(path);
    await expect(page.getByText(legacy,{exact:true})).toHaveCount(0);
    const toggle=page.getByRole('switch',{name:'생방송 표시',exact:true});
    await expect(toggle).not.toBeChecked();await toggle.click();await expect(toggle).toBeChecked();
    await expect(page.getByText('생방송 중',{exact:true})).toBeVisible();
    await expect.poll(async()=>(await stored()).details.isLive).toBe(true);
    const toggleAction=action!;expect(toggleAction.id).toBeTruthy();
    await page.reload();await expect(toggle).toBeChecked();
    await page.goto(base+'/board/channels');await expect(page.getByText('생방송 중',{exact:true})).toBeVisible();
    await expect(page.getByText(legacy,{exact:true})).toHaveCount(0);
    await page.goto(path);
    for(const label of ['편집','삭제']){const button=page.getByRole('button',{name:label,exact:true});await expect(button).toHaveText('');await expect(button.locator('svg')).toBeVisible();}
    await page.getByRole('button',{name:'편집',exact:true}).click();
    const editor=page.getByRole('dialog');await expect(editor.getByLabel('채널 소개',{exact:true})).toHaveCount(0);
    await editor.getByLabel('방송 시간',{exact:true}).fill('금요일 저녁 9시');await editor.getByRole('button',{name:'저장',exact:true}).click();
    await expect(page.getByText('금요일 저녁 9시',{exact:true})).toBeVisible();await expect(toggle).toBeChecked();expect((await stored()).content).toBe(legacy);
    for(const user of [f.users[2],f.users[0]]){
      await page.context().clearCookies();await loginIsolatedBalanceUser(page,user);await page.goto(path);
      await expect(toggle).toHaveCount(0);await expect(page.getByText('생방송 중',{exact:true})).toBeVisible();
      const rejected=await page.evaluate(async action=>{const response=await fetch(location.href,{method:'POST',headers:{'Next-Action':action.id,'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component'},body:action.body});return {status:response.status,text:await response.text()};},toggleAction);
      expect(rejected.status).toBe(200);expect(rejected.text).toContain('작성자만 방송 상태를 바꿀 수 있습니다.');expect((await stored()).details.isLive).toBe(true);
    }
    await page.getByRole('button',{name:'편집',exact:true}).click();await editor.getByLabel('제목',{exact:true}).fill('운영진이 정리한 방송 이름');await editor.getByRole('button',{name:'저장',exact:true}).click();
    await expect(page.getByRole('heading',{name:'운영진이 정리한 방송 이름',exact:true})).toBeVisible();expect((await stored()).details.isLive).toBe(true);
    await page.context().clearCookies();await loginIsolatedBalanceUser(page,f.users[1]);await page.goto(path);await toggle.click();await expect(toggle).not.toBeChecked();await expect(page.getByText('방송 대기',{exact:true})).toBeVisible();
    await page.setViewportSize({width:390,height:844});await page.reload();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.goto(base+'/board/free');await page.getByRole('button',{name:'글 작성',exact:true}).click();
    const body=editor.getByLabel('본문',{exact:true});await body.fill('긴 본문을 스크롤하며 읽습니다.\n'.repeat(120));
    const style=await body.evaluate(e=>({width:getComputedStyle(e).scrollbarWidth,color:getComputedStyle(e).scrollbarColor,overflow:e.scrollHeight>e.clientHeight}));
    expect(style.width).toBe('thin');expect(style.color).not.toBe('auto');expect(style.overflow).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await editor.getByRole('button',{name:'취소',exact:true}).click();
  }finally{await f.cleanup();}
});
