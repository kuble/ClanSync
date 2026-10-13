"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {loadMainClanContext} from "@/lib/clan/load-main-clan-context";
import {CLAN_BADGES,type ClanBadgeKey} from "@/lib/clan/badges";
import {uuidPattern} from "@/lib/clan/board";
type Result={ok:true}|{ok:false;error:string};
async function actor(gameSlug:string,clanId:string){
  if(!uuidPattern.test(clanId))return null;
  const client=await createClient();const {data:{user}}=await client.auth.getUser();
  if(!user)return null;
  const ctx=await loadMainClanContext(client,user.id,gameSlug,clanId);
  return ctx?{client,user,ctx}:null;
}
export async function setFeaturedBadgesAction(gameSlug:string,clanId:string,keys:ClanBadgeKey[]):Promise<Result>{
  if(!Array.isArray(keys)||keys.length>3||new Set(keys).size!==keys.length||keys.some(key=>!CLAN_BADGES.some(b=>b.key===key)))return {ok:false,error:"대표 배지는 최대 3개를 중복 없이 선택해 주세요."};
  const ctx=await actor(gameSlug,clanId);if(!ctx||ctx.ctx.role==="member")return {ok:false,error:"운영진만 대표 배지를 고를 수 있습니다."};
  const existing=await ctx.client.from("clan_badge_featured").select("clan_id").eq("clan_id",clanId).maybeSingle();
  if(existing.error)return {ok:false,error:"대표 배지 정보를 확인하지 못했습니다."};
  let result=existing.data?await ctx.client.from("clan_badge_featured").update({badge_keys:keys}).eq("clan_id",clanId):await ctx.client.from("clan_badge_featured").insert({clan_id:clanId,badge_keys:keys});
  if(result.error?.code==="23505")result=await ctx.client.from("clan_badge_featured").update({badge_keys:keys}).eq("clan_id",clanId);
  if(result.error)return {ok:false,error:"획득한 배지만 대표 배지로 지정할 수 있습니다."};
  revalidatePath("/games/"+gameSlug+"/clan/"+clanId,"layout");return {ok:true};
}
export async function acknowledgeBadgesAction(gameSlug:string,clanId:string):Promise<Result>{
  const ctx=await actor(gameSlug,clanId);if(!ctx)return {ok:false,error:"클랜 접근 권한을 확인해 주세요."};
  const existing=await ctx.client.from("clan_badge_seen").select("user_id").eq("clan_id",clanId).eq("user_id",ctx.user.id).maybeSingle();
  if(existing.error)return {ok:false,error:"확인 상태를 불러오지 못했습니다."};
  const seen_at=new Date().toISOString();
  let result=existing.data?await ctx.client.from("clan_badge_seen").update({seen_at}).eq("clan_id",clanId).eq("user_id",ctx.user.id):await ctx.client.from("clan_badge_seen").insert({clan_id:clanId,user_id:ctx.user.id,seen_at});
  if(result.error?.code==="23505")result=await ctx.client.from("clan_badge_seen").update({seen_at}).eq("clan_id",clanId).eq("user_id",ctx.user.id);
  if(result.error)return {ok:false,error:"배지 확인 상태를 저장하지 못했습니다."};
  revalidatePath("/games/"+gameSlug+"/clan/"+clanId+"/badges");return {ok:true};
}
