import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {loadTestEnv} from './test-env.mjs';
const env=loadTestEnv(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
async function ok(query){const {data,error}=await query;assert.equal(error,null,error?.message);return data;}
test('coaching enrollment, assignment, limited coach authority and participant notifications',async t=>{
  const users=[],clans=[];
  t.after(async()=>{for(const id of clans)await ok(service.from('clans').delete().eq('id',id));for(const u of users){await u.client.auth.signOut();await ok(service.auth.admin.deleteUser(u.id));}});
  const tag=randomUUID().slice(0,8),game=await ok(service.from('games').select('id').eq('slug','overwatch').single());
  for(let i=0;i<5;i++){
    const email=`coaching-${tag}-${i}@clansync-qa.local`,password=randomUUID()+'aA1!';
    const {user}=await ok(service.auth.admin.createUser({email,password,email_confirm:true,user_metadata: { birth_year:2000}}));
    const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
    users.push({id:user.id,client});await ok(client.auth.signInWithPassword({email,password}));
  }
  const [,requester,coach,peer,outsider]=users;
  for(let i=0;i<2;i++){const c=await ok(service.from('clans').insert({game_id:game.id,name:`Coaching-${tag}-${i}`}).select('id').single());clans.push(c.id);}
  const clan=clans[0];
  await ok(service.from('clan_members').insert(users.map((u,i)=>({clan_id:i===4?clans[1]:clan,user_id:u.id,role:i===0||i===4?'leader':'member',status:'active'}))));
  await t.test('members enroll only themselves; outsiders and immutable identity changes are denied',async()=>{
    await ok(coach.client.from('clan_board_coaches').insert({clan_id:clan,expertise:'지원 · 아나',bio:'위치 선정 함께 봐요.'}));
    assert.ok((await requester.client.from('clan_board_coaches').insert({clan_id:clan,user_id:peer.id,expertise:'위조'})).error);
    assert.ok((await outsider.client.from('clan_board_coaches').insert({clan_id:clan,expertise:'외부'})).error);
    assert.deepEqual(await ok(outsider.client.from('clan_board_coaches').select('*').eq('clan_id',clan)),[]);
    assert.deepEqual(await ok(requester.client.from('clan_board_coaches').update({bio:'변조'}).eq('clan_id',clan).select()),[]);
    assert.ok((await coach.client.from('clan_board_coaches').update({user_id:peer.id}).eq('clan_id',clan)).error);
  });
  const request=await ok(requester.client.from('clan_board_posts').insert({clan_id:clan,kind:'feedback',coach_id:coach.id,title:'아나 코칭 신청',content:'위치를 봐 주세요.',details:{role:'아나',replay:'ABC123'}}).select('*').single());
  await t.test('assignment needs an active accepting teacher; teacher can change status only',async()=>{
    const notices=await ok(coach.client.from('notifications').select('kind,payload').eq('source_id',request.id));
    assert.equal(notices.length,1);assert.equal(notices[0].kind,'coaching_requested');assert.equal(notices[0].payload.post_id,request.id);
    assert.equal((await ok(requester.client.from('notifications').select('id').eq('source_id',request.id))).length,0);
    assert.equal((await ok(coach.client.from('clan_board_posts').update({status:'answering'}).eq('id',request.id).select('status').single())).status,'answering');
    assert.ok((await coach.client.from('clan_board_posts').update({content:'덮어쓰기'}).eq('id',request.id)).error);
    assert.deepEqual(await ok(coach.client.from('clan_board_posts').delete().eq('id',request.id).select()),[]);
    assert.deepEqual(await ok(peer.client.from('clan_board_posts').update({status:'complete'}).eq('id',request.id).select()),[]);
    assert.ok((await requester.client.from('clan_board_posts').insert({clan_id:clan,kind:'feedback',coach_id:peer.id,title:'미등록 선생님'})).error);
    assert.ok((await coach.client.from('clan_board_posts').insert({clan_id:clan,kind:'feedback',coach_id:coach.id,title:'본인 신청'})).error);
    await ok(coach.client.from('clan_board_coaches').update({accepting:false}).eq('clan_id',clan));
    assert.ok((await requester.client.from('clan_board_posts').insert({clan_id:clan,kind:'feedback',coach_id:coach.id,title:'중단 중 신청'})).error);
    await ok(coach.client.from('clan_board_posts').update({status:'complete'}).eq('id',request.id));
  });
  await t.test('comments notify active requester, teacher and earlier participants once, excluding sender',async()=>{
    async function comment(actor,content){return ok(actor.client.from('clan_board_comments').insert({post_id:request.id,content}).select('id').single());}
    const one=await comment(requester,'추가 질문');
    let recipients=await ok(service.from('notifications').select('recipient_user_id').eq('source_id',one.id));
    assert.deepEqual(recipients.map(r=>r.recipient_user_id),[coach.id]);
    const two=await comment(coach,'다음 엄폐물로 이동하세요.');
    recipients=await ok(service.from('notifications').select('recipient_user_id').eq('source_id',two.id));
    assert.deepEqual(recipients.map(r=>r.recipient_user_id),[requester.id]);
    await comment(peer,'저도 이 장면이 궁금해요.');
    const four=await comment(requester,'확인했습니다.');
    recipients=await ok(service.from('notifications').select('recipient_user_id').eq('source_id',four.id));
    assert.deepEqual(new Set(recipients.map(r=>r.recipient_user_id)),new Set([coach.id,peer.id]));assert.equal(recipients.length,2);
    await ok(service.from('clan_members').update({status:'left'}).eq('clan_id',clan).eq('user_id',peer.id));
    const five=await comment(coach,'다음 리플레이도 같이 봐요.');
    recipients=await ok(service.from('notifications').select('recipient_user_id').eq('source_id',five.id));
    assert.deepEqual(recipients.map(r=>r.recipient_user_id),[requester.id]);
    await ok(coach.client.from('clan_board_comments').update({content:'댓글 정정'}).eq('id',five.id));
    assert.equal((await ok(service.from('notifications').select('id').eq('source_id',five.id))).length,1);
    assert.deepEqual(await ok(outsider.client.from('clan_board_posts').select('*').eq('id',request.id)),[]);
    await ok(service.from('clan_members').update({status:'left'}).eq('clan_id',clan).eq('user_id',coach.id));
    assert.deepEqual(await ok(requester.client.from('clan_board_coaches').select('*').eq('clan_id',clan)),[]);
    assert.deepEqual(await ok(coach.client.from('clan_board_posts').update({status:'requested'}).eq('id',request.id).select()),[]);
  });
});
