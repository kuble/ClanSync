import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {cache} from "react";
import {createServiceRoleClient} from "@/lib/supabase/service";
import {getRequestClient,getRequestUser} from "@/lib/supabase/request";
import {getRequestClanAccess} from "@/lib/clan/request-clan-access";
import {loadClanHistory} from "./load-clan-history";
import {CLAN_BADGES,badgeAnniversary,type ClanBadgeCollection,type ClanBadgeKey} from "./badges";

export const loadClanBadges=cache(async(clanId:string):Promise<ClanBadgeCollection>=>{
  const [untyped,user,access]=await Promise.all([getRequestClient(),getRequestUser(),getRequestClanAccess(clanId)]);
  const client: SupabaseClient<Database> = untyped;
  if(!user||access.membership?.status!=="active")throw new Error("배지 케이스 접근 권한이 없습니다.");
  const service=createServiceRoleClient();
  const [clan,history,regular,flash,featured,seen]=await Promise.all([
    client.from("clans").select("name,created_at").eq("id",clanId).single(),
    loadClanHistory(service,clanId),
    service.from("balance_session_series").select("id,closed_at,balance_rooms!inner(kind)").eq("clan_id",clanId).eq("balance_rooms.kind","regular").not("closed_at","is",null).order("closed_at").order("id").limit(500),
    service.from("balance_session_series").select("id,closed_at,balance_rooms!inner(kind)").eq("clan_id",clanId).eq("balance_rooms.kind","flash").not("closed_at","is",null).order("closed_at").order("id").limit(10),
    client.from("clan_badge_featured").select("badge_keys").eq("clan_id",clanId).maybeSingle(),
    client.from("clan_badge_seen").select("seen_at").eq("clan_id",clanId).eq("user_id",user.id).maybeSingle(),
  ]);
  if(clan.error||regular.error||flash.error||featured.error||seen.error||history.completedRegular===null||history.completedFlash===null)throw new Error("배지 기록을 불러오지 못했습니다.");
  const now=Date.now();
  const badges=CLAN_BADGES.map(b=>{
    const anniversary="years" in b?badgeAnniversary(clan.data.created_at,b.years):null;
    const count=b.group==="정규 내전"?history.completedRegular!:history.completedFlash!;
    const earned=b.key==="founding"||(anniversary?Date.parse(anniversary)<=now:count>=b.target);
    const earnedAt=b.key==="founding"?clan.data.created_at:anniversary??(b.group==="정규 내전"?regular.data:flash.data)[b.target-1]?.closed_at??null;
    return {...b,earned,earnedAt:earned?earnedAt:null,progress:b.target?Math.min(count,b.target)+" / "+b.target:new Date(anniversary??clan.data.created_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}),isNew:false};
  });
  // Existing correction semantics return a milestone below its threshold to an empty slot.
  const invalid=badges.filter(b=>!b.earned).map(b=>b.key);
  const revoked=invalid.length?await service.from("clan_badge_awards").delete().eq("clan_id",clanId).in("badge_key",invalid):{error:null};
  const awarded=await service.from("clan_badge_awards").upsert(badges.filter(b=>b.earned).map(b=>({clan_id:clanId,badge_key:b.key,earned_at:b.earnedAt})),{onConflict:"clan_id,badge_key",ignoreDuplicates:true});
  const awards=await client.from("clan_badge_awards").select("badge_key,created_at").eq("clan_id",clanId);
  if(revoked.error||awarded.error||awards.error)throw new Error("배지 획득 기록을 확인하지 못했습니다.");
  const fresh=new Set(awards.data.filter(a=>!seen.data||Date.parse(a.created_at)>Date.parse(seen.data.seen_at)).map(a=>a.badge_key));
  return {badges:badges.map(b=>({...b,awardedAt:awards.data.find(a=>a.badge_key===b.key)?.created_at??null,isNew:b.earned&&fresh.has(b.key)})),featured:featured.data?featured.data.badge_keys.filter((key):key is ClanBadgeKey=>badges.some(b=>b.key===key&&b.earned)):null,clanName:clan.data.name,createdAt:clan.data.created_at,userId:user.id};
});
