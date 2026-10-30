import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";
import { recruitmentTiers, recruitmentTierLabel, normalizeRecruitmentTier } from "../src/lib/clan/recruitment.ts";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

async function ok(query) { const {data,error}=await query; assert.equal(error,null,error?.message); return data; }
async function denied(query) { const {error}=await query; assert.ok(error,"Restricted operation unexpectedly succeeded"); return error; }

test("inclusive birth-year ranges protect applications, approvals, direct writes and atomic promotion saves",async t=>{
  const f=await createIsolatedBalanceFixture(4), svc=f.service;
  const clients=await Promise.all(f.users.map((_,index)=>f.memberClient(index))), [leader]=clients;
  t.after(async()=>{await Promise.all(clients.map(client=>client.auth.signOut()));await f.cleanup();});
  await ok(svc.from("clan_members").delete().eq("clan_id",f.clanId).neq("user_id",f.users[0].id));
  for(const [index,year] of [[1,1990],[2,2000],[3,2005]]) await ok(svc.from("users").update({birth_year:year}).eq("id",f.users[index].id));
  const save=(from=null,to=null)=>leader.rpc("update_clan_recruitment",{p_clan_id:f.clanId,p_birth_year_from:from,p_birth_year_limit:to,p_gender_policy:"all",p_tiers:[]});
  const apply=index=>clients[index].from("clan_join_requests").insert({clan_id:f.clanId,game_id:f.gameId,user_id:f.users[index].id}).select("id,status").single();
  const cancel=async(index,id)=>ok(clients[index].from("clan_join_requests").update({status:"canceled",resolved_by:f.users[index].id}).eq("id",id));
  await ok(save(1990,2005));
  for(const index of [1,2,3]) {const request=await ok(apply(index));await cancel(index,request.id);}
  await ok(save(1991,2004));
  await denied(apply(1));await denied(apply(3));
  const pending=await ok(apply(2));
  await ok(save(2001,2004));
  await denied(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:pending.id,p_decision:"approved"}));
  assert.equal((await ok(svc.from("clan_join_requests").select("status").eq("id",pending.id).single())).status,"pending");
  assert.equal((await ok(svc.from("clan_members").select("user_id").eq("clan_id",f.clanId).eq("user_id",f.users[2].id))).length,0);
  await ok(save(2000,2000));
  await ok(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:pending.id,p_decision:"approved"}));
  await denied(save(2001,1999));
  await denied(save(1949,null));
  await denied(save(null,new Date().getFullYear()));
  await denied(svc.from("clans").update({birth_year_from:2005,min_birth_year:2000}).eq("id",f.clanId));
  await denied(clients[1].rpc("update_clan_recruitment",{p_clan_id:f.clanId,p_birth_year_from:1950}));
  await ok(save(2000,null));await denied(apply(1));const younger=await ok(apply(3));await cancel(3,younger.id);
  await ok(save(null,2000));const older=await ok(apply(1));await cancel(1,older.id);await denied(apply(3));
  await ok(save());
  assert.deepEqual(await ok(svc.from("clans").select("birth_year_from,min_birth_year").eq("id",f.clanId).single()),{birth_year_from:null,min_birth_year:null});
  const input={p_clan_id:f.clanId,p_post_id:randomUUID(),p_title:"범위 모집",p_blocks:[{type:"text",text:"함께해요"}],p_birth_year_from:1990,p_birth_year_limit:2005};
  const published=(await ok(leader.rpc("save_clan_promotion",input)))[0];
  await denied(leader.rpc("save_clan_promotion",{...input,p_expected_updated_at:published.updated_at,p_birth_year_from:2005,p_birth_year_limit:1990,p_title:"저장되면 안 됨"}));
  assert.equal((await ok(svc.from("board_posts").select("title").eq("id",published.id).single())).title,input.p_title);
  assert.deepEqual(await ok(svc.from("clans").select("birth_year_from,min_birth_year").eq("id",f.clanId).single()),{birth_year_from:1990,min_birth_year:2005});
});

test("promotion saves text, inline photos and requirements atomically with conflict and storage protection",async t=>{
  const f=await createIsolatedBalanceFixture(3), svc=f.service;
  const [leader,officer,outsider]=await Promise.all(f.users.map((_,i)=>f.memberClient(i)));
  const bucket="clan-promotion-images", postId=randomUUID(), paths=[];
  t.after(async()=>{ await Promise.all([leader,officer,outsider].map(client=>client.auth.signOut())); await f.cleanup(); if(paths.length) await ok(svc.storage.from(bucket).remove(paths)); });
  await ok(svc.from("clan_members").update({role:"officer"}).eq("clan_id",f.clanId).eq("user_id",f.users[1].id));
  await ok(svc.from("clan_members").delete().eq("clan_id",f.clanId).eq("user_id",f.users[2].id));
  const file=await readFile(new URL("../public/images/overwatch/maps/busan.webp",import.meta.url));
  const path=`${f.clanId}/${f.users[0].id}/${postId}/${randomUUID()}.webp`;
  paths.push(path);
  await denied(outsider.storage.from(bucket).upload(path,file,{contentType:"image/webp"}));
  await ok(leader.storage.from(bucket).upload(path,file,{contentType:"image/webp"}));
  await denied(outsider.storage.from(bucket).download(path));
  const blocks=[{type:"text",text:"앞 이야기"},{type:"image",path,alt:"금요일 내전"},{type:"text",text:"뒤 이야기"}];
  const input={p_clan_id:f.clanId,p_post_id:postId,p_title:"새 클랜원 모집",p_blocks:blocks,p_birth_year_limit:2000,p_gender_policy:"all",p_tiers:["gold"]};
  await denied(outsider.rpc("save_clan_promotion",input));
  await denied(leader.rpc("save_clan_promotion",{...input,p_tiers:["challenger"]}));
  assert.equal((await ok(svc.from("board_posts").select("id").eq("id",postId))).length,0);
  const saved=(await ok(leader.rpc("save_clan_promotion",input)))[0];
  const row=await ok(svc.from("board_posts").select("title,content,content_blocks,updated_at").eq("id",postId).single());
  assert.equal(row.content,"앞 이야기\n\n뒤 이야기"); assert.deepEqual(row.content_blocks,blocks);
  assert.deepEqual(await ok(svc.from("clans").select("min_birth_year,tier_range").eq("id",f.clanId).single()),{min_birth_year:2000,tier_range:["gold"]});
  await ok(outsider.storage.from(bucket).download(path));
  await leader.storage.from(bucket).remove([path]); // RLS filters referenced objects out of DELETE.
  await ok(leader.storage.from(bucket).download(path));
  await denied(leader.from("board_posts").insert({game_id:f.gameId,clan_id:f.clanId,created_by:f.users[0].id,post_type:"promotion",title:"우회",content_blocks:blocks}));
  const forged=blocks.map(block=>block.type==="image"?{...block,path:path.replace(f.clanId,randomUUID())}:block);
  await denied(officer.rpc("save_clan_promotion",{...input,p_expected_updated_at:saved.updated_at,p_blocks:forged,p_birth_year_limit:1999}));
  assert.equal((await ok(svc.from("clans").select("min_birth_year").eq("id",f.clanId).single())).min_birth_year,2000);
  const changed=(await ok(officer.rpc("save_clan_promotion",{...input,p_expected_updated_at:saved.updated_at,p_title:"수정한 모집",p_birth_year_limit:1999})))[0];
  await denied(leader.rpc("save_clan_promotion",{...input,p_expected_updated_at:saved.updated_at,p_title:"오래된 화면"}));
  assert.equal((await ok(svc.from("board_posts").select("title").eq("id",postId).single())).title,"수정한 모집");
  assert.equal((await ok(svc.from("clans").select("min_birth_year").eq("id",f.clanId).single())).min_birth_year,1999);
  const outcomes=await Promise.all(["동시 수정 A","동시 수정 B"].map(p_title=>officer.rpc("save_clan_promotion",{...input,p_expected_updated_at:changed.updated_at,p_title})));
  assert.equal(outcomes.filter(result=>!result.error).length,1,"Only one concurrent writer may use a revision");
  assert.equal((await ok(svc.from("board_posts").select("id").eq("clan_id",f.clanId).eq("post_type","promotion"))).length,1);
});

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

test("each game's tier catalog is accepted in rank order and foreign tiers are rejected by both RPC and direct writes",async t=>{
  const f=await createIsolatedBalanceFixture(1), owner=await f.memberClient(0), others=[];
  t.after(async()=>{await owner.auth.signOut(); for(const id of others) await ok(f.service.from("clans").delete().eq("id",id)); await f.cleanup();});
  assert.equal(recruitmentTierLabel("overwatch","challenger"),"챔피언");
  assert.equal(recruitmentTierLabel("lol","challenger"),"챌린저");
  assert.equal(normalizeRecruitmentTier("lol","challenger"),"challenger");
  assert.deepEqual(recruitmentTiers("constructor"),[]);
  const foreign={overwatch:"challenger",valorant:"master",lol:"champion",pubg:"gm"};
  for(const slug of Object.keys(foreign)) await t.test(slug,async()=>{
    const game=await ok(f.service.from("games").select("id").eq("slug",slug).single());
    let clanId=f.clanId;
    if(slug!=="overwatch") {
      const clan=await ok(f.service.from("clans").insert({game_id:game.id,name:`Tiers-${slug}-${f.clanId.slice(0,6)}`}).select("id").single());
      clanId=clan.id; others.push(clanId);
      await ok(f.service.from("clan_members").insert({clan_id:clanId,user_id:f.users[0].id,role:"leader",status:"active"}));
    }
    const tiers=recruitmentTiers(slug).map(([id])=>id);
    await ok(owner.rpc("update_clan_recruitment",{p_clan_id:clanId,p_tiers:[...tiers].reverse()}));
    assert.deepEqual((await ok(f.service.from("clans").select("tier_range").eq("id",clanId).single())).tier_range,tiers);
    await denied(owner.rpc("update_clan_recruitment",{p_clan_id:clanId,p_tiers:[foreign[slug]]}));
    await denied(f.service.from("clans").update({tier_range:[foreign[slug]]}).eq("id",clanId));
    await denied(f.service.from("clans").insert({game_id:game.id,name:`Invalid-${slug}`,tier_range:[foreign[slug]]}));
    await ok(owner.rpc("update_clan_recruitment",{p_clan_id:clanId,p_tiers:[]}));
  });
  const legacy=await ok(f.service.from("clans").select("id,games!inner(slug)").eq("games.slug","overwatch").contains("tier_range",["challenger"]));
  assert.equal(legacy.length,0,"QA Overwatch's old Challenger values should have been migrated");
});
