import "server-only";
import {cache} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";
import {getRequestClient} from "@/lib/supabase/request";

// Shared by board posts and coach profiles only within the current render request.
export const loadClanPeerNames=cache(async(clanId:string)=>{
  const client:SupabaseClient<Database>=await getRequestClient();
  return client.rpc("clan_peer_nicknames",{p_clan_id:clanId});
});
