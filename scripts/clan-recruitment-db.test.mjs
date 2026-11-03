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

test("clan inquiry is shared by current applicants and staff and closes individually on resolution", async t => {
  const f = await createIsolatedBalanceFixture(5);
  const clients = await Promise.all(f.users.map((_, i) => f.memberClient(i)));
  const [leader, officer, first, second, member] = clients;
  let otherId;
  t.after(async () => {
    await Promise.all(clients.map(client => client.auth.signOut()));
    if (otherId) await ok(f.service.from("clans").delete().eq("id", otherId));
    await f.cleanup();
  });
  const { clanId, gameId, service, users } = f;
  const inquiry = (client, body, id = clanId) => client.rpc("clan_inquiry", { p_clan_id: id, p_body: body });
  const notices = client => ok(client.from("notifications").select("id,recipient_user_id,read_at,payload")
    .eq("kind", "clan_inquiry_comment").eq("clan_id", clanId));
  const apply = i => ok(clients[i].from("clan_join_requests").insert({ clan_id: clanId, game_id: gameId, user_id: users[i].id }).select("id").single());
  const resolve = (request, decision) => ok(leader.rpc("resolve_clan_join_request", { p_clan_id: clanId, p_request_id: request.id, p_decision: decision }));
  const closed = async (client, id = clanId) => {
    assert.equal((await denied(inquiry(client, undefined, id))).code, "42501");
    assert.equal((await denied(inquiry(client, "차단 확인", id))).code, "42501");
  };

  await ok(service.from("clan_members").update({ role: "officer" }).eq("clan_id", clanId).eq("user_id", users[1].id));
  await ok(service.from("clan_members").delete().eq("clan_id", clanId).in("user_id", [users[2].id, users[3].id]));
  otherId = (await ok(service.from("clans").insert({ game_id: gameId, name: "Inquiry-" + clanId.slice(0, 8) }).select("id").single())).id;
  assert.deepEqual(await ok(inquiry(leader)), { messages: [] });
  await closed(member);
  await closed(second);
  await closed(officer, otherId);

  const firstRequest = await apply(2);
  await ok(inquiry(first, "안녕하세요"));
  assert.deepEqual((await notices(service)).map(n => n.recipient_user_id).sort(), [users[0].id, users[1].id].sort());
  const [firstNotice] = await notices(officer);
  assert.equal(firstNotice.read_at, null);
  assert.deepEqual(firstNotice.payload, {});
  const secondRequest = await apply(3);
  await ok(inquiry(officer, "첫 신청자에게 보낸 답변"));
  assert.deepEqual(await notices(second), []);
  const firstVisits = await Promise.all([ok(inquiry(second)), ok(inquiry(second))]);
  for (const visit of firstVisits) assert.deepEqual(visit.messages, []);
  const reply = await ok(inquiry(second, "두 번째 신청자입니다."));
  assert.deepEqual(reply.messages.map(m => [m.body, m.isMine]), [["두 번째 신청자입니다.", true]]);
  assert.equal(reply.messages[0].nickname, users[3].nickname);
  assert.ok(Number.isFinite(Date.parse(reply.messages[0].createdAt)));
  assert.ok(!("canDelete" in reply.messages[0]) && !("expires" in reply));
  await closed(second, otherId);
  for (const emoji of ["👍🏽", "🇰🇷", "3️⃣", "👨‍👩‍👧", `[e:${randomUUID()}]`]) {
    assert.equal((await denied(inquiry(second, "메시지 " + emoji))).code, "23514");
  }
  const staffReply = await ok(inquiry(officer, "#1 * 금요일 8시\n참여할게요!"));
  assert.equal(staffReply.messages.at(-1).authorId, users[1].id);
  assert.deepEqual((await ok(inquiry(first))).messages.map(m => m.id), staffReply.messages.map(m => m.id));
  const officerNotices = await notices(officer);
  assert.equal(officerNotices.length, 2);
  assert.ok(officerNotices.every(n => n.read_at !== null));
  assert.equal((await notices(second)).filter(n => n.read_at === null).length, 1);
  assert.deepEqual(await notices(member), []);
  assert.equal((await denied(officer.rpc("join_inquiry", { p_request: firstRequest.id, p_delete_id: reply.messages[0].id }))).code, "PGRST202");
  assert.equal((await denied(first.rpc("clan_inquiry", { p_clan_id: clanId, p_delete_id: reply.messages[0].id }))).code, "PGRST202");

  await resolve(firstRequest, "approved");
  await closed(first);
  assert.deepEqual((await ok(inquiry(second))).messages.map(m => m.id), [reply.messages[0].id, staffReply.messages.at(-1).id]);
  await resolve(secondRequest, "rejected");
  await closed(second);
  assert.equal((await ok(inquiry(officer))).messages.length, 4);
  const reapplied = await apply(3);
  const onReapplication = await ok(inquiry(second, "다시 신청했습니다."));
  assert.deepEqual(onReapplication.messages.map(m => m.body), ["다시 신청했습니다."]);
  await ok(second.from("clan_join_requests").update({ status: "canceled", resolved_by: users[3].id }).eq("id", reapplied.id));
  await closed(second);
  await ok(service.from("clan_members").update({ role: "member" }).eq("clan_id", clanId).eq("user_id", users[1].id));
  await closed(officer);
  assert.equal((await ok(inquiry(leader))).messages.length, 5);
  const existing = (await notices(service)).length;
  await ok(inquiry(leader, "권한 변경 후 확인"));
  assert.equal((await notices(service)).length, existing);
});

test("birth-year ranges are advisory for applications and approvals and validated in atomic promotion saves",async t=>{
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
  for(const index of [1,3]) {const request=await ok(apply(index));await cancel(index,request.id);}
  const pending=await ok(apply(2));
  await ok(save(2001,2004));
  await ok(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:pending.id,p_decision:"approved"}));
  assert.equal((await ok(svc.from("clan_members").select("status").eq("clan_id",f.clanId).eq("user_id",f.users[2].id).single())).status,"active");
  await denied(save(2001,1999));
  await denied(save(1949,null));
  await denied(save(null,new Date().getFullYear()));
  await denied(svc.from("clans").update({birth_year_from:2005,min_birth_year:2000}).eq("id",f.clanId));
  await denied(clients[1].rpc("update_clan_recruitment",{p_clan_id:f.clanId,p_birth_year_from:1950}));
  await ok(save(2000,null));await cancel(1,(await ok(apply(1))).id);
  await ok(save(null,2000));await cancel(3,(await ok(apply(3))).id);
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
  await denied(leader.rpc("save_clan_promotion",{...input,p_style:"casual",p_positions:["top"]}));
  await denied(leader.rpc("save_clan_promotion",{...input,p_style:"unknown",p_positions:["tank"]}));
  assert.equal((await ok(svc.from("board_posts").select("id").eq("id",postId))).length,0);
  const saved=(await ok(leader.rpc("save_clan_promotion",{...input,p_style:"casual",p_positions:["sup","tank"]})))[0];
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
  const audience = () => ok(svc.from("clans").select("style,recruitment_positions").eq("id",f.clanId).single());
  assert.deepEqual(await audience(),{style:"casual",recruitment_positions:["tank","sup"]},"Legacy editors retain the audience");
  await denied(leader.rpc("save_clan_promotion",{...input,p_expected_updated_at:saved.updated_at,p_title:"오래된 화면"}));
  assert.equal((await ok(svc.from("board_posts").select("title").eq("id",postId).single())).title,"수정한 모집");
  assert.equal((await ok(svc.from("clans").select("min_birth_year").eq("id",f.clanId).single())).min_birth_year,1999);
  const outcomes=await Promise.all(["동시 수정 A","동시 수정 B"].map(p_title=>officer.rpc("save_clan_promotion",{...input,p_expected_updated_at:changed.updated_at,p_title})));
  assert.equal(outcomes.filter(result=>!result.error).length,1,"Only one concurrent writer may use a revision");
  const latest = outcomes.find(result=>!result.error).data[0].updated_at;
  await ok(leader.rpc("save_clan_promotion",{...input,p_expected_updated_at:latest,p_style:"",p_positions:["tank","sup","dmg"]}));
  assert.deepEqual(await audience(),{style:null,recruitment_positions:[]});
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
  await t.test("officers can approve a pending application after tightening the birth-year preference",async()=>{
    staleId=(await ok(apply())).id;
    await ok(save(leader,1999));
    await ok(leader.rpc("resolve_clan_join_request",{p_clan_id:f.clanId,p_request_id:staleId,p_decision:"approved"}));
    assert.equal((await status(staleId)).status,"approved");
    await ok(applicant.rpc("change_clan_membership",{p_clan_id:f.clanId,p_action:"leave"}));
  });
  await t.test("gender preferences allow every gender to apply and be approved",async()=>{
    for (const preference of ["male","female"]) {
      await ok(save(leader,null,preference));
      for (const gender of ["undisclosed","male","female"]) {
        await ok(svc.from("users").update({gender}).eq("id",applicantId));
        const request=await ok(apply());
        await ok(leader.rpc("approve_clan_join_with_participant",{p_clan_id:f.clanId,p_request_id:request.id}));
        assert.equal((await status(request.id)).status,"approved");
        assert.equal((await ok(svc.from("clan_members").select("status").eq("clan_id",f.clanId).eq("user_id",applicantId).single())).status,"active");
        await ok(applicant.rpc("change_clan_membership",{p_clan_id:f.clanId,p_action:"leave"}));
      }
    }
    await ok(save(leader,null,"all")); await cancel((await ok(apply())).id);
  });
  await t.test("failed replacement preserves the pending request; success swaps once, and rejection remains possible",async()=>{
    const old=(await ok(apply(otherId))).id;
    await ok(save(leader,1999));
    await denied(applicant.rpc("replace_clan_join_request",{p_clan_id:randomUUID()}));
    assert.equal((await status(old)).status,"pending");
    await ok(save(leader,1999,"female",["gold"]));
    await ok(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId}));
    assert.equal((await status(old)).status,"canceled");
    const pending=await ok(svc.from("clan_join_requests").select("id,clan_id,status").eq("user_id",applicantId).eq("status","pending").single());
    assert.equal(pending.clan_id,f.clanId);
    assert.equal(pending.status,"pending");
    const rows=await ok(applicant.rpc("select_my_clan_join_requests"));
    assert.equal(rows.some(row=>"message" in row),false);
    assert.equal((await denied(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId,p_message:"legacy"}))).code,"PGRST202");
    await denied(applicant.rpc("replace_clan_join_request",{p_clan_id:f.clanId}));
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
  assert.deepEqual(recruitmentTiers("overwatch").slice(3,6).map(([tier])=>tier),["plat","emerald","diamond"]);
  assert.equal(recruitmentTierLabel("overwatch","emerald"),"에메랄드");
  assert.equal(recruitmentTierLabel("lol","challenger"),"챌린저");
  assert.equal(normalizeRecruitmentTier("lol","challenger"),"challenger");
  assert.deepEqual(recruitmentTiers("constructor"),[]);
  const foreign={overwatch:"challenger",valorant:"master",lol:"champion",deadlock:"gm"};
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
test("clan favorites belong to the viewer and lead filtered discovery results", async t => {
  const f = await createIsolatedBalanceFixture(2);
  t.after(() => f.cleanup());
  const owner = await f.memberClient(0);
  const other = await f.memberClient(1);
  const row = { user_id: f.users[0].id, clan_id: f.clanId };
  await denied(other.from("clan_favorites").insert(row));
  await ok(owner.from("clan_favorites").insert(row));
  assert.deepEqual(await ok(other.from("clan_favorites").select().eq("clan_id", f.clanId)), []);
  await ok(other.from("clan_favorites").delete().eq("clan_id", f.clanId));
  const filters = { p_game_id: f.gameId, p_seed: randomUUID(), p_query: "", p_style: "", p_tier: "", p_recommended: false };
  const first = await ok(owner.rpc("discover_clans", filters).order("is_favorite", { ascending: false }).order("shuffle_key").limit(1).single());
  assert.equal(first.clan_id, f.clanId);
  assert.equal(first.is_favorite, true);
  await ok(owner.from("clan_favorites").delete().eq("clan_id", f.clanId));
  assert.deepEqual(await ok(owner.from("clan_favorites").select().eq("clan_id", f.clanId)), []);
});
