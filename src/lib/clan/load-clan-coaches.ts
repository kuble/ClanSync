import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";
import {getRequestClient} from "@/lib/supabase/request";
import type {ClanCoach} from "./coaching";
import {loadClanPeerNames} from "./load-clan-peer-names";

export async function loadClanCoaches(clanId:string):Promise<ClanCoach[]>{
  const client:SupabaseClient<Database>=await getRequestClient();
  const [profiles,names]=await Promise.all([
    client.from("clan_board_coaches").select("user_id,expertise,bio,accepting").eq("clan_id",clanId).order("updated_at",{ascending:false}).limit(100),
    loadClanPeerNames(clanId),
  ]);
  if(profiles.error||names.error)throw new Error("코칭 선생님을 불러오지 못했습니다.");
  const nicknames=new Map(names.data.map(n=>[n.user_id,n.nickname]));
  return profiles.data.map(p=>({userId:p.user_id,name:nicknames.get(p.user_id)??"클랜원",expertise:p.expertise,bio:p.bio,accepting:p.accepting}));
}
