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
  assert.ok(error, "Expected a rejected write");
}
const future = (days) => new Date(Date.now() + days * 86400_000).toISOString();

test("room ownership, reservations, delegation and scheduler stay scoped", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  let clanId;
  t.after(async () => {
    if (clanId) await ok(svc.from("clans").delete().eq("id", clanId));
    for (const user of users) {
      if (user.client) await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let index = 0; index < 12; index++) {
    const email = `rooms-${tag}-${index}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nickname: `rm_${tag}_${index}`, birth_year: 2000 } }));
    const client = index < 6 ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options) : null;
    users.push({ id: user.id, client });
    if (client) await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, officer, creator, other, inactive, outsider] = users;
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  clanId = (await ok(svc.from("clans").insert({ game_id: game.id, name: `Rooms-${tag}` }).select("id").single())).id;
  await ok(svc.from("clan_members").insert(users.filter((u) => u !== outsider).map((user) => ({
    clan_id: clanId, user_id: user.id,
    role: user === leader ? "leader" : user === officer ? "officer" : "member",
    status: user === inactive ? "left" : "active",
  }))));
  const create = (client, kind, extras = {}) => client.rpc("create_balance_room", { p_clan_id: clanId, p_kind: kind, p_title: `${kind}-${tag}`, ...extras });
  const readRoom = (id) => svc.from("balance_rooms").select("*").eq("id", id).single();
  const readRound = (seriesId) => svc.from("balance_sessions").select("*").eq("series_id", seriesId).is("closed_at", null).single();
  const manage = (client, roundId) => client.rpc("can_manage_balance_round", { p_clan_id: clanId, p_round_id: roundId });
  const roomArgs = (id) => ({ p_clan_id: clanId, p_room_id: id });
  let owned;
  let ownedRound;

  await t.test("creation checks live membership, regular role, and service-only scheduler", async () => {
    for (const client of [anon, outsider.client, inactive.client]) await denied(create(client, "flash"));
    await denied(create(creator.client, "regular"));
    await denied(create(creator.client, "flash", { p_repeat_every_days: 7 }));
    await denied(create(leader.client, "regular", { p_rsvp_days: 1 }));
    await denied(create(creator.client, "flash", { p_rsvp_days: 0 }));
    await denied(creator.client.rpc("materialize_balance_rooms", {}));
    await denied(anon.rpc("materialize_balance_rooms", {}));
    await denied(creator.client.from("balance_rooms").insert({ clan_id: clanId, game_id: game.id, kind: "regular", title: "forged", created_by: creator.id }));
  });

  await t.test("two members open independent flash rooms and managers stay room-scoped", async () => {
    const [a, b] = await Promise.all([ok(create(creator.client, "flash")), ok(create(other.client, "flash"))]);
    owned = a;
    ownedRound = await ok(readRound(a.series_id));
    assert.notEqual(a.series_id, b.series_id);
    assert.equal((await ok(readRoom(a.room_id))).kind, "flash");
    assert.equal((await ok(svc.from("balance_rooms").select("id").eq("clan_id", clanId))).length, 2);
    assert.equal(await ok(manage(creator.client, ownedRound.id)), true);
    assert.equal(await ok(manage(other.client, ownedRound.id)), false);
    assert.equal(await ok(manage(officer.client, ownedRound.id)), true);
    assert.deepEqual(await ok(outsider.client.from("balance_rooms").select("id").eq("clan_id", clanId)), []);
    assert.deepEqual(await ok(other.client.from("balance_sessions").update({ map_ban_enabled: true }).eq("id", ownedRound.id).select("id")), []);
    await denied(creator.client.from("balance_rooms").update({ delegated_to: creator.id }).eq("id", owned.room_id));
    await denied(other.client.rpc("close_balance_session_series", { p_clan_id: clanId, p_round_id: ownedRound.id }));
    await denied(creator.client.rpc("next_balance_round", { p_clan_id: randomUUID(), p_round_id: ownedRound.id }));
  });

  await t.test("flash creator manages nested roster, settings, formation, outcome, next round and close", async () => {
    const ids = users.filter((u) => u !== inactive && u !== outsider).map((u) => u.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    assert.equal((await ok(creator.client.from("balance_sessions").update({ roster }).eq("id", ownedRound.id).select("id"))).length, 1);
    let current = await ok(readRound(owned.series_id));
    const settingsArgs = { p_round_id: current.id, p_clan_id: clanId, p_revision: current.formation_revision,
      p_settings: current.formation_settings, p_map_ban: false, p_hero_ban: false, p_map_ban_seconds: 25, p_hero_ban_seconds: 30, p_map_types: ["hybrid"] };
    await denied(other.client.rpc("set_balance_prematch_settings", settingsArgs));
    assert.equal(await ok(creator.client.rpc("set_balance_prematch_settings", settingsArgs)), true);
    current = await ok(readRound(owned.series_id));
    const state = { version: 1, mode: "keep", stage: "complete", players: ids.map((id) => ({ id })), order: ids, captains: [], roster, sourceRoster: roster, remaining: [], log: [] };
    assert.equal(await ok(svc.rpc("commit_balance_formation", { p_round_id: current.id, p_clan_id: clanId, p_revision: current.formation_revision, p_state: state, p_roster: roster, p_actor_id: creator.id, p_command: "start" })), true);
    await ok(creator.client.from("balance_sessions").update({ resolved_map_label: "왕의 길" }).eq("id", current.id));
    await ok(creator.client.from("balance_sessions").update({ phase: "match_live" }).eq("id", current.id));
    assert.equal((await ok(other.client.rpc("set_balance_match_outcome", { p_session_id: current.id, p_outcome: "void" }))).ok, false);
    assert.equal((await ok(creator.client.rpc("set_balance_match_outcome", { p_session_id: current.id, p_outcome: "void" }))).ok, true);
    const nexts = await Promise.all([1, 2].map(() => creator.client.rpc("next_balance_round", { p_clan_id: clanId, p_round_id: current.id })));
    assert.equal(nexts.filter((r) => !r.error).length, 1);
    current = await ok(readRound(owned.series_id));
    assert.equal(current.round_number, 2);
    assert.equal(current.map_ban_seconds, 25);
    assert.deepEqual(current.map_types, ["hybrid"]);
    await ok(creator.client.rpc("close_balance_session_series", { p_clan_id: clanId, p_round_id: current.id }));
    assert.equal((await ok(readRoom(owned.room_id))).status, "closed");
  });

  await t.test("regular delegation belongs to this room and ends on close", async () => {
    const regular = await ok(create(leader.client, "regular", { p_scheduled_at: future(2) }));
    assert.equal(regular.series_id, null);
    await denied(officer.client.rpc("delegate_balance_room", { ...roomArgs(regular.room_id), p_officer_id: officer.id }));
    await denied(leader.client.rpc("delegate_balance_room", { ...roomArgs(regular.room_id), p_officer_id: creator.id }));
    await ok(leader.client.rpc("delegate_balance_room", { ...roomArgs(regular.room_id), p_officer_id: officer.id }));
    await ok(leader.client.rpc("delegate_balance_room", roomArgs(regular.room_id)));
    assert.equal((await ok(readRoom(regular.room_id))).delegated_to, null);
    await ok(leader.client.rpc("delegate_balance_room", { ...roomArgs(regular.room_id), p_officer_id: officer.id }));
    const opened = await ok(officer.client.rpc("open_balance_room", roomArgs(regular.room_id)));
    const current = await ok(readRound(opened.series_id));
    assert.equal(current.host_user_id, officer.id);
    await ok(officer.client.rpc("close_balance_session_series", { p_clan_id: clanId, p_round_id: current.id }));
    assert.equal((await ok(readRoom(regular.room_id))).delegated_to, null);
    assert.equal((await ok(svc.from("clan_members").select("role").eq("clan_id", clanId).eq("user_id", officer.id).single())).role, "officer");
  });

  await t.test("RSVP is self-only, bounded by time, and does not create a roster or series", async () => {
    const reservation = await ok(create(creator.client, "flash", { p_scheduled_at: future(10), p_rsvp_days: 3 }));
    const args = { ...roomArgs(reservation.room_id), p_response: "going" };
    await denied(other.client.rpc("set_balance_room_rsvp", args));
    await ok(creator.client.rpc("update_balance_room", { ...roomArgs(reservation.room_id), p_title: "RSVP ready", p_scheduled_at: future(2), p_rsvp_days: 3 }));
    await ok(creator.client.rpc("update_balance_room", { ...roomArgs(reservation.room_id), p_title: "RSVP disabled", p_scheduled_at: future(2) }));
    assert.equal((await ok(readRoom(reservation.room_id))).rsvp_days, null);
    await denied(other.client.rpc("set_balance_room_rsvp", args));
    await ok(creator.client.rpc("update_balance_room", { ...roomArgs(reservation.room_id), p_title: "RSVP ready", p_scheduled_at: future(2), p_rsvp_days: 3 }));
    await ok(other.client.rpc("set_balance_room_rsvp", args));
    await ok(other.client.rpc("set_balance_room_rsvp", { ...args, p_response: "maybe" }));
    const responses = await ok(svc.from("balance_room_rsvps").select("*").eq("room_id", reservation.room_id));
    assert.equal(responses.length, 1);
    assert.equal(responses[0].user_id, other.id);
    assert.equal(responses[0].response, "maybe");
    assert.equal((await ok(readRoom(reservation.room_id))).series_id, null);
    await denied(other.client.from("balance_room_rsvps").insert({ room_id: reservation.room_id, user_id: creator.id, response: "going" }));
    await denied(inactive.client.rpc("set_balance_room_rsvp", args));
    const opened = await ok(creator.client.rpc("open_balance_room", roomArgs(reservation.room_id)));
    await denied(other.client.rpc("set_balance_room_rsvp", args));
    const round = await ok(readRound(opened.series_id));
    assert.ok(!JSON.stringify(round.roster).includes(other.id));
  });

  await t.test("cancel advances recurrence; pause retains occurrence; due opening is idempotent", async () => {
    const first = await ok(create(leader.client, "regular", { p_scheduled_at: future(2), p_repeat_every_days: 7 }));
    const original = await ok(readRoom(first.room_id));
    const scheduleId = original.schedule_id;
    const scheduleArgs = { p_clan_id: clanId, p_schedule_id: scheduleId };
    await ok(leader.client.rpc("cancel_balance_room", roomArgs(first.room_id)));
    const nextReservation = (await ok(svc.from("balance_rooms").select("*").eq("schedule_id", scheduleId).eq("status", "scheduled")))[0];
    assert.ok(nextReservation);
    assert.equal(Date.parse(nextReservation.scheduled_at) - Date.parse(original.scheduled_at), 7 * 86400_000);
    const cadenceBefore = await ok(svc.from("balance_room_schedules").select("next_run_at").eq("id", scheduleId).single());
    await ok(leader.client.rpc("update_balance_room", { ...roomArgs(nextReservation.id), p_title: "Moved only once", p_scheduled_at: future(3) }));
    assert.deepEqual(await ok(svc.from("balance_room_schedules").select("next_run_at").eq("id", scheduleId).single()), cadenceBefore);
    await denied(creator.client.rpc("set_balance_room_schedule_enabled", { ...scheduleArgs, p_enabled: false }));
    await ok(leader.client.rpc("set_balance_room_schedule_enabled", { ...scheduleArgs, p_enabled: false }));
    assert.equal((await ok(readRoom(nextReservation.id))).status, "scheduled");
    await ok(svc.from("balance_rooms").update({ scheduled_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", nextReservation.id));
    await Promise.all([ok(svc.rpc("materialize_balance_rooms", {})), ok(svc.rpc("materialize_balance_rooms", {}))]);
    assert.equal((await ok(readRoom(nextReservation.id))).status, "open");
    assert.equal((await ok(svc.from("balance_session_series").select("id").eq("id", nextReservation.id))).length, 1);
    assert.equal((await ok(svc.from("balance_rooms").select("id").eq("schedule_id", scheduleId).eq("status", "scheduled"))).length, 0);
    await ok(leader.client.rpc("set_balance_room_schedule_enabled", { ...scheduleArgs, p_enabled: true }));
    await ok(svc.rpc("materialize_balance_rooms", {}));
    assert.equal((await ok(svc.from("balance_rooms").select("id").eq("schedule_id", scheduleId).eq("status", "scheduled"))).length, 1);
  });

  await t.test("scheduler rechecks creator role and rejects direct service execution by members", async () => {
    const reservation = await ok(create(officer.client, "regular", { p_scheduled_at: future(2), p_repeat_every_days: 7 }));
    const room = await ok(readRoom(reservation.room_id));
    await ok(svc.from("clan_members").update({ role: "member" }).eq("clan_id", clanId).eq("user_id", officer.id));
    await ok(svc.from("balance_rooms").update({ scheduled_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", room.id));
    await ok(svc.rpc("materialize_balance_rooms", {}));
    const after = await ok(readRoom(room.id));
    assert.equal(after.status, "cancelled");
    assert.equal(after.series_id, null);
    assert.equal((await ok(svc.from("balance_room_schedules").select("enabled").eq("id", room.schedule_id).single())).enabled, false);
    await denied(officer.client.rpc("open_balance_room", roomArgs(room.id)));
    await ok(svc.from("clan_members").update({ status: "left" }).eq("clan_id", clanId).eq("user_id", creator.id));
    assert.equal(await ok(manage(creator.client, ownedRound.id)), false);
  });
});
