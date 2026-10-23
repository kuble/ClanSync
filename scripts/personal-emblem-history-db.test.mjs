import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv(), options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
async function denied(query, code = "42501") { const { error } = await query; assert.equal(error?.code, code, error?.message ?? "Forbidden operation unexpectedly succeeded"); }

test("permanent personal emblem history preserves closed awards and first threshold dates", async (t) => {
  const tag = randomUUID().slice(0, 8), users = []; let clanId;
  t.after(async () => {
    if (clanId) { await ok(svc.from("balance_sessions").delete().eq("clan_id", clanId)); await ok(svc.from("clans").delete().eq("id", clanId)); }
    for (const user of users) { await ok(user.client.auth.signOut()); await ok(svc.auth.admin.deleteUser(user.id)); }
  });
  for (let i = 0; i < 3; i++) {
    const email = `emblem-history-${tag}-${i}@clansync-qa.local`, password = `${randomUUID()}aA1!`;
    const { user } = await ok(svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nickname: `eh_${tag}_${i}`, birth_year: 2000 } }));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    users.push({ id: user.id, client }); await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [winner, loser, predictor] = users;
  const game = await ok(svc.from("games").select("id").eq("slug", "overwatch").single());
  clanId = (await ok(svc.from("clans").insert({ game_id: game.id, name: `Emblem-history-${tag}`, subscription_tier: "premium" }).select("id").single())).id;
  await ok(svc.from("clan_members").insert(users.map((u, i) => ({ clan_id: clanId, user_id: u.id, status: "active", role: i === 0 ? "leader" : "member" }))));
  const finalize = (period, candidates, client = svc, type = "month") => client.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: type, p_period_key: period, p_awards: candidates });
  const awards = () => ok(svc.from("clan_personal_emblem_awards").select("*").eq("clan_id", clanId).order("emblem_key"));
  const milestones = () => ok(svc.from("clan_personal_emblem_milestones").select("*").eq("clan_id", clanId).order("user_id").order("emblem_key"));
  const candidate = { user_id: winner.id, family: "victory", rank: 1 };

  await t.test("period candidates commit atomically once, including an empty finalized period", async () => {
    const attempts = await Promise.all([finalize("2026-08", [candidate]), finalize("2026-08", [{ ...candidate, user_id: loser.id, rank: 2 }])]);
    attempts.forEach((result) => assert.equal(result.error, null, result.error?.message));
    assert.deepEqual(attempts.map((result) => result.data).sort(), [false, true]);
    const saved = await awards(); assert.equal(saved.length, 1); assert.equal(saved[0].emblem_key, "month-2026-08-승률");
    assert.equal(Date.parse(saved[0].earned_at), Date.parse("2026-08-31T15:00:00Z"));
    assert.equal(await ok(finalize("2026-08", [])), false); assert.deepEqual(await awards(), saved);
    assert.equal(await ok(finalize("2026-07", [])), true);
    assert.equal(await ok(finalize("2026-07", [candidate])), false); assert.equal((await awards()).length, 1);
    await denied(finalize("2026-06", [{ ...candidate, rank: 0 }]), "22023");
    assert.deepEqual(await ok(svc.from("clan_personal_emblem_award_periods").select("*").eq("clan_id", clanId).eq("period_key", "2026-06")), []);
    await denied(finalize("2099-01", [candidate]), "22023");
  });
  await t.test("history tables and privileged RPCs deny every direct authenticated/anonymous path", async () => {
    for (const client of [anon, winner.client, loser.client]) {
      for (const table of ["clan_personal_emblem_awards", "clan_personal_emblem_award_periods", "clan_personal_emblem_milestones"]) {
        await denied(client.from(table).select("*").eq("clan_id", clanId));
        await denied(client.from(table).insert({ clan_id: clanId }));
        await denied(client.from(table).update({ clan_id: clanId }).eq("clan_id", clanId));
        await denied(client.from(table).delete().eq("clan_id", clanId));
      }
      await denied(finalize("2026-05", [candidate], client));
      await denied(client.rpc("refresh_clan_personal_emblem_milestones", { p_clan_id: clanId }));
      await denied(client.rpc("read_clan_personal_emblem_award_source", { p_clan_id: clanId }));
      await denied(client.rpc("pending_clan_personal_emblem_awards", { p_limit: 1 }));
    }
    await denied(svc.from("clan_personal_emblem_awards").update({ rank: 3 }).eq("clan_id", clanId));
    assert.deepEqual(await milestones(), []);
    const source = await ok(svc.rpc("read_clan_personal_emblem_award_source", { p_clan_id: clanId }));
    assert.deepEqual(source.user_ids.sort(), users.map((u) => u.id).sort()); assert.equal(source.nicknames.length, 3);
  });

  const started = (i) => new Date(Date.UTC(2026, 8, i + 1, 10)).toISOString();
  const finished = (i) => new Date(Date.UTC(2026, 8, i + 1, 11)).toISOString();
  const guests = Array.from({ length: 8 }, (_, i) => ({ clan_id: clanId, id: randomUUID(), nickname: `guest_${i}`, alias: `guest_${i}`, is_guest: true }));
  await ok(svc.from("clan_participants").insert(guests));
  const series = Array.from({ length: 10 }, (_, i) => ({ id: randomUUID(), clan_id: clanId, game_id: game.id, host_user_id: winner.id, opened_at: started(i), closed_at: finished(i), last_activity_at: finished(i) }));
  const rounds = series.map((s, i) => ({ id: randomUUID(), series_id: s.id, clan_id: clanId, game_id: game.id, host_user_id: winner.id, opened_at: started(i), round_number: 1,
    roster: { team1: { tank: winner.id, dmg: guests.slice(0, 2).map((g) => g.id), sup: guests.slice(2, 4).map((g) => g.id) },
      team2: { tank: loser.id, dmg: guests.slice(4, 6).map((g) => g.id), sup: guests.slice(6, 8).map((g) => g.id) } } }));
  await ok(svc.from("balance_session_series").insert(series));
  await ok(svc.from("balance_sessions").insert(rounds));
  await ok(svc.from("balance_sessions").update({ map_ban_enabled: false, hero_ban_enabled: false,
    formation_settings: { roles: "manual", teams: "keep", predictionEnabled: true } }).eq("clan_id", clanId));
  await ok(svc.from("balance_sessions").update({ resolved_map_label: "부산" }).eq("clan_id", clanId));
  for (let i = 0; i < rounds.length; i++) await ok(svc.from("balance_sessions").update({ phase: "match_live", match_outcome: "team1", closed_at: finished(i), predictions_settled_at: finished(i) }).eq("id", rounds[i].id));
  await ok(svc.from("balance_session_predictions").insert(rounds.map((r) => ({ session_id: r.id, user_id: predictor.id, pick_team: 1 }))));

  await t.test("stat commits append the exact first achievement dates and never grant below-threshold stages", async () => {
    const rows = await milestones();
    const find = (user, key) => rows.find((row) => row.user_id === user.id && row.emblem_key === key);
    for (const key of ["milestone-matches-1", "milestone-wins-1", "milestone-sessions-1"]) assert.equal(Date.parse(find(winner, key)?.earned_at), Date.parse(finished(9)), key);
    for (const [stage, index] of [[1, 2], [2, 4], [3, 6], [4, 9]]) assert.equal(Date.parse(find(winner, `milestone-streak-${stage}`)?.earned_at), Date.parse(finished(index)));
    assert.equal(Date.parse(find(predictor, "milestone-prediction-1")?.earned_at), Date.parse(finished(9)));
    assert.equal(find(loser, "milestone-wins-1"), undefined); assert.equal(find(loser, "milestone-streak-1"), undefined);
    assert.equal(find(winner, "milestone-wins-2"), undefined); assert.equal(find(predictor, "milestone-matches-1"), undefined);
    assert.equal(await ok(svc.rpc("refresh_clan_personal_emblem_milestones", { p_clan_id: clanId })), 0);
  });
  await t.test("finalization refuses a stale summary and then accepts the current closed snapshot", async () => {
    const data = await ok(svc.rpc("read_clan_stats_summary", { p_clan_id: clanId, p_periods: ["2026-09"] }));
    const { totals, players, predictions } = data.periods["2026-09"];
    await ok(svc.from("balance_sessions").update({ match_outcome: "draw" }).eq("id", rounds[8].id));
    assert.equal(await ok(svc.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: "month", p_period_key: "2026-09", p_awards: [], p_expected_summary: { totals, players, predictions } })), false);
    assert.deepEqual(await ok(svc.from("clan_personal_emblem_award_periods").select("*").eq("clan_id", clanId).eq("period_key", "2026-09")), []);
    const fresh = (await ok(svc.rpc("read_clan_stats_summary", { p_clan_id: clanId, p_periods: ["2026-09"] }))).periods["2026-09"];
    const { hof_config: oldConfig } = await ok(svc.rpc("read_clan_personal_emblem_award_source", { p_clan_id: clanId }));
    const newConfig = { ...oldConfig, eligibility_below_pct: 31 };
    await ok(svc.from("clan_settings").update({ hof_config: newConfig }).eq("clan_id", clanId));
    const snapshot = { totals: fresh.totals, players: fresh.players, predictions: fresh.predictions };
    assert.equal(await ok(svc.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: "month", p_period_key: "2026-09", p_awards: [], p_expected_summary: { ...snapshot, hof_config: oldConfig } })), false);
    assert.deepEqual(await ok(svc.from("clan_personal_emblem_award_periods").select("*").eq("clan_id", clanId).eq("period_key", "2026-09")), []);
    assert.equal(await ok(svc.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: "month", p_period_key: "2026-09", p_awards: [], p_expected_summary: { ...snapshot, hof_config: newConfig } })), true);
    assert.equal(await ok(svc.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: "month", p_period_key: "2026-05", p_awards: [], p_expected_summary: { totals: { sessions: 0, days: 0, matches: 0 }, players: [], predictions: [] } })), true);
  });
  await t.test("record correction, settings changes, refunds and original deletion retain history and first dates", async () => {
    const savedAwards = await awards(), savedMilestones = await milestones();
    const [record] = await ok(svc.rpc("read_clan_stats_records", { p_clan_id: clanId, p_user_id: winner.id }));
    await ok(svc.rpc("edit_clan_match_record", { p_clan_id: clanId, p_actor_id: winner.id, p_id: record.payload.id, p_operation: "delete", p_revision: record.payload._revision, p_record: null }));
    await ok(svc.from("clan_settings").update({ hof_config: { win_rate_visible_top: 0, member_personal_sections: [] } }).eq("clan_id", clanId));
    await ok(svc.from("balance_session_predictions").update({ pool_settlement: "refund" }).in("session_id", rounds.map((r) => r.id)));
    await ok(svc.from("balance_sessions").update({ match_outcome: "void" }).eq("clan_id", clanId));
    await ok(svc.from("balance_sessions").delete().eq("clan_id", clanId));
    assert.equal(await ok(finalize("2026-08", [{ ...candidate, user_id: predictor.id, rank: 3 }])), false);
    assert.deepEqual(await awards(), savedAwards); assert.deepEqual(await milestones(), savedMilestones);
  });
  await t.test("pending skips emptied history, preserves empty previous periods and resumes after closure", async () => {
    const ghostId = await ok(svc.rpc("edit_clan_match_record", { p_clan_id: clanId, p_actor_id: winner.id, p_id: null, p_operation: "create", p_revision: null,
      p_record: { playedAt: "2001-02-01T10:00:00Z", occurredAt: "2001-02-01T10:00:00Z", mapLabel: "부산", outcome: "team1",
        players: [{ userId: winner.id, team: 1, role: "tank" }, { userId: loser.id, team: 2, role: "tank" }] } }));
    const [ghost] = await ok(svc.rpc("read_clan_stats_records", { p_clan_id: clanId, p_day: "2001-02-01" }));
    await ok(svc.rpc("edit_clan_match_record", { p_clan_id: clanId, p_actor_id: winner.id, p_id: ghostId, p_operation: "delete", p_revision: ghost.payload._revision, p_record: null }));
    const emptyHistory = await ok(svc.rpc("read_clan_stats_summary", { p_clan_id: clanId, p_periods: ["2001", "2001-02"] }));
    assert.equal(emptyHistory.periods["2001"].totals.days, 0);
    assert.equal(emptyHistory.periods["2001-02"].totals.days, 0);
    assert.equal(emptyHistory.directory["2001"], undefined);
    assert.equal(emptyHistory.directory["2001-02"], undefined);
    const openSeries = await ok(svc.from("balance_session_series").insert({ clan_id: clanId, game_id: game.id, host_user_id: winner.id, opened_at: "2026-04-15T12:00:00Z" }).select("id").single());
    assert.equal(await ok(finalize("2026-04", [])), false);
    assert.deepEqual(await ok(svc.from("clan_personal_emblem_award_periods").select("*").eq("clan_id", clanId).eq("period_key", "2026-04")), []);
    const now = new Date(), kstYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
    const lastMonth = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })); lastMonth.setDate(1); lastMonth.setMonth(lastMonth.getMonth() - 1);
    const previousMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    const directory = await ok(svc.rpc("read_clan_stats_summary", { p_clan_id: clanId, p_periods: [] }));
    const periods = new Set([previousMonth, String(kstYear - 1), ...Object.keys(directory.directory).filter((key) => /^\d{4}(-\d{2})?$/.test(key) && (key.length === 4 ? key < String(kstYear) : key < `${kstYear}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`))]);
    for (const period of periods) if (period !== "2026-04" && period !== "2026") await ok(finalize(period, [], svc, period.length === 4 ? "year" : "month"));
    const pending = await ok(svc.rpc("pending_clan_personal_emblem_awards", { p_limit: 100 }));
    assert.ok(!pending.some((row) => row.clan_id === clanId));
    await ok(svc.from("balance_rooms").update({ status: "closed" }).eq("series_id", openSeries.id));
    assert.ok((await ok(svc.rpc("pending_clan_personal_emblem_awards", { p_limit: 100 }))).some((row) => row.clan_id === clanId));
    assert.equal(await ok(finalize("2026-04", [])), true);
    assert.ok(!(await ok(svc.rpc("pending_clan_personal_emblem_awards", { p_limit: 100 }))).some((row) => row.clan_id === clanId));
  });
});
