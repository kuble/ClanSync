import {test} from 'node:test';
import assert from 'node:assert/strict';
import {channelIdentity,checkChannelLives} from '../src/lib/clan/channel-live.mjs';
const channelId='UC'+'a'.repeat(22),chzzkId='b'.repeat(32);
const channels=[{platform:'YouTube',url:'https://www.youtube.com/@clansync'},{platform:'Twitch',url:'https://www.twitch.tv/clansync'},{platform:'CHZZK',url:'https://chzzk.naver.com/'+chzzkId},{platform:'SOOP',url:'https://ch.sooplive.co.kr/clansync'}];
test('unconfigured and invalid channels never become offline or cause arbitrary URL requests',async()=>{
  let calls=0;
  const result=await checkChannelLives(channels,{env:{},fetcher:async()=>{calls++;throw new Error('Unexpected fetch');}});
  assert.equal(calls,0);assert.ok(result.every(v=>v.state==='unknown'));
  assert.equal(channelIdentity({platform:'CHZZK',url:'https://chzzk.naver.com/live/'+chzzkId}).id,chzzkId);
  for(const url of ['http://twitch.tv/clansync','https://twitch.tv.evil.test/clansync','https://user:pass@twitch.tv/clansync','https://127.0.0.1/private'])assert.equal(channelIdentity({platform:'Twitch',url}),null);
});
test('official API adapters return live/offline and traverse the complete CHZZK directory',async()=>{
  const urls=[];
  const fetcher=async(url)=>{
    urls.push(url);const u=new URL(url);
    let body;
    if(u.hostname==='id.twitch.tv')body={access_token:'test-token'};
    else if(u.hostname==='api.twitch.tv')body={data:[{user_login:'clansync'}]};
    else if(u.hostname==='www.googleapis.com'&&u.pathname.endsWith('/channels'))body={items:[{id:channelId}]};
    else if(u.hostname==='www.googleapis.com')body={items:[]};
    else if(!u.searchParams.has('next'))body={code:200,content:{data:[],page:{next:'page2'}}};
    else body={code:200,content:{data:[{channelId:chzzkId}],page:{}}};
    return {ok:true,json:async()=>body};
  };
  const result=await checkChannelLives(channels,{env:{YOUTUBE_API_KEY:'test',TWITCH_CLIENT_ID:'test',TWITCH_CLIENT_SECRET:'test',CHZZK_CLIENT_ID:'test',CHZZK_CLIENT_SECRET:'test'},fetcher});
  assert.deepEqual(result.map(v=>v.state),['offline','live','live','unknown']);
  assert.equal(urls.filter(u=>u.includes('openapi.chzzk')).length,2);
  assert.ok(urls.every(u=>['id.twitch.tv','api.twitch.tv','www.googleapis.com','openapi.chzzk.naver.com'].includes(new URL(u).hostname)));
});
test('quota/network failures remain unknown; incomplete directories are never offline',async()=>{
  const failed=await checkChannelLives([channels[0]],{env:{YOUTUBE_API_KEY:'test'},fetcher:async()=>({ok:false})});
  assert.equal(failed[0].state,'unknown');assert.equal(failed[0].reason,'현재 확인 실패');
  const bounded=await checkChannelLives([channels[2]],{env:{CHZZK_CLIENT_ID:'test',CHZZK_CLIENT_SECRET:'test'},fetcher:async()=>({ok:true,json:async()=>({code:200,content:{data:[],page:{next:'more'}}})})});
  assert.equal(bounded[0].state,'unknown');
});
