import {chromium, expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {DEMO_OUT,QA_ORIGIN,loadDemoFixture} from './qa-demo-fixture.mjs';

const scenes=JSON.parse(await readFile(new URL('./scenes.json',import.meta.url),'utf8'));
function wavDuration(buffer) {
  if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')throw new Error('Expected a RIFF WAVE narration file');
  let byteRate=0,dataBytes=0;
  for(let offset=12;offset+8<=buffer.length;) {
    const kind=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4);
    if(offset+8+size>buffer.length)throw new Error('Truncated narration file');
    if(kind==='fmt '&&size>=16)byteRate=buffer.readUInt32LE(offset+16);
    if(kind==='data')dataBytes+=size;
    offset+=8+size+(size%2);
  }
  if(!byteRate||!dataBytes)throw new Error('Missing narration audio');
  return dataBytes/byteRate;
}
const durations={};
for(const spec of scenes)durations[spec.id]=wavDuration(await readFile(`${DEMO_OUT}/voice/${spec.id}.wav`));
const f=await loadDemoFixture();
const {clanId}=JSON.parse(await readFile(`${DEMO_OUT}/clan.json`,'utf8'));
const base=`${QA_ORIGIN}/games/overwatch/clan/${clanId}`;
const demoBase=`${QA_ORIGIN}/games/overwatch/clan/${f.clanId}`;
const roomUrl=`${demoBase}/balance?room=${f.roomId}`;
const from=process.argv.find(a=>a.startsWith('--from='))?.split('=')[1]||scenes[0].id;
const tag=Date.now();
const browser=await chromium.launch({headless:true});
const sessions=[];
const manifest=[];
async function camera(name,auth) {
  const context=await browser.newContext({storageState:`${DEMO_OUT}/${auth}`,viewport:{width:1600,height:760},timezoneId:'Asia/Seoul',recordVideo:{dir:`${DEMO_OUT}/raw`,size:{width:1600,height:760}}});
  context.setDefaultTimeout(20000);
  await context.addInitScript(()=>{
    const mount=()=>{
      const style=document.createElement('style');
      style.textContent='nextjs-portal,[aria-label="개발용 플랜 전환"]{display:none!important} html{scroll-behavior:smooth}';
      document.head.appendChild(style);
      const cursor=document.createElement('div');
      cursor.style.cssText='pointer-events:none;position:fixed;z-index:2147483647;left:-50px;top:-50px;width:18px;height:18px;border:2px solid #7fffd1;border-radius:50%;background:#50e7b340;box-shadow:0 0 0 3px #0b191b70;transform:translate(-50%,-50%)';
      document.body.appendChild(cursor);
      document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});
      document.addEventListener('mousedown',()=>cursor.animate([{boxShadow:'0 0 0 0 #7fffd1cc'},{boxShadow:'0 0 0 20px #7fffd100'}],{duration:600}));
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  });
  const before=performance.now();
  const page=await context.newPage();
  const video=await page.video().path();
  const session={name,context,page,video,origin:before};
  sessions.push(session);
  return session;
}
const q=await camera('qa','auth-local.json');
const l=await camera('leader','auth-demo-leader.json');
const m=await camera('member','auth-demo-member.json');
const p=l.page, mp=m.page, sp=q.page;
const panel=p.getByTestId('clan-balance-session-panel');
async function pause(ms=1200){await new Promise(r=>setTimeout(r,ms));}
async function frame(locator){await locator.scrollIntoViewIfNeeded();await pause(500);}
async function click(locator){await frame(locator);const box=await locator.boundingBox();if(box)await locator.page().mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:20});await pause(350);await locator.click();await pause(650);}
async function check(locator,value=true){await frame(locator);await locator.setChecked(value);await pause(650);}
async function top(page){await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await pause(700);}
async function scroll(page,y){await page.mouse.move(1500,400,{steps:10});await page.mouse.wheel(0,y);await pause(1300);}
async function nav(page,url){await page.goto(url);await pause(2400);await top(page);}
async function scene(id,camera,action){
  const index=scenes.findIndex(s=>s.id===id);
  if(index<scenes.findIndex(s=>s.id===from))return;
  const spec=scenes[index];
  const start=(performance.now()-camera.origin)/1000;
  console.log(`RECORD ${id} ${spec.title}`);
  try {
    await pause(700);
    await action();
    const elapsed=(performance.now()-camera.origin)/1000-start;
    await pause(Math.max(0,(durations[id]+1.8-elapsed)*1000));
    await camera.page.screenshot({path:`${DEMO_OUT}/frames/${id}.png`});
    manifest.push({...spec,video:path.resolve(camera.video),start,end:(performance.now()-camera.origin)/1000,voiceSeconds:durations[id]});
    await writeFile(`${DEMO_OUT}/recording-${tag}.json`,JSON.stringify(manifest,null,2));
  } catch(error){
    await camera.page.screenshot({path:`${DEMO_OUT}/failure-${id}.png`});
    await writeFile(`${DEMO_OUT}/failure-${id}.txt`,await camera.page.locator('body').innerText());
    throw error;
  }
}
await mkdir(`${DEMO_OUT}/frames`,{recursive:true});
try {
 await nav(sp,base);
 await nav(p,`${demoBase}/balance`);
 await nav(mp,roomUrl);
 await scene('01-intro',q,async()=>{await sp.getByRole('heading',{name:'QA_01_Clan',exact:true}).hover();});
 await scene('02-notices',q,async()=>{
   await click(sp.getByRole('button',{name:/이번 주 정기 내전/}));
   await pause(2800);await sp.keyboard.press('Escape');await pause(1000);
   await click(sp.getByRole('button',{name:'클랜 규칙 전체 보기',exact:true}));
   await pause(2500);await sp.keyboard.press('Escape');
 });
 await scene('03-calendar',q,async()=>{await scroll(sp,470);await sp.getByText('토요 정기 내전',{exact:true}).hover();});
 await scene('04-mvp',q,async()=>{await scroll(sp,500);await frame(sp.getByText('지난달 승률 MVP',{exact:true}));});
 await scene('05-lobby',l,async()=>{
   await click(p.getByRole('button',{name:'내전 추가',exact:true}));
   const d=p.getByRole('dialog',{name:'내전 만들기',exact:true});
   await check(d.getByRole('radio',{name:'정규 내전',exact:true}));
   await pause(1300);await check(d.getByRole('radio',{name:'깜짝 내전',exact:true}));
   await pause(2000);await p.keyboard.press('Escape');
 });
 await scene('06-booking',l,async()=>{
   await click(p.getByRole('button',{name:'내전 추가',exact:true}));
   const d=p.getByRole('dialog',{name:'내전 만들기',exact:true});
   await check(d.getByRole('radio',{name:'예약',exact:true}));
   await check(d.getByRole('checkbox',{name:'매주 같은 요일·시각',exact:true}));
   await pause(1800);await check(d.getByRole('radio',{name:'깜짝 내전',exact:true}));
   await frame(d.getByRole('checkbox',{name:'참석 응답 받기',exact:true}));
   await pause(1800);await p.keyboard.press('Escape');
 });
 if(scenes.findIndex(s=>s.id===from)<=17)await nav(p,roomUrl);
 await scene('07-roster',l,async()=>{
   const candidates=panel.getByRole('region',{name:'참가 가능 클랜원',exact:true});
   for(const u of f.users.slice(0,10)) await click(candidates.getByRole('button',{name:`${u.nickname} 출전 명단에 추가`,exact:true}));
   await top(p);
   await expect(panel.locator('[data-roster-slot]')).toHaveCount(10);
 });
 await scene('08-swap',l,async()=>{
   const a=panel.locator('[data-roster-slot="team1:d0"]'),b=panel.locator('[data-roster-slot="team2:d1"]');
   await frame(a);await a.dragTo(b);await pause(2500);
   await click(panel.getByRole('button',{name:'명단 변경 되돌리기',exact:true}));
 });
 if(scenes.findIndex(s=>s.id===from)<=8) {
   await click(panel.getByRole('button',{name:'라운드 설정',exact:true}));
   const prefSettings=p.getByRole('dialog',{name:'라운드 설정',exact:true});
   await check(prefSettings.getByRole('radio',{name:/공통 추첨순서/}));
   await prefSettings.getByRole('combobox',{name:'팀원 선발 방식',exact:true}).selectOption('random');
   await click(prefSettings.getByRole('button',{name:'설정 적용',exact:true}));
   await expect(prefSettings).toBeHidden();
 }
 await scene('09-preferences',m,async()=>{
   await mp.reload();await pause(1800);
   const pref=mp.getByRole('group',{name:'이번 라운드 내 선호',exact:true});
   await click(pref.getByRole('button',{name:'선호 옵션',exact:true}));
   await click(mp.getByRole('menuitemradio',{name:'선호 없음',exact:true}));
   await pause(1000);await click(pref.getByRole('button',{name:'선호 옵션',exact:true}));
   await click(mp.getByRole('menuitemradio',{name:'프로필 기본값',exact:true}));
   await pref.getByRole('button',{name:/힐러/}).dragTo(pref.getByRole('button',{name:/탱커/}));
   await pause(1000);
 });
 let settings=p.getByRole('dialog',{name:'라운드 설정',exact:true});
 await scene('10-draft',l,async()=>{
   await click(panel.getByRole('button',{name:'라운드 설정',exact:true}));
   await check(settings.getByRole('radio',{name:/직접 배정/}));
   await settings.getByRole('combobox',{name:'팀원 선발 방식',exact:true}).selectOption('draft');
   await pause(2500);
 });
 await scene('11-auction',l,async()=>{
   await settings.getByRole('combobox',{name:'팀원 선발 방식',exact:true}).selectOption('auction');
   await pause(1200);await frame(settings.getByRole('spinbutton',{name:'팀 크레딧',exact:true}));
   await pause(3500);await frame(settings.getByRole('checkbox',{name:'전략 아이템 사용',exact:true}));
   await pause(1500);await check(settings.getByRole('radio',{name:/공통 추첨순서/}));
   await settings.getByRole('combobox',{name:'팀원 선발 방식',exact:true}).selectOption('random');
 });
 await scene('12-bans-settings',l,async()=>{
   await click(settings.getByRole('tab',{name:'밴픽',exact:true}));
   await check(settings.getByRole('checkbox',{name:'맵 밴 사용',exact:true}));
   await check(settings.getByRole('checkbox',{name:'영웅 밴 사용',exact:true}));
   await settings.getByRole('spinbutton',{name:'맵 밴 시간(초)',exact:true}).fill('8');
   await settings.getByRole('spinbutton',{name:'영웅 밴 시간(초)',exact:true}).fill('18');
   await pause(2000);await click(settings.getByRole('button',{name:'설정 적용',exact:true}));
   await expect(settings).toBeHidden();
 });
 await scene('13-lottery',l,async()=>{
   await top(p);await click(panel.getByRole('button',{name:'추첨 시작',exact:true}));
   await expect(panel.getByLabel('공개 추첨 진행')).toBeVisible();
   await expect(panel.locator('[data-roster-slot]')).toHaveCount(0,{timeout:40000});
   await expect(panel.getByRole('region',{name:'경기 준비',exact:true})).toBeVisible({timeout:40000});
 });
 await scene('14-mapvote',l,async()=>{
   await top(p);await click(panel.getByRole('button',{name:'쟁탈',exact:true}));
   await click(panel.getByRole('button',{name:'유형 선택 완료',exact:true}));
   await click(panel.getByRole('button',{name:/MAP 01/}));
   await pause(8000);await click(panel.getByRole('button',{name:'맵 확정하기',exact:true}));
   await expect(panel).toHaveAttribute('data-balance-phase','hero_ban',{timeout:30000});
 });
 await scene('15-hero-ban',l,async()=>{
   await click(panel.getByRole('button',{name:'아나 밴 선택',exact:true}));
   await top(p);
   await expect(panel.getByRole('button',{name:'경기 시작',exact:true})).toBeEnabled({timeout:30000});
 });
 await scene('16-live',l,async()=>{
   await click(panel.getByRole('button',{name:'경기 시작',exact:true}));
   await expect(panel).toHaveAttribute('data-balance-phase','match_live');
   await top(p);await pause(3500);await scroll(p,180);
 });
 await scene('17-result',l,async()=>{
   await click(panel.getByRole('button',{name:'블루 승',exact:true}));
   await pause(2500);
   await click(p.getByRole('dialog',{name:'경기 결과를 확정할까요?'}).getByRole('button',{name:'결과 확정',exact:true}));
   await expect(panel.getByRole('button',{name:'다음 라운드',exact:true})).toBeEnabled();
 });
 await scene('18-history',l,async()=>{
   await top(p);await click(panel.getByRole('button',{name:'내전 기록',exact:true}));
   const history=p.getByRole('dialog',{name:'내전 기록',exact:true});
   const detail=history.locator('details').filter({hasText:'1라운드'}).first();
   await click(detail.locator(':scope > summary'));
   await pause(2300);await p.keyboard.press('Escape');
   await click(panel.getByRole('button',{name:'다음 라운드',exact:true}));
   await expect(panel).toHaveAttribute('data-balance-phase','editing');
   await pause(1500);await click(panel.getByRole('button',{name:'세션 종료',exact:true}));
   await click(p.getByRole('button',{name:'종료 확정',exact:true}));
 });
 await nav(sp,base+'/stats');
 await scene('19-hof',q,async()=>{
   for(const name of ['최다 출석','최다 출전','예측 적중']) {await click(sp.getByRole('radio',{name,exact:true}));await pause(1200);}
   await click(sp.getByRole('radio',{name:'승률',exact:true}));
 });
 await scene('20-period',q,async()=>{
   await click(sp.getByRole('radio',{name:'월별',exact:true}));
   await sp.getByRole('listbox',{name:'연도',exact:true}).press('End');
   await sp.getByRole('listbox',{name:'월',exact:true}).press('End');
   await pause(2000);await sp.getByRole('listbox',{name:'월',exact:true}).press('ArrowUp');
   await pause(2500);
 });
 await scene('21-talk',q,async()=>{
   await click(sp.getByRole('radio',{name:'전체',exact:true}));
   const textbox=sp.getByRole('textbox',{name:'순위에 댓글 남기기',exact:true});
   await frame(textbox);await textbox.pressSequentially('이번 달도 함께 즐겨요!',{delay:120});
   await pause(1800);await textbox.fill('');
 });
 if(['23-trends','24-distribution'].includes(from)) {
   await click(sp.getByRole('tab',{name:'내전 통계',exact:true}));
   await click(sp.getByRole('button',{name:/완료 경기/}));
 }
 await scene('22-intra',q,async()=>{
   await top(sp);await click(sp.getByRole('tab',{name:'내전 통계',exact:true}));
   await pause(1000);await click(sp.getByRole('button',{name:/완료 경기/}));
   await sp.getByRole('img',{name:/완료 경기 그래프/}).hover();
   await pause(2500);
 });
 await scene('23-trends',q,async()=>{
   await top(sp);await click(sp.getByRole('radio',{name:'월별',exact:true}));
   await sp.getByRole('listbox',{name:'연도',exact:true}).press('Home');
   await sp.getByRole('listbox',{name:'연도',exact:true}).press('ArrowDown');
   await sp.getByRole('listbox',{name:'연도',exact:true}).press('ArrowDown');
   await pause(1500);await sp.getByRole('listbox',{name:'월',exact:true}).press('Home');
   await pause(1800);await sp.getByRole('listbox',{name:'월',exact:true}).press('ArrowDown');
   await pause(2000);
 });
 await scene('24-distribution',q,async()=>{
   await click(sp.getByRole('radiogroup',{name:'기간',exact:true}).getByRole('radio',{name:'전체',exact:true}));
   await scroll(sp,400);
   const maps=sp.getByRole('radiogroup',{name:'맵 유형',exact:true});
   await click(maps.getByRole('radio',{name:'혼합',exact:true}));
   await pause(1800);await click(maps.getByRole('radio',{name:'전체',exact:true}));
   await scroll(sp,410);
 });
 if(from==='26-record-filter') {
   await click(sp.getByRole('tab',{name:'경기 기록',exact:true}));
   await click(sp.getByRole('button',{name:/^경기 기록 날짜 선택,/}));
   await click(sp.getByRole('dialog',{name:'경기 기록 달력',exact:true}).getByRole('button',{name:'2026년 9월 16일 경기 기록 있음',exact:true}));
 }
 await scene('25-records',q,async()=>{
   await top(sp);await click(sp.getByRole('tab',{name:'경기 기록',exact:true}));
   await click(sp.getByRole('button',{name:/^경기 기록 날짜 선택,/}));
   const cal=sp.getByRole('dialog',{name:'경기 기록 달력',exact:true});
   await click(cal.getByRole('button',{name:'2026년 9월 16일 경기 기록 있음',exact:true}));
   await pause(1800);
   const next=sp.getByRole('button',{name:'다음 경기',exact:true});
   if(await next.isEnabled())await click(next);
 });
 await scene('26-record-filter',q,async()=>{
   await sp.getByRole('searchbox',{name:'경기 참가자 검색',exact:true}).fill('새벽별');
   await pause(2300);await sp.getByRole('searchbox',{name:'경기 참가자 검색',exact:true}).fill('');
   await click(sp.getByRole('button',{name:'승률 정렬',exact:true}));
   await pause(2000);await click(sp.getByRole('button',{name:'당일 최장 연승 정렬',exact:true}));
 });
 if(['28-personal-map','29-synergy','30-predictions'].includes(from)) {
   await click(sp.getByRole('tab',{name:'개인 기록',exact:true}));
   await click(sp.getByRole('button',{name:'새벽별 개인 기록 열기',exact:true}));
   await expect(sp.getByRole('region',{name:'플레이어 요약',exact:true})).toBeVisible();
 }
 await scene('27-personal',q,async()=>{
   await top(sp);await click(sp.getByRole('tab',{name:'개인 기록',exact:true}));
   await click(sp.getByRole('button',{name:'새벽별 개인 기록 열기',exact:true}));
   await expect(sp.getByRole('region',{name:'플레이어 요약',exact:true})).toBeVisible();
   await click(sp.getByRole('button',{name:'새벽별 엠블럼 컬렉션 열기',exact:true}));
   await pause(2400);await sp.keyboard.press('Escape');
 });
 await scene('28-personal-map',q,async()=>{
   const card=sp.getByRole('region',{name:'맵별 승률',exact:true});
   await frame(card);
   await click(card.getByRole('radiogroup',{name:'맵 형식',exact:true}).getByRole('radio',{name:'쟁탈',exact:true}));
   await pause(1400);await click(card.getByRole('radio',{name:'승률순',exact:true}));
   await pause(1500);await click(card.getByRole('radiogroup',{name:'맵 형식',exact:true}).getByRole('radio',{name:'전체',exact:true}));
 });
 await scene('29-synergy',q,async()=>{
   const list=sp.getByRole('region',{name:'시너지 기록 목록',exact:true});
   await frame(list);await list.getByRole('button',{name:'달빛고양이',exact:true}).hover();
   await pause(2400);await click(sp.getByRole('radiogroup',{name:'팀 관계',exact:true}).getByRole('radio',{name:'상대 팀',exact:true}));
   await list.getByRole('button',{name:'달빛고양이',exact:true}).hover();await pause(2800);
 });
 await scene('30-predictions',q,async()=>{
   const score=sp.getByRole('radiogroup',{name:'점수 종류',exact:true});
   await frame(score);await click(score.getByRole('radio',{name:'분석 점수',exact:true}));
   await pause(1800);await scroll(sp,420);
 });
 await nav(sp,base);
 await scene('31-outro',q,async()=>{await top(sp);await pause(1000);});
} finally {
 for(const session of sessions)await session.context.close();
 await browser.close();
 await writeFile(`${DEMO_OUT}/recording-${tag}.json`,JSON.stringify(manifest,null,2));
 console.log(`Saved ${manifest.length} scenes: recording-${tag}.json`);
}
