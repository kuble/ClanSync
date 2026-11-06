import "server-only";
import {cache} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";
import {getRequestClient} from "@/lib/supabase/request";
import {retryDatabaseRead} from "@/lib/supabase/read-query";

// Shared by clan views only within the current render request.
export const loadClanPeerNames=cache(async(clanId:string)=>{
  const client:SupabaseClient<Database>=await getRequestClient();
  return retryDatabaseRead("clan-peer-names",()=>client.rpc("clan_peer_nicknames",{p_clan_id:clanId}).retry(false));
});
