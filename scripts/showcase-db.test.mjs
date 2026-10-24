import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const {data,error}=await query; assert.equal(error,null,error?.message); return data; }
test("showcases preserve inventory quantities across cabinets, revisions, permissions and legacy data",async t=>{
  const f=await createIsolatedBalanceFixture(2);
  const owner=await f.memberClient(0), other=await f.memberClient(1);
  t.after(async()=>{await owner.auth.signOut();await other.auth.signOut();await f.cleanup();});
  const env=loadTestEnv();
  const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const legacy=await ok(owner.rpc("get_my_housing"));
  const balance=(await ok(owner.from("users").select("coin_balance").eq("id",f.users[0].id).single())).coin_balance;
  // Explicit wire-format fixture keeps database checks independent of UI modules.
  const document={representative:"first",cabinets:[{id:"first",name:"나의 취향",template:"focus",background:"forest",items:[
    {id:"frame",catalogId:"mountain-frame",shelf:0,x:50,layer:0},
    {id:"keyboard",catalogId:"sage-keyboard",shelf:1,x:12,layer:0},
    {id:"fox",catalogId:"fox-figure",shelf:1,x:86,layer:1},
  ]}]};
  const save=(doc,revision,client=owner)=>client.rpc("save_showcase_library",{p_revision:revision,p_document:doc});
  assert.equal(await ok(save(document,-1)),0);
  const duplicate=structuredClone(document);
  duplicate.cabinets.push({...structuredClone(document.cabinets[0]),id:"second",name:"두 번째",items:[{id:"second-fox",catalogId:"fox-figure",shelf:1,x:50,layer:1}]});
  assert.match((await save(duplicate,0)).error.message,/SHOWCASE_NOT_OWNED/);
  assert.equal(await ok(owner.rpc("claim_showcase_product",{p_catalog_id:"fox-figure"})),1);
  assert.equal(await ok(save(duplicate,0)),1);
  const overlap=structuredClone(duplicate);
  overlap.cabinets[0].items[1].shelf=0;overlap.cabinets[0].items[1].x=50;overlap.cabinets[0].items[1].layer=2;
  const concurrent=await Promise.all([save(overlap,1),save(overlap,1)]);
  assert.equal(concurrent.filter(r=>!r.error).length,1);
  assert.match(concurrent.find(r=>r.error).error.message,/SHOWCASE_CONFLICT/);
  const invalid=structuredClone(overlap);invalid.cabinets[0].items[0].x=101;
  assert.match((await save(invalid,2)).error.message,/SHOWCASE_INVALID/);
  invalid.cabinets[0].items[0].x=50;invalid.cabinets[0].items[0].text={private:true};
  assert.match((await save(invalid,2)).error.message,/SHOWCASE_INVALID/);
  assert.equal((await ok(other.from("user_showcase_libraries").select("document").eq("user_id",f.users[0].id).single())).document.cabinets.length,2);
  assert.deepEqual(await ok(other.from("user_showcase_inventory").select("*").eq("user_id",f.users[0].id)),[]);
  assert.deepEqual(await ok(other.from("user_showcase_libraries").update({document,revision:3}).eq("user_id",f.users[0].id).select()),[]);
  assert.ok((await other.from("user_showcase_inventory").insert({user_id:f.users[0].id,catalog_id:"wood-label"})).error);
  assert.ok((await save(document,-1,anon)).error);
  assert.ok((await anon.from("user_showcase_libraries").select("*")).error);
  assert.ok((await owner.from("showcase_catalog").update({starter:true}).eq("id","wood-label")).error);
  const release=structuredClone(overlap);release.cabinets.splice(1,1);
  assert.equal(await ok(save(release,2)),3);
  assert.equal(await ok(save(overlap,3)),4);
  const styled=structuredClone(overlap);styled.cabinets[0].template="offset";
  assert.match((await save(styled,4)).error.message,/SHOWCASE_TEMPLATE_NOT_OWNED/);
  assert.match((await owner.from("user_showcase_libraries").update({document:styled,revision:5}).eq("user_id",f.users[0].id)).error.message,/SHOWCASE_TEMPLATE_NOT_OWNED/);
  assert.equal(await ok(owner.rpc("claim_showcase_product",{p_catalog_id:"shelf-offset"})),1);
  assert.equal(await ok(owner.rpc("claim_showcase_product",{p_catalog_id:"shelf-offset"})),1);
  styled.cabinets[1].template="offset";
  assert.equal(await ok(save(styled,4)),5);
  const badItem=structuredClone(styled);
  badItem.cabinets[0].items.push({id:"not-a-good",catalogId:"shelf-offset",shelf:0,x:50,layer:0});
  assert.match((await save(badItem,5)).error.message,/SHOWCASE_INVALID/);
  const steps=structuredClone(styled);steps.cabinets[0].template="steps";
  assert.match((await save(steps,5)).error.message,/SHOWCASE_TEMPLATE_NOT_OWNED/);
  assert.equal(await ok(owner.rpc("claim_showcase_product",{p_catalog_id:"shelf-steps"})),1);
  assert.equal(await ok(save(steps,5)),6);
  assert.equal((await ok(owner.from("users").select("coin_balance").eq("id",f.users[0].id).single())).coin_balance,balance);
  assert.deepEqual(await ok(owner.rpc("get_my_housing")),legacy);
});
