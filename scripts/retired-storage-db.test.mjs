import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";
import { loadTestEnv } from "./test-env.mjs";

async function ok(query) { const {data,error}=await query; assert.equal(error,null,error?.message); return data; }

test("retired tables and RPCs are absent even to the service role",async()=>{
  const env=loadTestEnv();
  const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  for(const table of ["showcase_catalog","user_showcase_inventory","user_showcase_libraries","profile_visibility","clan_notification_secrets","badges","user_badge_unlocks","user_badge_picks","user_nameplate_selections","housing_catalog","user_housing_rooms","user_housing_inventory"]){
    const {error}=await db.from(table).select("*").limit(1);
    assert.ok(["PGRST205","42P01"].includes(error?.code),`${table}: ${JSON.stringify(error)}`);
  }
  for(const [name,args] of [
    ["get_my_housing",{}],
    ["purchase_housing_furniture",{p_catalog_id:"small-plant"}],
    ["save_my_housing_room",{p_revision:0,p_wallpaper:"cream",p_floor:"oak",p_placements:[]}],
    ["save_showcase_library",{p_revision:-1,p_document:{}}],
    ["claim_showcase_product",{p_catalog_id:"fox-figure"}],
    ["save_my_badge_picks",{p_game_id:randomUUID(),p_ordered_badge_ids:[]}],
    ["claim_discord_poll_notification_batch",{p_limit:1}],
    ["finalize_discord_notification_dispatch",{p_log_id:randomUUID(),p_ok:true,p_error:null}],
    ["set_clan_notification_settings",{p_clan_id:randomUUID(),p_enabled:true,p_url:"https://discord.com/api/webhooks/123/retired"}],
  ])assert.equal((await db.rpc(name,args)).error?.code,"PGRST202",name);
});

test("personal refunds and inventory revocation preserve another player's namecard",async t=>{
  const f=await createIsolatedBalanceFixture(2);
  const member=await f.memberClient(1),buyer=f.users[1].id;
  let itemId, frameId;
  t.after(async()=>{
    await ok(f.service.from("purchases").delete().eq("user_id",buyer));
    await ok(f.service.from("coin_transactions").delete().eq("user_id",buyer).not("correction_of","is",null));
    await ok(f.service.from("coin_transactions").delete().eq("user_id",buyer));
    await member.auth.signOut();await f.cleanup();
    if(frameId)await ok(f.service.from("nameplate_options").delete().eq("id",frameId));
    if(itemId)await ok(f.service.from("store_items").delete().eq("id",itemId));
  });
  const item=await ok(f.service.from("store_items").insert({slug:"refund-"+randomUUID(),name_ko:"검증용 상품",item_type:"profile_deco",pool_source:"personal",price_coins:10}).select("id,slug,price_coins").single());itemId=item.id;
  await ok(f.service.from("users").update({coin_balance:item.price_coins}).eq("id",buyer));
  const purchase=await ok(f.service.rpc("apply_store_purchase",{p_actor_id:buyer,p_context_clan_id:f.clanId,p_item_slug:item.slug,p_checkout_id:randomUUID()}));
  assert.equal(purchase.ok,true,JSON.stringify(purchase));
  const frame=await ok(f.service.from("nameplate_options").insert({game_id:f.gameId,category:"frame",code:"qa-frame-"+randomUUID(),name_ko:"검증용 프레임",unlock_source:"store"}).select("id").single());frameId=frame.id;
  await ok(f.service.from("user_nameplate_inventory").insert({user_id:buyer,option_id:frame.id}));
  await ok(member.from("user_namecard_selections").upsert({user_id:buyer,category:"frame",option_id:frame.id}));
  const unchanged=await ok(f.service.from("user_namecard_selections").select("*").eq("user_id",f.users[0].id));
  const refund=await ok(f.service.rpc("void_personal_store_purchase",{p_actor_id:f.users[0].id,p_context_clan_id:f.clanId,p_purchase_id:purchase.purchase_id,p_reason:"retired storage regression"}));
  assert.equal(refund.ok,true,JSON.stringify(refund));
  await ok(f.service.from("user_nameplate_inventory").delete().eq("user_id",buyer).eq("option_id",frame.id));
  assert.deepEqual(await ok(member.from("user_namecard_selections").select("option_id").eq("category","frame")),[]);
  assert.deepEqual(await ok(member.from("user_nameplate_inventory").select("option_id").eq("option_id",frame.id)),[]);
  assert.deepEqual(await ok(f.service.from("user_namecard_selections").select("*").eq("user_id",f.users[0].id)),unchanged);
  assert.equal((await ok(f.service.from("users").select("coin_balance").eq("id",buyer).single())).coin_balance,item.price_coins);
  const ledger=await ok(f.service.from("coin_transactions").select("amount").eq("user_id",buyer));
  assert.equal(ledger.reduce((sum,row)=>sum+row.amount,0),0);
  const duplicate=await ok(f.service.rpc("void_personal_store_purchase",{p_actor_id:f.users[0].id,p_context_clan_id:f.clanId,p_purchase_id:purchase.purchase_id,p_reason:"duplicate refund check"}));
  assert.equal(duplicate.ok,false);assert.equal(duplicate.error,"already_voided");
});
