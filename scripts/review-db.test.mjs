import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
async function denied(query) {
  const { error } = await query;
  assert.equal(error?.code, "42501", JSON.stringify(error));
}

test("review defects: direct API permissions, transactions and notification lifecycle", async (t) => {
  const users = [], clans = [], items = [];
  const tag = randomUUID().slice(0, 8);
  const gid = (await ok(svc.from("games").select("id").eq("slug", "overwatch").single())).id;
  t.after(async () => {
    const ids = users.map(u => u.id);
    if (ids.length) {
      await ok(svc.from("purchases").delete().in("user_id", ids));
      await ok(svc.from("coin_transactions").delete().in("created_by", ids).not("correction_of", "is", null));
      await ok(svc.from("coin_transactions").delete().in("created_by", ids));
      await ok(svc.from("lfg_posts").delete().in("creator_user_id", ids));
    }
    if (clans.length) await ok(svc.from("clans").delete().in("id", clans));
    if (items.length) await ok(svc.from("store_items").delete().in("id", items));
    for (const u of users) {
      const { error } = await svc.auth.admin.deleteUser(u.id);
      assert.equal(error, null, error?.message);
    }
  });
  for (let i = 0; i < 6; i++) {
    const email = `review-${tag}-${i}@clansync-qa.local`;
    const password = randomUUID() + "aA1!";
    const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { nickname: `rv_${tag}_${i}`, birth_year: 2000, coin_balance: 999999 } });
    assert.equal(error, null, error?.message);
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: data.user.id, email, client });
    await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, officer, member, outsider, applicant, selfInsert] = users;
  await ok(svc.from("user_game_profiles").insert(users.map(u => ({ user_id: u.id, game_id: gid,
    game_uid: `review:${u.id}`, is_verified: true, verified_at: new Date().toISOString() }))));
  async function clan(name, members, cap = 30) {
    const c = await ok(svc.from("clans").insert({ game_id: gid, name: `rv_${tag}_${name}`, max_members: cap }).select("id").single());
    clans.push(c.id);
    await ok(svc.from("clan_members").insert(members.map(([u, role]) => ({ clan_id: c.id, user_id: u.id, role, status: "active" }))));
    return c.id;
  }
  const cid = await clan("roles", [[leader, "leader"], [officer, "officer"], [member, "member"]]);
  await t.test("R01 service functions reject anon and every authenticated clan role", async () => {
    const calls = [
      ["apply_store_purchase", { p_actor_id: member.id, p_context_clan_id: cid, p_item_slug: "profile_entrance_fx", p_checkout_id: randomUUID() }],
      ["void_clan_store_purchase", { p_actor_id: leader.id, p_purchase_id: randomUUID(), p_reason: "review" }],
      ["void_personal_store_purchase", { p_actor_id: leader.id, p_context_clan_id: cid, p_purchase_id: randomUUID(), p_reason: "review" }],
      ["dispatch_inapp_notification_batch", { p_limit: 1 }],
      ["expire_open_lfg_posts_batch", { p_limit: 1 }],
      ["claim_discord_poll_notification_batch", { p_limit: 1 }],
      ["replace_event_inapp_notifications", { p_event_id: randomUUID(), p_schedule: [] }],
    ];
    for (const client of [anon, ...users.map(u => u.client)]) {
      for (const [name, args] of calls) await denied(client.rpc(name, args));
    }
    await ok(member.client.rpc("select_my_clan_membership", { p_clan_id: cid }));
    await ok(svc.rpc("dispatch_inapp_notification_batch", { p_limit: 1 }));
  });
  await t.test("R02 balance writes fail, signup/profile writes and purchase/refund preserve ledger", async () => {
    assert.equal((await ok(member.client.from("users").select("coin_balance").eq("id", member.id).single())).coin_balance, 0);
    await denied(member.client.from("users").update({ coin_balance: 999999 }).eq("id", member.id));
    await ok(member.client.from("users").update({ nickname: `rv_${tag}_edited`, auto_login: true }).eq("id", member.id));
    await ok(svc.from("users").delete().eq("id", selfInsert.id));
    const profile = { id: selfInsert.id, email: selfInsert.email, nickname: `rv_${tag}_self`, birth_year: 2000 };
    await denied(selfInsert.client.from("users").insert({ ...profile, coin_balance: 100 }));
    await ok(selfInsert.client.from("users").insert(profile));
    const item = await ok(svc.from("store_items").insert({ slug: `review-${tag}`, name_ko: "QA item",
      item_type: "profile_deco", pool_source: "personal", price_coins: 10 }).select("id,slug,price_coins").single());
    items.push(item.id);
    await ok(svc.from("users").update({ coin_balance: item.price_coins }).eq("id", member.id));
    const purchase = await ok(svc.rpc("apply_store_purchase", { p_actor_id: member.id, p_context_clan_id: cid, p_item_slug: item.slug, p_checkout_id: randomUUID() }));
    assert.equal(purchase.ok, true, JSON.stringify(purchase));
    assert.equal((await ok(svc.from("users").select("coin_balance").eq("id", member.id).single())).coin_balance, 0);
    const refund = await ok(svc.rpc("void_personal_store_purchase", { p_actor_id: leader.id, p_context_clan_id: cid, p_purchase_id: purchase.purchase_id, p_reason: "review regression" }));
    assert.equal(refund.ok, true, JSON.stringify(refund));
    assert.equal((await ok(svc.from("users").select("coin_balance").eq("id", member.id).single())).coin_balance, item.price_coins);
    const ledger = await ok(svc.from("coin_transactions").select("amount").eq("user_id", member.id));
    assert.equal(ledger.reduce((sum, r) => sum + r.amount, 0), 0);
  });
  await t.test("R03 game verification is server-only", async () => {
    await denied(member.client.from("user_game_profiles").update({ is_verified: true, game_uid: "forged" }).eq("user_id", member.id));
    await denied(selfInsert.client.from("user_game_profiles").insert({ user_id: selfInsert.id, game_id: gid, game_uid: "forged", is_verified: true }));
    await ok(svc.from("user_game_profiles").insert({ user_id: selfInsert.id, game_id: gid, game_uid: "server-proof", is_verified: true }));
  });
  await t.test("R04 member/settings reads have no recursive policy and outsiders see nothing", async () => {
    await ok(leader.client.from("clan_settings").update({ permissions: { kick_member: ["leader"] } }).eq("clan_id", cid));
    for (const u of [leader, officer, member]) {
      const rows = await ok(u.client.from("clan_members").select("id").eq("clan_id", cid));
      assert.equal(rows.length, 3);
      const settings = await ok(u.client.from("clan_settings").select("permissions").eq("clan_id", cid).single());
      assert.deepEqual(settings.permissions.kick_member, ["leader"]);
    }
    assert.deepEqual(await ok(outsider.client.from("clan_settings").select("clan_id").eq("clan_id", cid)), []);
    assert.deepEqual(await ok(outsider.client.from("clan_members").select("id").eq("clan_id", cid)), []);
  });
  await t.test("R05/R09 LFG transitions reject forgery and concurrent acceptance stays within capacity", async () => {
    const post = await ok(leader.client.from("lfg_posts").insert({ game_id: gid, creator_user_id: leader.id,
      mode: "review", format: "5vs5", slots: 1, start_time_hour: 20, expires_at: new Date(Date.now() + 86400000).toISOString(), mic_required: false }).select("id").single());
    await denied(member.client.from("lfg_applications").insert({ post_id: post.id, applicant_user_id: member.id, status: "accepted", resolved_at: new Date().toISOString() }));
    const a = await ok(member.client.rpc("apply_lfg_post", { p_post_id: post.id }));
    const b = await ok(officer.client.rpc("apply_lfg_post", { p_post_id: post.id }));
    await denied(member.client.from("lfg_applications").update({ status: "accepted", post_id: randomUUID(), resolved_at: new Date().toISOString() }).eq("id", a));
    await denied(member.client.rpc("resolve_lfg_application", { p_post_id: post.id, p_application_id: a, p_decision: "accepted" }));
    await ok(officer.client.rpc("resolve_lfg_application", { p_post_id: post.id, p_application_id: b, p_decision: "canceled" }));
    const c = await ok(officer.client.rpc("apply_lfg_post", { p_post_id: post.id }));
    const attempts = await Promise.all([a, c].map(id => leader.client.rpc("resolve_lfg_application", { p_post_id: post.id, p_application_id: id, p_decision: "accepted" })));
    assert.equal(attempts.filter(r => !r.error).length, 1);
    const statuses = await ok(svc.from("lfg_applications").select("status").eq("post_id", post.id));
    assert.equal(statuses.filter(r => r.status === "accepted").length, 1);
    assert.equal(statuses.filter(r => r.status === "applied").length, 0);
    assert.equal((await ok(svc.from("lfg_posts").select("status").eq("id", post.id).single())).status, "filled");
    assert.ok((await outsider.client.rpc("apply_lfg_post", { p_post_id: post.id })).error);
  });
  await t.test("R08 simultaneous approvals and cancellation cannot overfill or orphan membership", async () => {
    const capClan = await clan("capacity", [[leader, "leader"]], 2);
    const requests = [];
    for (const u of [outsider, applicant]) requests.push(await ok(u.client.from("clan_join_requests").insert({ user_id: u.id, game_id: gid, clan_id: capClan }).select("id,user_id").single()));
    const attempts = await Promise.all(requests.map(r => leader.client.rpc("resolve_clan_join_request", { p_clan_id: capClan, p_request_id: r.id, p_decision: "approved" })));
    assert.equal(attempts.filter(r => !r.error).length, 1);
    assert.equal((await ok(svc.from("clan_members").select("id").eq("clan_id", capClan).eq("status", "active"))).length, 2);
    const states = await ok(svc.from("clan_join_requests").select("id,status,user_id").eq("clan_id", capClan));
    const pending = states.find(r => r.status === "pending");
    await ok(leader.client.rpc("resolve_clan_join_request", { p_clan_id: capClan, p_request_id: pending.id, p_decision: "rejected", p_reason: "full" }));
    const approved = states.find(r => r.status === "approved");
    assert.ok((await leader.client.rpc("resolve_clan_join_request", { p_clan_id: capClan, p_request_id: approved.id, p_decision: "approved" })).error);
    const raceClan = await clan("cancel", [[leader, "leader"]], 2);
    const u = users.find(u => u.id === pending.user_id);
    const r = await ok(u.client.from("clan_join_requests").insert({ user_id: u.id, game_id: gid, clan_id: raceClan }).select("id").single());
    await Promise.all([
      leader.client.rpc("resolve_clan_join_request", { p_clan_id: raceClan, p_request_id: r.id, p_decision: "approved" }),
      u.client.from("clan_join_requests").update({ status: "canceled", resolved_by: u.id, resolved_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending"),
    ]);
    const state = (await ok(svc.from("clan_join_requests").select("status").eq("id", r.id).single())).status;
    const members = await ok(svc.from("clan_members").select("id").eq("clan_id", raceClan).eq("user_id", u.id));
    assert.equal(members.length, state === "approved" ? 1 : 0);
    assert.ok(["approved", "canceled"].includes(state));
  });
  await t.test("R06 schedule edits are atomic, repeat reservations replace, sent slots stay terminal", async () => {
    const id = randomUUID(), future = new Date(Date.now() + 172800000).toISOString();
    const event = { title: "before", kind: "event", start_at: future, repeat: "none", repeat_weekdays: null, repeat_time: null, place: null };
    const schedule = [{ instance_idx: 0, slot_kind: "event_t_0", scheduled_at: future }];
    const save = (e, slots, create = false) => svc.rpc("save_manual_clan_event", { p_clan_id: cid, p_actor_id: leader.id, p_event_id: id, p_event: e, p_schedule: slots, p_create: create });
    await ok(save(event, schedule, true));
    await ok(save({ ...event, title: "renamed" }, schedule));
    const list = () => ok(svc.from("notification_log").select("id,status,scheduled_at,instance_idx").eq("event_id", id));
    assert.equal((await list()).length, 3);
    const shifted = new Date(Date.now() + 259200000).toISOString();
    await ok(save({ ...event, start_at: shifted }, [{ ...schedule[0], scheduled_at: shifted }]));
    assert.ok((await list()).every(r => Date.parse(r.scheduled_at) === Date.parse(shifted)));
    assert.ok((await save({ ...event, title: "must-rollback" }, [{ ...schedule[0], slot_kind: "invalid" }])).error);
    assert.notEqual((await ok(svc.from("clan_events").select("title").eq("id", id).single())).title, "must-rollback");
    assert.ok((await list()).every(r => r.status === "scheduled"));
    await ok(save(event, [{ ...schedule[0], scheduled_at: new Date(Date.now() - 10000).toISOString() }]));
    await ok(svc.rpc("dispatch_inapp_notification_batch", { p_limit: 500 }));
    await ok(save({ ...event, title: "after-send" }, schedule));
    assert.ok((await list()).every(r => r.status === "sent"));
    const recurring = { ...event, repeat: "weekly", repeat_weekdays: [1], repeat_time: "11:00:00" };
    const slots = [1, 2].map(n => ({ ...schedule[0], instance_idx: Date.parse(future) + n * 604800000 }));
    await ok(save(recurring, slots));
    await ok(save({ ...recurring, title: "repeat-edit" }, slots.slice(1)));
    assert.equal((await list()).filter(r => r.status === "scheduled").length, 3);
    await ok(svc.from("clan_events").update({ cancelled_at: new Date().toISOString() }).eq("id", id));
    assert.equal((await list()).filter(r => r.status === "scheduled").length, 0);
  });
  await t.test("R06 scrim edits and reconfirmations reuse reservations without unique conflicts", async () => {
    const other = await clan("scrim", [[officer, "leader"]]);
    const room = await ok(svc.from("scrim_rooms").insert({ clan_a_id: cid, clan_b_id: other, created_by: leader.id,
      title: "review scrim", status: "matched", scheduled_at: new Date(Date.now() + 172800000).toISOString() }).select("id").single());
    async function confirm() {
      await ok(leader.client.from("scrim_room_confirmations").insert({ scrim_room_id: room.id, side: "host", confirmed_by: leader.id }));
      await ok(officer.client.from("scrim_room_confirmations").insert({ scrim_room_id: room.id, side: "guest", confirmed_by: officer.id }));
    }
    await confirm();
    await ok(svc.from("scrim_rooms").update({ title: "renamed" }).eq("id", room.id));
    await ok(svc.from("scrim_rooms").update({ scheduled_at: new Date(Date.now() + 259200000).toISOString() }).eq("id", room.id));
    await confirm();
    const events = await ok(svc.from("clan_events").select("id,cancelled_at").eq("scrim_id", room.id));
    assert.equal(events.length, 2);
    assert.ok(events.every(e => e.cancelled_at === null));
    const logs = await ok(svc.from("notification_log").select("id,status").in("event_id", events.map(e => e.id)));
    assert.equal(logs.length, 16);
    assert.ok(logs.every(r => r.status === "scheduled"));
  });
});
