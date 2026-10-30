import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const {data,error}=await query; assert.equal(error,null,error?.message); return data; }
async function denied(query) { const {error}=await query; assert.ok(error,"Restricted operation unexpectedly succeeded"); return error; }

test("immutable demographics and recruitment rules protect direct API, approvals and request replacement",async t => {
  const f=await createIsolatedBalanceFixture(4), svc=f.service;
  const clients=await Promise.all(f.users.map((_,i)=>f.memberClient(i)));
  const [leader,officer,member,applicant]=clients;
  const applicantId=f.users[3].id;
  let otherId;
  t.after(async()=>{ await Promise.all(clients.map(c=>c.auth.signOut())); if(otherId) await ok(svc.from("clans").delete().eq("id",otherId)); await f.cleanup(); });
  await ok(svc.from("clan_members").update({role:"officer"}).eq("clan_id",f.clanId).eq("user_id",f.users[1].id));
  await ok(svc.from("clan_members").delete().eq("clan_id",f.clanId).eq("user_id",applicantId));
  const save=(client,year,gender="all",tiers=[])=>client.rpc("update_clan_recruitment",{p_clan_id:f.clanId,p_birth_year_limit:year,p_gender_policy:gender,p_tiers:tiers});
  const apply=(clanId=f.clanId)=>applicant.from("clan_join_requests").insert({clan_id:clanId,game_id:f.gameId,user_id:applicantId}).select("id").single();
  const status=id=>ok(svc.from("clan_join_requests").select("status").eq("id",id).single());
  const cancel=id=>ok(applicant.from("clan_join_requests").update({status:"canceled",resolved_by:applicantId}).eq("id",id));
  await t.test("demographics cannot be changed by REST or auth metadata; personal settings still work",async()=>{
    await denied(applicant.from("users").update({birth_year:1970}).eq("id",applicantId));
    await denied(applicant.from("users").update({gender:"male"}).eq("id",applicantId));
    await ok(applicant.auth.updateUser({data:{birth_year:1970,gender:"male"}}));
    assert.deepEqual(await ok(svc.from("users").select("birth_year,gender").eq("id",applicantId).single()),{birth_year:2000,gender:"undisclosed"});
    await ok(applicant.from("users").update({auto_login:true}).eq("id",applicantId));
  });
  await t.test("only current officers can save valid recruitment conditions",async()=>{
    const env=loadTestEnv();
    const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
    await denied(save(anon,null)); await denied(save(member,null)); await denied(save(applicant,null));
    await denied(save(leader,1900)); await denied(save(leader,null,"invalid")); await denied(save(leader,null,"all",["fake"]));
    await ok(save(officer,2000,"all",["gold"]));
    const other=await ok(svc.from("clans").insert({game_id:f.gameId,name:`Recruit-${f.clanId.slice(0,8)}`}).select("id").single()); otherId=other.id;
    await denied(leader.rpc("update_clan_recruitment",{p_clan_id:otherId,p_gender_policy:"male",p_tiers:[]}));
  });
  let staleId;
  await t.test("birth-year cutoff is inclusive, tier is informational, and later changes block approval atomically",async()=>{
    staleId=(await ok(apply())).id;
    await ok(save(leader,1999));
    await denied(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:staleId,p_decision:"approved"}));
    assert.equal((await status(staleId)).status,"pending");
    assert.equal((await ok(svc.from("clan_members").select("id").eq("clan_id",f.clanId).eq("user_id",applicantId))).length,0);
    await cancel(staleId);
    assert.match((await denied(apply())).message,/1999/);
  });
  await t.test("gender restrictions reject undisclosed/wrong gender; unrestricted and matching applicants pass",async()=>{
    await ok(save(leader,null,"male")); await denied(apply());
    await ok(svc.from("users").update({gender:"female"}).eq("id",applicantId)); await denied(apply());
    await ok(save(leader,null,"female")); await cancel((await ok(apply())).id);
    await ok(save(leader,null,"all")); await cancel((await ok(apply())).id);
  });
  await t.test("failed replacement preserves the pending request; success swaps once, and rejection remains possible",async()=>{
    const old=(await ok(apply(otherId))).id;
    await ok(save(leader,1999));
    await denied(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId,p_message:"새 신청"}));
    assert.equal((await status(old)).status,"pending");
    await ok(save(leader,2000,"female",["gold"]));
    await ok(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId,p_message:"새 신청"}));
    assert.equal((await status(old)).status,"canceled");
    const pending=await ok(svc.from("clan_join_requests").select("id,message").eq("user_id",applicantId).eq("status","pending").single());
    assert.equal(pending.message,"새 신청");
    await denied(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId,p_message:"중복"}));
    await ok(save(leader,1999));
    await ok(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:pending.id,p_decision:"rejected"}));
    assert.equal((await status(pending.id)).status,"rejected");
    await ok(save(leader,2000,"female"));
    const accepted=(await ok(apply())).id;
    await ok(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:accepted,p_decision:"approved"}));
    assert.equal((await status(accepted)).status,"approved");
  });
});
