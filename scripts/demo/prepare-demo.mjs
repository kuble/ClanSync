import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {DEMO_OUT,QA_ORIGIN,createDemoFixture,login,sharedLeader,qaService,cleanupDemoFixture} from './qa-demo-fixture.mjs';

await mkdir(DEMO_OUT,{recursive:true});
try {
  await access(`${DEMO_OUT}/fixture-private.json`);
  throw new Error('A demo fixture file already exists. Inspect and clean it before starting another recording.');
} catch(error) {if(error.code!=='ENOENT')throw error;}
const service=qaService();
const {data:clan,error}=await service.from('clans').select('id').eq('name','QA_01_Clan').single();
if(error)throw error;
await writeFile(`${DEMO_OUT}/clan.json`,JSON.stringify({clanId:clan.id}));
const f=await createDemoFixture();
const browser=await chromium.launch({headless:true});
try {
  for(const [filename,user] of [['auth-local.json',sharedLeader],['auth-demo-leader.json',f.users[0]],['auth-demo-member.json',f.users[1]]]) {
    const context=await browser.newContext({viewport:{width:1600,height:760},timezoneId:'Asia/Seoul'});
    const page=await context.newPage();
    await login(page,user);
    await context.storageState({path:`${DEMO_OUT}/${filename}`});
    if(user.id===f.users[0].id) {
      await page.goto(`${QA_ORIGIN}/games/overwatch/clan/${f.clanId}/balance`);
      await page.getByRole('button',{name:'내전 추가',exact:true}).click();
      const dialog=page.getByRole('dialog',{name:'내전 만들기',exact:true});
      await dialog.getByRole('textbox',{name:'내전 이름',exact:true}).fill('토요 정기 내전 · 기능 시연');
      await dialog.getByRole('button',{name:'내전 만들기',exact:true}).click();
      await expect(dialog).toBeHidden({timeout:30000});
      f.roomId=await page.getByTestId('balance-lobby-room').filter({hasText:'토요 정기 내전 · 기능 시연'}).getAttribute('data-room-id');
      if(!f.roomId)throw new Error('The demo room is missing its ID');
      await writeFile(`${DEMO_OUT}/fixture-private.json`,JSON.stringify(f,null,2));
    }
    await context.close();
  }
  console.log('Prepared isolated demo clan, 12 users, and authenticated cameras. Existing QA data was not reseeded.');
} catch(error) {
  await cleanupDemoFixture(f);
  throw error;
} finally {await browser.close();}
