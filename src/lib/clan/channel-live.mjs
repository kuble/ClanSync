// Only fixed official API hosts receive requests; saved channel URLs are never fetched.
export function channelIdentity(channel){
  try{
    const u=new URL(channel.url),host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);
    if(u.protocol!=='https:'||u.username||u.password)return null;
    if(channel.platform==='Twitch'&&['twitch.tv','www.twitch.tv'].includes(host)&&/^[a-z0-9_]{1,25}$/i.test(parts[0]??''))return {platform:channel.platform,id:parts[0].toLowerCase()};
    const chzzkId=parts[0]==='live'?parts[1]:parts[0];
    if(channel.platform==='CHZZK'&&host==='chzzk.naver.com'&&/^[a-f0-9]{32}$/i.test(chzzkId??''))return {platform:channel.platform,id:chzzkId};
    if(channel.platform==='YouTube'){
      if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){
        if(parts[0]==='channel'&&/^UC[\w-]{22}$/.test(parts[1]??''))return {platform:channel.platform,id:parts[1]};
        if(parts[0]?.startsWith('@')&&parts[0].length>1)return {platform:channel.platform,handle:decodeURIComponent(parts[0])};
        if(parts[0]==='watch'&&/^[\w-]{11}$/.test(u.searchParams.get('v')??''))return {platform:channel.platform,video:u.searchParams.get('v')};
      }
      if(host==='youtu.be'&&/^[\w-]{11}$/.test(parts[0]??''))return {platform:channel.platform,video:parts[0]};
    }
  }catch{}
  return null;
}

export async function checkChannelLives(channels,{env=process.env,fetcher=fetch,now=()=>Date.now()}={}){
  const checkedAt=new Date(now()).toISOString();
  const pending=channels.map(()=>({state:'unknown',reason:'확인 필요',checkedAt}));
  async function json(url,options={}){
    const r=await fetcher(url,{...options,signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error('Platform API unavailable');
    return r.json();
  }
  const identities=channels.map(channelIdentity);
  const twitch=identities.map((v,i)=>({v,i})).filter(x=>x.v?.platform==='Twitch');
  const chzzk=identities.map((v,i)=>({v,i})).filter(x=>x.v?.platform==='CHZZK');
  await Promise.all([
    (async()=>{
      if(!twitch.length)return;
      if(!env.TWITCH_CLIENT_ID||!env.TWITCH_CLIENT_SECRET){twitch.forEach(x=>pending[x.i].reason='API 연결 필요');return;}
      try{
        const token=await json('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:env.TWITCH_CLIENT_ID,client_secret:env.TWITCH_CLIENT_SECRET,grant_type:'client_credentials'}),cache:'no-store'});
        if(typeof token.access_token!=='string')throw new Error('Missing token');
        const q=new URLSearchParams();twitch.forEach(x=>q.append('user_login',x.v.id));
        const response=await json('https://api.twitch.tv/helix/streams?'+q,{headers:{'Client-Id':env.TWITCH_CLIENT_ID,Authorization:'Bearer '+token.access_token},cache:'no-store'});
        if(!Array.isArray(response.data))throw new Error('Invalid live response');
        twitch.forEach(x=>pending[x.i]={state:response.data.some(s=>typeof s.user_login==='string'&&s.user_login.toLowerCase()===x.v.id)?'live':'offline',checkedAt});
      }catch{twitch.forEach(x=>pending[x.i].reason='현재 확인 실패');}
    })(),
    (async()=>{
      if(!chzzk.length)return;
      if(!env.CHZZK_CLIENT_ID||!env.CHZZK_CLIENT_SECRET){chzzk.forEach(x=>pending[x.i].reason='API 연결 필요');return;}
      try{
        const liveIds=new Set();let next='',complete=false;
        // Bound work without treating an incomplete live directory as offline.
        for(let page=0;page<100;page++){
          const q=new URLSearchParams({size:'20'});if(next)q.set('next',next);
          const response=await json('https://openapi.chzzk.naver.com/open/v1/lives?'+q,{headers:{'Client-Id':env.CHZZK_CLIENT_ID,'Client-Secret':env.CHZZK_CLIENT_SECRET},cache:'no-store'});
          if(response.code!==200||!Array.isArray(response.content?.data))throw new Error('Invalid live response');
          response.content.data.forEach(s=>liveIds.add(s.channelId));
          next=response.content.page?.next??'';
          if(!next){complete=true;break;}
          if(chzzk.every(x=>liveIds.has(x.v.id)))break;
        }
        chzzk.forEach(x=>pending[x.i]=liveIds.has(x.v.id)?{state:'live',checkedAt}:complete?{state:'offline',checkedAt}:{state:'unknown',reason:'확인 범위 초과',checkedAt});
      }catch{chzzk.forEach(x=>pending[x.i].reason='현재 확인 실패');}
    })(),
    ...identities.map(async(identity,i)=>{
      if(channels[i].platform==='SOOP'){pending[i].reason='자동 확인 미지원';return;}
      if(!identity){pending[i].reason='채널 주소 확인 필요';return;}
      if(identity.platform!=='YouTube')return;
      if(!env.YOUTUBE_API_KEY){pending[i].reason='API 연결 필요';return;}
      try{
        let channelId=identity.id;
        if(!channelId){
          const path=identity.video?'videos':'channels';
          const q=new URLSearchParams({part:identity.video?'snippet':'id',key:env.YOUTUBE_API_KEY});
          if(identity.video)q.set('id',identity.video);else q.set('forHandle',identity.handle);
          const response=await json('https://www.googleapis.com/youtube/v3/'+path+'?'+q,{cache:'no-store'});
          channelId=identity.video?response.items?.[0]?.snippet?.channelId:response.items?.[0]?.id;
        }
        if(!/^UC[\w-]{22}$/.test(channelId??'')){pending[i].reason='채널 주소 확인 필요';return;}
        const q=new URLSearchParams({part:'snippet',channelId,eventType:'live',type:'video',maxResults:'1',key:env.YOUTUBE_API_KEY});
        const response=await json('https://www.googleapis.com/youtube/v3/search?'+q,{cache:'no-store'});
        if(!Array.isArray(response.items))throw new Error('Invalid live response');
        pending[i]={state:response.items.length?'live':'offline',checkedAt};
      }catch{pending[i].reason='현재 확인 실패';}
    }),
  ]);
  return pending;
}
