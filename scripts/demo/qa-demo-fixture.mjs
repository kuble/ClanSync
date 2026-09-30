import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { loadTestEnv } from '../test-env.mjs';
import { qaFixtureEmail, FIXTURE_PASSWORD } from '../fixtures/qa-fixtures.mjs';
import { readFile, writeFile } from 'node:fs/promises';

export const DEMO_OUT = 'test-results/clansync-demo-2026-09-30';
export const QA_ORIGIN = 'http://localhost:3011';
export const displayNames = ['새벽별', '달빛고양이', '바람결', 'AimZero', 'Luna', '구름여우', 'NeonPulse', '한판더', '힐링모찌', 'BlueFox', '감자에임', 'Ctrl힐'];
export function qaService() {
  const env = loadTestEnv(); // Existing allowlist rejects production before any write.
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
}
function checked(result) { if(result.error) throw result.error; return result.data; }
export async function createDemoFixture() {
  const service=qaService();
  const game=checked(await service.from('games').select('id').eq('slug','overwatch').single());
  const tag=randomUUID().slice(0,8);
  const state={tag, clanId:null, gameId:game.id, users:[]};
  const save=()=>writeFile(`${DEMO_OUT}/fixture-private.json`,JSON.stringify(state,null,2));
  await save();
  try {
    for(let i=0;i<12;i++) {
      const email=`video-demo-${tag}-${i}@clansync-qa.local`;
      const password=`${randomUUID()}aA1!`;
      const nickname=`${displayNames[i]}_시연`;
      const auth=checked(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nickname,birth_year:2000}}));
      state.users.push({id:auth.user.id,email,password,nickname});
      await save();
    }
    checked(await service.from('user_game_profiles').insert(state.users.map(u=>({user_id:u.id,game_id:game.id,game_uid:`demo_${tag}_${u.id}`,is_verified:true,verified_at:new Date().toISOString()}))));
    const clan=checked(await service.from('clans').insert({game_id:game.id,name:'ClanSync 시연 클랜',subscription_tier:'premium'}).select('id').single());
    state.clanId=clan.id;
    await save();
    checked(await service.from('clan_members').insert(state.users.map((u,i)=>({clan_id:clan.id,user_id:u.id,role:i===0?'leader':'member',status:'active'}))));
    return state;
  } catch(e) { await cleanupDemoFixture(state); throw e; }
}
export async function cleanupDemoFixture(state) {
  if(!state.tag || !state.users.every(u=>u.email.startsWith(`video-demo-${state.tag}-`)&&u.email.endsWith('@clansync-qa.local'))) throw new Error('Refusing cleanup without demo ownership markers');
  const service=qaService();
  if(state.clanId) {
    const clan=checked(await service.from('clans').select('name').eq('id',state.clanId).maybeSingle());
    if(clan && clan.name!=='ClanSync 시연 클랜') throw new Error('Demo clan ownership check failed');
    checked(await service.from('balance_sessions').delete().eq('clan_id',state.clanId));
    checked(await service.from('clans').delete().eq('id',state.clanId));
  }
  for(const u of state.users) checked(await service.auth.admin.deleteUser(u.id));
  await writeFile(`${DEMO_OUT}/cleanup.json`,JSON.stringify({clanId:state.clanId,deletedUsers:state.users.length,cleanedAt:new Date().toISOString()},null,2));
}
export async function loadDemoFixture() { return JSON.parse(await readFile(`${DEMO_OUT}/fixture-private.json`,'utf8')); }
export async function login(page,user) {
  await page.goto(`${QA_ORIGIN}/sign-in`);
  await page.getByLabel('이메일').fill(user.email);
  await page.getByLabel('비밀번호',{exact:true}).fill(user.password);
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.waitForURL(/\/games\/?$/,{timeout:60000});
}
export const sharedLeader={email:qaFixtureEmail('Leader','01'),password:FIXTURE_PASSWORD};
