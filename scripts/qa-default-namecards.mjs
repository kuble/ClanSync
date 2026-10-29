import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";
import { FIXTURE_PASSWORD, QA_SEED_ACCOUNTS, qaFixtureEmail } from "./fixtures/qa-fixtures.mjs";

const env=loadTestEnv();
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function ok(query){const {data,error}=await query;if(error)throw error;return data;}
const emails=QA_SEED_ACCOUNTS.map(a=>qaFixtureEmail(a.rolePascal,a.numbering).toLowerCase());
const users=await ok(db.from("users").select("id,email,coin_balance").in("email",emails));
assert.equal(users.length,14,"Expected the exact QA fixture roster");
const catalog=await ok(db.from("nameplate_options").select("id,category,code").eq("is_active",true).eq("unlock_source","default").eq("price_coins",0));
const backgroundsOnly=process.argv.includes("--backgrounds-only");
const categories=backgroundsOnly?["namebar"]:["emblem","portrait","namebar","frame","sub"];
const rows=users.flatMap(user=>categories.map(category=>{
  const choices=catalog.filter(item=>item.category===category&&(!backgroundsOnly||item.code.startsWith("background-normal-")));
  assert(choices.length>0,`Missing default ${category}`);
  return {user_id:user.id,category,option_id:choices[randomInt(choices.length)].id};
}));
console.log(JSON.stringify({apply:process.argv.includes("--apply"),users:users.length,selections:rows.length}));
if(process.argv.includes("--apply")){
  const inventory=await ok(db.from("user_nameplate_inventory").select("user_id,option_id").in("user_id",users.map(u=>u.id)).order("user_id").order("option_id"));
  const previous=await ok(db.from("user_namecard_selections").select("user_id,category,option_id").in("user_id",users.map(u=>u.id)));
  for(const user of users){
    const owner=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const session=await owner.auth.signInWithPassword({email:user.email,password:FIXTURE_PASSWORD});
    if(session.error)throw session.error;
    assert.equal(session.data.user.id,user.id);
    await ok(owner.from("user_namecard_selections").upsert(rows.filter(row=>row.user_id===user.id),{onConflict:"user_id,category"}));
    await owner.auth.signOut({scope:"local"});
  }
  assert.deepEqual(await ok(db.from("users").select("id,email,coin_balance").in("email",emails).order("id")),[...users].sort((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual(await ok(db.from("user_nameplate_inventory").select("user_id,option_id").in("user_id",users.map(u=>u.id)).order("user_id").order("option_id")),inventory);
  const saved=await ok(db.from("user_namecard_selections").select("user_id,category,option_id").in("user_id",users.map(u=>u.id)));
  for(const row of rows)assert(saved.some(item=>item.user_id===row.user_id&&item.category===row.category&&item.option_id===row.option_id));
  for(const row of previous.filter(item=>!categories.includes(item.category)))assert(saved.some(item=>item.user_id===row.user_id&&item.category===row.category&&item.option_id===row.option_id));
  console.log(JSON.stringify({verified:saved.length,symbols:rows.filter(r=>r.category==="emblem").map(r=>catalog.find(c=>c.id===r.option_id).code)}));
}
