import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env=loadTestEnv(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
async function ok(query){const {data,error}=await query;assert.equal(error,null,error?.message);return data;}

test("clan boards, comments, images and badges isolate actors and clans",async t=>{
  const users=[],clans=[],images=[];
  t.after(async()=>{
    if(images.length)await ok(service.storage.from("clan-board-images").remove(images));
    for(const clan of clans)await ok(service.from("clans").delete().eq("id",clan));
    for(const user of users){await user.client.auth.signOut();await ok(service.auth.admin.deleteUser(user.id));}
  });
  const tag=randomUUID().slice(0,8);
  for(let i=0;i<4;i++){
    const email="board-"+tag+"-"+i+"@clansync-qa.local",password=randomUUID()+"aA1!";
    const {user}=await ok(service.auth.admin.createUser({email,password,email_confirm:true,user_metadata: { birth_year:2000}}));
    const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
    await ok(client.auth.signInWithPassword({email,password}));users.push({id:user.id,client});
  }
  const [leader,author,peer,outsider]=users;
  const game=await ok(service.from("games").select("id").eq("slug","overwatch").single());
  for(let i=0;i<2;i++){const c=await ok(service.from("clans").insert({game_id:game.id,name:"BoardDB-"+tag+"-"+i}).select("id").single());clans.push(c.id);}
  const [clanId,otherClan]=clans;
  await ok(service.from("clan_members").insert([
    {clan_id:clanId,user_id:leader.id,role:"leader",status:"active"},
    {clan_id:clanId,user_id:author.id,role:"member",status:"active"},
    {clan_id:clanId,user_id:peer.id,role:"member",status:"active"},
    {clan_id:otherClan,user_id:outsider.id,role:"leader",status:"active"},
  ]));
  const post=await ok(author.client.from("clan_board_posts").insert({clan_id:clanId,kind:"free",title:"일상",content:"함께한 이야기"}).select("*").single());
  assert.equal(post.author_id,author.id);
  await t.test("member reads, outsider and anonymous cannot; immutable identifiers stay protected",async()=>{
    assert.equal((await ok(peer.client.from("clan_board_posts").select("id").eq("clan_id",clanId))).length,1);
    assert.deepEqual(await ok(outsider.client.from("clan_board_posts").select("id").eq("clan_id",clanId)),[]);
    assert.ok((await anon.from("clan_board_posts").select("id")).error);
    for(const client of [peer.client,outsider.client]){
      assert.deepEqual(await ok(client.from("clan_board_posts").update({title:"침범"}).eq("id",post.id).select("id")),[]);
      assert.deepEqual(await ok(client.from("clan_board_posts").delete().eq("id",post.id).select("id")),[]);
    }
    for(const change of [{author_id:peer.id},{clan_id:otherClan},{kind:"memories"},{created_at:new Date().toISOString()}])assert.ok((await author.client.from("clan_board_posts").update(change).eq("id",post.id)).error);
    assert.ok((await outsider.client.from("clan_board_posts").insert({clan_id:clanId,kind:"free",title:"침범",content:"외부"})).error);
    assert.ok((await author.client.from("clan_board_posts").insert({clan_id:clanId,kind:"memories",title:"사진 없음",content:"한마디"})).error);
  });
  await t.test("comment ownership is independent of post ownership and reactions are idempotent",async()=>{
    const comment=await ok(peer.client.from("clan_board_comments").insert({post_id:post.id,content:"좋아요"}).select("*").single());
    assert.equal(comment.author_id,peer.id);
    assert.deepEqual(await ok(author.client.from("clan_board_comments").update({content:"변경"}).eq("id",comment.id).select("id")),[]);
    assert.deepEqual(await ok(author.client.from("clan_board_comments").delete().eq("id",comment.id).select("id")),[]);
    await ok(peer.client.from("clan_board_comments").update({content:"본인 편집"}).eq("id",comment.id));
    assert.ok((await outsider.client.from("clan_board_comments").insert({post_id:post.id,content:"침범"})).error);
    await ok(author.client.from("clan_board_reactions").insert({post_id:post.id}));
    assert.equal((await author.client.from("clan_board_reactions").insert({post_id:post.id})).error?.code,"23505");
    assert.ok((await author.client.from("clan_board_reactions").insert({post_id:post.id,user_id:peer.id})).error);
    assert.deepEqual(await ok(peer.client.from("clan_board_reactions").delete().eq("post_id",post.id).select("*")),[]);
    await ok(leader.client.from("clan_board_comments").delete().eq("id",comment.id));
  });
  await t.test("private photos deny outsiders, protect attached files, and deny departed owners",async()=>{
    const path=clanId+"/"+author.id+"/"+post.id+"/"+randomUUID()+".png";images.push(path);
    const pixels=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO94AAAAASUVORK5CYII=","base64");
    await ok(author.client.storage.from("clan-board-images").upload(path,pixels,{contentType:"image/png"}));
    await ok(author.client.from("clan_board_posts").update({image_path:path}).eq("id",post.id));
    assert.ok(await ok(peer.client.storage.from("clan-board-images").download(path)));
    assert.ok((await outsider.client.storage.from("clan-board-images").download(path)).error);
    await author.client.storage.from("clan-board-images").remove([path]);
    assert.ok(await ok(service.storage.from("clan-board-images").download(path)));
    assert.ok((await author.client.from("clan_board_posts").update({image_path:otherClan+"/"+author.id+"/"+post.id+"/"+randomUUID()+".png"}).eq("id",post.id)).error);
    await ok(service.from("clan_members").update({status:"left"}).eq("clan_id",clanId).eq("user_id",author.id));
    assert.deepEqual(await ok(author.client.from("clan_board_posts").select("id").eq("id",post.id)),[]);
    assert.ok((await author.client.storage.from("clan-board-images").download(path)).error);
    assert.ok((await author.client.from("clan_board_comments").insert({post_id:post.id,content:"탈퇴 뒤 댓글"})).error);
    await ok(service.from("clan_members").update({status:"active"}).eq("clan_id",clanId).eq("user_id",author.id));
    assert.equal((await ok(author.client.from("clan_board_posts").delete().eq("id",post.id).select("id"))).length,1);
    assert.equal((await ok(author.client.storage.from("clan-board-images").remove([path]))).length,1);
    assert.equal((await ok(service.storage.from("clan-board-images").list(path.slice(0,path.lastIndexOf("/"))))).length,0);
  });
  await t.test("awards cannot be forged; officers feature earned badges and own seen states stay isolated",async()=>{
    for(const client of [author.client,leader.client])assert.ok((await client.from("clan_badge_awards").insert({clan_id:clanId,badge_key:"forged"})).error);
    await ok(service.from("clan_badge_awards").insert({clan_id:clanId,badge_key:"founding",earned_at:new Date().toISOString()}));
    assert.deepEqual(await ok(outsider.client.from("clan_badge_awards").select("*").eq("clan_id",clanId)),[]);
    assert.ok((await author.client.from("clan_badge_featured").insert({clan_id:clanId,badge_keys:["founding"]})).error);
    await ok(leader.client.from("clan_badge_featured").insert({clan_id:clanId,badge_keys:["founding"]}));
    for(const keys of [["unknown"],["founding","founding"],["a","b","c","d"]])assert.ok((await leader.client.from("clan_badge_featured").update({badge_keys:keys}).eq("clan_id",clanId)).error);
    await ok(leader.client.from("clan_badge_featured").update({badge_keys:[]}).eq("clan_id",clanId));
    assert.ok((await leader.client.from("clan_badge_featured").update({clan_id:otherClan}).eq("clan_id",clanId)).error);
    await ok(author.client.from("clan_badge_seen").insert({clan_id:clanId,user_id:author.id}));
    await ok(author.client.from("clan_badge_seen").update({seen_at:new Date().toISOString()}).eq("clan_id",clanId).eq("user_id",author.id));
    assert.deepEqual(await ok(peer.client.from("clan_badge_seen").select("*").eq("clan_id",clanId)),[]);
    assert.ok((await peer.client.from("clan_badge_seen").insert({clan_id:clanId,user_id:author.id})).error);
  });
});
