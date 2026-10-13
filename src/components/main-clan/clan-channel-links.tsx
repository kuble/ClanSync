"use client";
import {useEffect,useState} from "react";
import {boardDate,safeBoardUrl,type BoardChannel} from "@/lib/clan/board";
import type {ChannelLive} from "@/lib/clan/load-channel-live";
import {cn} from "@/lib/utils";
export function ClanChannelLinks({base,postId,channels}:{base:string;postId:string;channels:BoardChannel[]}){
  const [result,setResult]=useState<{signature:string;live:ChannelLive[]}|null>(null);
  const signature=JSON.stringify(channels);
  useEffect(()=>{
    let current:AbortController|null=null,stopped=false;
    const failed=()=>setResult({signature,live:(JSON.parse(signature) as BoardChannel[]).map(()=>({state:'unknown',reason:'현재 확인 실패',checkedAt:new Date().toISOString()}))});
    async function check(){
      if(document.hidden||current)return;
      current=new AbortController();
      try{
        const response=await fetch(base+'/board/live/'+postId,{signal:current.signal,cache:'no-store'});
        if(!response.ok){if(!stopped)failed();return;}
        const value=await response.json();
        if(!stopped&&Array.isArray(value.live)&&JSON.stringify(value.channels)===signature)setResult({signature,live:value.live});
      }catch{if(!stopped)failed();}finally{current=null;}
    }
    void check();const timer=window.setInterval(check,60_000);
    document.addEventListener('visibilitychange',check);
    return ()=>{stopped=true;current?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',check);};
  },[base,postId,signature]);
  return <ul className="space-y-2">{channels.map((channel,i)=>{
    const live=result?.signature===signature?result.live[i]:undefined,url=safeBoardUrl(channel.url);
    return url&&<li key={channel.platform+channel.url} className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"><a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary">{channel.platform} 방송 채널 열기 ↗</a><span title={live?'확인 시각 '+boardDate(live.checkedAt,true)+' · 최대 5분 간격 확인':undefined} className={cn('text-xs',live?.state==='live'?'font-semibold text-red-400':'text-muted-foreground')}>{live?.state==='live'?'● LIVE · 방송 중':live?.state==='offline'?'방송 중 아님':live?.reason??'라이브 확인 중…'}</span></li>;
  })}</ul>;
}
