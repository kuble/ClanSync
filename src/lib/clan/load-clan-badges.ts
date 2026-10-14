import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {cache} from "react";
import {createServiceRoleClient} from "@/lib/supabase/service";
import {getRequestClient,getRequestUser} from "@/lib/supabase/request";
import {getRequestClanAccess} from "@/lib/clan/request-clan-access";
import {CLAN_BADGES,badgeAnniversary,getClanBadgeRepresentatives,type ClanBadgeCollection,type ClanBadgeKey} from "./badges";

type BadgeMetrics=Record<string,{count:number;dates:Record<string,string|null>}>;

export const loadClanBadges=cache(async(clanId:string):Promise<ClanBadgeCollection>=>{
  const [untyped,user,access]=await Promise.all([getRequestClient(),getRequestUser(),getRequestClanAccess(clanId)]);
  const client: SupabaseClient<Database> = untyped;
  if(!user||access.membership?.status!=="active")throw new Error("배지 케이스 접근 권한이 없습니다.");
  const service=createServiceRoleClient();
  const [clan,metrics,featured,seen]=await Promise.all([
    client.from("clans").select("name,created_at").eq("id",clanId).single(),
    service.rpc("read_clan_badge_metrics",{p_clan_id:clanId}),
    client.from("clan_badge_featured").select("badge_keys").eq("clan_id",clanId).maybeSingle(),
    client.from("clan_badge_seen").select("seen_at").eq("clan_id",clanId).eq("user_id",user.id).maybeSingle(),
  ]);
  if(clan.error||metrics.error||!metrics.data||featured.error||seen.error)throw new Error("배지 기록을 불러오지 못했습니다.");
  const counts=metrics.data as unknown as BadgeMetrics;
  const now=Date.now();
  const badges=CLAN_BADGES.map(b=>{
    const anniversary=b.metric==="anniversary"?badgeAnniversary(clan.data.created_at,b.years):null;
    const metric=counts[b.metric];
    if(b.target>0&&(!metric||!Number.isFinite(metric.count)||metric.count<0))throw new Error("배지 집계를 확인하지 못했습니다.");
    const count=metric?.count??0;
    const earned=b.key==="founding"||(anniversary?Date.parse(anniversary)<=now:count>=b.target);
    // Unknown historical completion dates use the first verified award time.
    const earnedAt=b.key==="founding"?clan.data.created_at:anniversary??metric?.dates[String(b.target)]??new Date(now).toISOString();
    return {...b,earned,earnedAt:earned?earnedAt:null,progress:b.target?Math.min(count,b.target).toLocaleString("ko-KR")+" / "+b.target.toLocaleString("ko-KR")+(b.group==="멤버"||b.group==="동료"?"명":b.group==="게시판"?"개":"회"):new Date(anniversary??clan.data.created_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}),isNew:false};
  });
  // Existing correction semantics return a milestone below its threshold to an empty slot.
  const invalid=badges.filter(b=>!b.earned).map(b=>b.key);
  const revoked=invalid.length?await service.from("clan_badge_awards").delete().eq("clan_id",clanId).in("badge_key",invalid):{error:null};
  const awarded=await service.from("clan_badge_awards").upsert(badges.filter(b=>b.earned).map(b=>({clan_id:clanId,badge_key:b.key,earned_at:b.earnedAt})),{onConflict:"clan_id,badge_key",ignoreDuplicates:true});
  const awards=await client.from("clan_badge_awards").select("badge_key,earned_at,created_at").eq("clan_id",clanId);
  if(revoked.error||awarded.error||awards.error)throw new Error("배지 획득 기록을 확인하지 못했습니다.");
  const fresh=new Set(awards.data.filter(a=>!seen.data||Date.parse(a.created_at)>Date.parse(seen.data.seen_at)).map(a=>a.badge_key));
  const completed=badges.map(b=>{
    const award=awards.data.find(a=>a.badge_key===b.key);
    return {...b,earnedAt:b.earned?(b.metric==="members"||b.metric==="coaching"?award?.earned_at??b.earnedAt:b.earnedAt):null,awardedAt:award?.created_at??null,isNew:b.earned&&fresh.has(b.key)};
  });
  const representatives=getClanBadgeRepresentatives(completed);
  const featuredKeys=featured.data?.badge_keys.flatMap(key=>{
    // Preserve old featured choices when retired milestones belong to an active family.
    const family=key==="regular-10"||key==="regular-500"?"regular":key==="flash-1"?"flash":null;
    const replacement=family?representatives.find(b=>"series" in b&&b.series===family&&b.earned)?.key:null;
    const candidate=replacement??key;
    return completed.some(b=>b.key===candidate&&b.earned)?[candidate as ClanBadgeKey]:[];
  });
  return {badges:completed,featured:featuredKeys?[...new Set(featuredKeys)]:null,clanName:clan.data.name,createdAt:clan.data.created_at,userId:user.id};
});
