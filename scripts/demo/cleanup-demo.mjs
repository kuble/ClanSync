import {unlink,writeFile} from 'node:fs/promises';
import {DEMO_OUT,cleanupDemoFixture,loadDemoFixture,qaService} from './qa-demo-fixture.mjs';
const f=await loadDemoFixture();
await cleanupDemoFixture(f);
const {data,error}=await qaService().from('clans').select('id').eq('id',f.clanId);
if(error)throw error;
if(data.length)throw new Error('The demo clan still exists after cleanup');
for(const filename of ['fixture-private.json','auth-demo-leader.json','auth-demo-member.json','auth-local.json']) {
  await unlink(`${DEMO_OUT}/${filename}`).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
await writeFile(`${DEMO_OUT}/privacy-check.json`,JSON.stringify({temporaryClanRemoved:true,temporaryUsersRemoved:f.users.length,localCredentialsRemoved:true},null,2));
console.log(`Cleaned the isolated demo clan and ${f.users.length} users; removed local authentication files.`);
