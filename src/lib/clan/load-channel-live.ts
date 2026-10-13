import "server-only";
import {checkChannelLives} from "./channel-live.mjs";
import type {BoardChannel} from "./board";
export type ChannelLive={state:"live"|"offline"|"unknown";reason?:string;checkedAt:string};
const cache=new Map<string,{until:number;result:ChannelLive[]}>();
const running=new Map<string,Promise<ChannelLive[]>>();
export async function loadChannelLive(channels:BoardChannel[]):Promise<ChannelLive[]>{
  const key=JSON.stringify(channels),saved=cache.get(key);
  if(saved&&saved.until>Date.now())return saved.result;
  const old=running.get(key);if(old)return old;
  const query=checkChannelLives(channels).then(result=>{
    const value=result as ChannelLive[];
    if(cache.size>=300)cache.delete(cache.keys().next().value!);
    cache.set(key,{until:Date.now()+300_000,result:value});return value;
  }).finally(()=>running.delete(key));
  running.set(key,query);return query;
}
