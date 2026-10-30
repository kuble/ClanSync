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

test("auction item catalog isolates clans and limits writes to active officers", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  const clanIds = [];
  t.after(async () => {
    for (const id of clanIds) await ok(svc.from("balance_sessions").delete().eq("clan_id", id));
    for (const id of clanIds) await ok(svc.from("clans").delete().eq("id", id));
    for (const user of users) {
      await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });

  for (const role of ["leader", "officer", "member", "outsider"]) {
    const email = `auction-item-${role}-${tag}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { birth_year: 2000 } }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client, role });
    await ok(client.auth.signInWithPassword({ email, password }));
  }

  const [leader, officer, member, outsider] = users;
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  for (const label of ["A", "B"]) {
    const clan = await ok(svc.from("clans").insert({ game_id: game.id, name: `Item${label}-${tag}` }).select("id").single());
    clanIds.push(clan.id);
  }
  const [clanId, otherClanId] = clanIds;
  await ok(svc.from("clan_members").insert(users.map((user) => ({ clan_id: user.role === "outsider" ? otherClanId : clanId, user_id: user.id, role: user.role === "outsider" ? "leader" : user.role, status: "active" }))));
  const defaults = await ok(leader.client.from("clan_auction_items").select("name,cost,enabled,description").eq("clan_id", clanId).order("cost"));
  assert.deepEqual(defaults.map(({name,cost,enabled}) => ({name,cost,enabled})), [
    {name:"맵 선정권",cost:50,enabled:true}, {name:"영웅 밴 카드 1장",cost:100,enabled:true}, {name:"영웅 밴 카드 2장",cost:300,enabled:true},
  ]);
  assert.ok(defaults.every((item) => item.description.length > 10));
  await ok(leader.client.from("clan_auction_items").delete().eq("clan_id",clanId));
  await ok(svc.from("clans").update({name:`Updated-${tag}`}).eq("id",clanId));
  assert.deepEqual(await ok(leader.client.from("clan_auction_items").select("id").eq("clan_id",clanId)), []);
  const values = { clan_id: clanId, name: "맵 선정권", description: "경기 시작 전에 맵을 선택합니다.", cost: 100, enabled: true };

  assert.ok((await anon.from("clan_auction_items").select("id")).error);
  for (const actor of [member, outsider]) {
    assert.ok((await actor.client.from("clan_auction_items").insert(values)).error);
  }
  const created = await ok(leader.client.from("clan_auction_items").insert(values).select("id,updated_at").single());
  assert.equal((await ok(member.client.from("clan_auction_items").select("id").eq("clan_id", clanId))).length, 1);
  assert.deepEqual(await ok(outsider.client.from("clan_auction_items").select("id").eq("clan_id", clanId)), []);
  for (const actor of [member, outsider]) {
    assert.deepEqual(await ok(actor.client.from("clan_auction_items").update({ cost: 0 }).eq("id", created.id).select("id")), []);
    assert.deepEqual(await ok(actor.client.from("clan_auction_items").delete().eq("id", created.id).select("id")), []);
  }
  const updated = await ok(officer.client.from("clan_auction_items").update({ cost: 200, enabled: false }).eq("id", created.id).select("cost,enabled,updated_at").single());
  assert.equal(updated.cost, 200);
  assert.equal(updated.enabled, false);
  assert.ok(Date.parse(updated.updated_at) >= Date.parse(created.updated_at));
  // Immutable identity/clan/timestamps cannot be overwritten through the API.
  assert.ok((await leader.client.from("clan_auction_items").update({ clan_id: otherClanId }).eq("id", created.id)).error);
  assert.ok((await leader.client.from("clan_auction_items").update({ created_at: new Date().toISOString() }).eq("id", created.id)).error);
  for (const change of [{ cost: -10 }, { cost: 15 }, { cost: 100010 }, { name: " " }, { name: "x".repeat(81) }, { description: "x".repeat(501) }]) {
    assert.ok((await officer.client.from("clan_auction_items").update(change).eq("id", created.id)).error, JSON.stringify(change));
  }
  const second = await ok(officer.client.from("clan_auction_items").insert({ ...values, name: "무료 선택권", cost: 0 }).select("id").single());
  assert.ok((await leader.client.from("clan_auction_items").insert(values)).error);
  assert.equal((await ok(officer.client.from("clan_auction_items").delete().eq("id", second.id).select("id"))).length, 1);

  await ok(svc.from("clan_members").update({ status: "left" }).eq("clan_id", clanId).eq("user_id", officer.id));
  assert.deepEqual(await ok(officer.client.from("clan_auction_items").select("id").eq("clan_id", clanId)), []);
  assert.ok((await officer.client.from("clan_auction_items").insert({ ...values, name: "퇴장 후 추가" })).error);
  assert.deepEqual(await ok(officer.client.from("clan_auction_items").update({ cost: 0 }).eq("id", created.id).select("id")), []);
  assert.deepEqual(await ok(officer.client.from("clan_auction_items").delete().eq("id", created.id).select("id")), []);
  assert.equal((await ok(leader.client.from("clan_auction_items").delete().eq("id", created.id).select("id"))).length, 1);

  await t.test("flash hosts configure room items without changing shared defaults or other rooms", async () => {
    const shared = await ok(leader.client.from("clan_auction_items").insert(values).select("id,name,description,cost,enabled").single());
    const createRoom = (client, kind) => ok(client.rpc("create_balance_room", { p_clan_id: clanId, p_kind: kind, p_title: `Item-${kind}-${tag}` }));
    const flash = await createRoom(member.client, "flash");
    const regular = await createRoom(leader.client, "regular");
    const read = (series) => ok(svc.from("balance_sessions").select("*").eq("series_id", series).is("closed_at", null).single());
    const save = async (catalog, client = member.client, series = flash.series_id, revision) => {
      const row = await read(series);
      return client.rpc("set_balance_prematch_settings", {
        p_round_id: row.id, p_clan_id: clanId, p_revision: revision ?? row.formation_revision,
        p_settings: { ...row.formation_settings, auctionCatalog: catalog },
        p_map_ban: row.map_ban_enabled, p_hero_ban: row.hero_ban_enabled,
        p_map_ban_seconds: row.map_ban_seconds, p_hero_ban_seconds: row.hero_ban_seconds,
        p_hero_bans_per_team: row.hero_bans_per_team, p_map_types: row.map_types,
      });
    };
    const item = { id: randomUUID(), name: "깜짝 전용", description: "이 방에서만 사용", cost: 70, enabled: true };
    const catalog = { excludedItemIds: [shared.id], items: [item] };
    const before = await read(flash.series_id);
    assert.equal(await ok(save(catalog)), true);
    assert.deepEqual((await read(flash.series_id)).formation_settings.auctionCatalog, catalog);
    assert.equal(await ok(save({ ...catalog, items: [] }, member.client, flash.series_id, before.formation_revision)), false);
    assert.ok((await save(catalog, outsider.client)).error);
    assert.ok((await save(catalog, leader.client, regular.series_id)).error);
    for (const invalid of [null, {}, { ...catalog, items: [{ ...item, cost: 15 }] }, { ...catalog, items: [{ ...item, id: shared.id }] },
      { ...catalog, items: [item, item] }, { ...catalog, excludedItemIds: ["invalid"] }, { ...catalog, items: [{ ...item, name: " " }] },
      { ...catalog, items: Array.from({ length: 31 }, (_, n) => ({ ...item, id: randomUUID(), name: `item${n}` })) }]) {
      assert.ok((await save(invalid)).error, JSON.stringify(invalid));
    }
    const second = await createRoom(member.client, "flash");
    assert.equal((await read(second.series_id)).formation_settings.auctionCatalog, undefined);
    await ok(svc.from("clan_members").update({ role: "member", status: "active" }).eq("clan_id", clanId).eq("user_id", officer.id));
    const hostRound = await read(flash.series_id);
    assert.equal(await ok(officer.client.rpc("can_manage_balance_round", { p_round_id: hostRound.id, p_clan_id: clanId })), false);
    assert.ok((await save(catalog, officer.client)).error);
    assert.deepEqual(await ok(member.client.from("clan_auction_items").select("id,name,description,cost,enabled").eq("clan_id", clanId)), [shared]);
    assert.ok((await member.client.from("clan_auction_items").update({ cost: 0 }).eq("id", shared.id).select("id")).data.length === 0);
  });
});
