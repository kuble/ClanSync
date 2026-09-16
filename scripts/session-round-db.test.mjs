import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

const env = loadTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("session lifecycle preserves dates, round history and authorization", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  let clanId;
  let seriesId;
  let firstRound;
  let secondRound;
  let expectedRoster;
  t.after(async () => {
    if (users.length)
      await ok(
        svc
          .from("coin_transactions")
          .delete()
          .in(
            "created_by",
            users.map((user) => user.id),
          ),
      );
    if (clanId) await ok(svc.from("clans").delete().eq("id", clanId));
    for (const user of users) {
      if (user.client) await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let index = 0; index < 12; index++) {
    const email = `round-${tag}-${index}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(
      svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `rd_${tag}_${index}`, birth_year: 2000 },
      }),
    );
    const client =
      index < 3
        ? createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            options,
          )
        : null;
    users.push({ id: user.id, client });
    if (client) await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, member, outsider] = users;
  const game = await ok(
    svc.from("games").select("id").eq("slug", "overwatch").single(),
  );
  const clan = await ok(
    svc
      .from("clans")
      .insert({
        game_id: game.id,
        name: `Round-${tag}`,
        subscription_tier: "premium",
        coin_balance: 100,
      })
      .select("id")
      .single(),
  );
  clanId = clan.id;
  await ok(
    svc
      .from("clan_members")
      .insert([
        {
          clan_id: clanId,
          user_id: leader.id,
          role: "leader",
          status: "active",
        },
        {
          clan_id: clanId,
          user_id: member.id,
          role: "member",
          status: "active",
        },
        ...users
          .slice(3)
          .map((user) => ({
            clan_id: clanId,
            user_id: user.id,
            role: "member",
            status: "active",
          })),
      ]),
  );
  const open = (client) =>
    client.rpc("open_balance_session_series", { p_clan_id: clanId });
  const next = (client, id) =>
    client.rpc("next_balance_round", { p_clan_id: clanId, p_round_id: id });
  const close = (client, id) =>
    client.rpc("close_balance_session_series", {
      p_clan_id: clanId,
      p_round_id: id,
    });
  const readRound = (id) =>
    svc.from("balance_sessions").select("*").eq("id", id).single();

  await t.test(
    "only an officer can open; simultaneous opens create one session and round",
    async () => {
      for (const client of [anon, member.client, outsider.client])
        assert.ok((await open(client)).error);
      const attempts = await Promise.all([
        open(leader.client),
        open(leader.client),
      ]);
      assert.equal(attempts.filter((result) => !result.error).length, 1);
      const created = attempts.find((result) => !result.error).data;
      seriesId = created.series_id;
      firstRound = created.round_id;
      const round = await ok(readRound(firstRound));
      assert.equal(round.series_id, seriesId);
      assert.equal(round.round_number, 1);
      assert.equal(round.formation_state, null);
      assert.equal(round.formation_revision, 0);
    },
  );

  await t.test(
    "members read session metadata; outsiders and direct metadata writes are rejected",
    async () => {
      const read = (client) =>
        client.from("balance_session_series").select("*").eq("id", seriesId);
      assert.equal((await ok(read(member.client))).length, 1);
      assert.deepEqual(await ok(read(outsider.client)), []);
      assert.ok((await read(anon)).error);
      assert.ok(
        (
          await leader.client
            .from("balance_session_series")
            .update({ opened_at: "2020-01-01T00:00:00Z" })
            .eq("id", seriesId)
        ).error,
      );
      for (const patch of [
        { series_id: randomUUID() },
        { round_number: 9 },
        { closed_at: new Date().toISOString() },
        { formation_state: { injected: true } },
        { formation_revision: 99 },
        { match_outcome: "team1" },
      ]) {
        assert.ok(
          (
            await leader.client
              .from("balance_sessions")
              .update(patch)
              .eq("id", firstRound)
          ).error,
        );
      }
      assert.ok(
        (
          await leader.client
            .from("balance_sessions")
            .insert({
              clan_id: clanId,
              game_id: game.id,
              host_user_id: leader.id,
              series_id: seriesId,
              round_number: 2,
            })
        ).error,
      );
    },
  );

  await t.test(
    "an unresolved round cannot advance; predictions settle before the next round",
    async () => {
      assert.ok((await next(leader.client, firstRound)).error);
      assert.ok((await next(member.client, firstRound)).error);
      const players = [leader, ...users.slice(3)].map((user) => user.id);
      expectedRoster = {
        team1: {
          tank: players[0],
          dmg: players.slice(1, 3),
          sup: players.slice(3, 5),
        },
        team2: {
          tank: players[5],
          dmg: players.slice(6, 8),
          sup: players.slice(8, 10),
        },
      };
      await ok(
        leader.client
          .from("balance_sessions")
          .update({ roster: expectedRoster })
          .eq("id", firstRound),
      );
      // Seed a clock-crossing boundary using the QA service account. Normal callers
      // cannot modify session timestamps or bypass the lifecycle RPCs.
      await ok(
        svc
          .from("balance_session_series")
          .update({ opened_at: "2026-09-14T16:00:00Z" })
          .eq("id", seriesId),
      );
      await ok(leader.client.from("balance_sessions").update({ resolved_map_label: "리장 타워" }).eq("id", firstRound));
      await ok(
        svc
          .from("balance_sessions")
          .update({
            phase: "match_live",
            prediction_deadline_at: new Date(Date.now() + 60_000).toISOString(),
          })
          .eq("id", firstRound),
      );
      assert.ok((await close(leader.client, firstRound)).error);
      await ok(
        member.client
          .from("balance_session_predictions")
          .insert({ session_id: firstRound, user_id: member.id, pick_team: 1 }),
      );
      const outcome = await ok(
        leader.client.rpc("set_balance_match_outcome", {
          p_session_id: firstRound,
          p_outcome: "team1",
        }),
      );
      assert.equal(outcome.ok, true);
      const retry = await ok(
        leader.client.rpc("set_balance_match_outcome", {
          p_session_id: firstRound,
          p_outcome: "team1",
        }),
      );
      assert.equal(retry.ok, false);
      assert.equal(
        (
          await ok(
            svc
              .from("users")
              .select("coin_balance")
              .eq("id", member.id)
              .single(),
          )
        ).coin_balance,
        5,
      );
    },
  );

  await t.test(
    "concurrent next-round requests keep one successor, preserve roster and leave predictions behind",
    async () => {
      const attempts = await Promise.all([
        next(leader.client, firstRound),
        next(leader.client, firstRound),
      ]);
      assert.equal(attempts.filter((result) => !result.error).length, 1);
      secondRound = attempts.find((result) => !result.error).data.round_id;
      const previous = await ok(readRound(firstRound));
      const current = await ok(readRound(secondRound));
      assert.ok(previous.closed_at);
      assert.equal(previous.match_outcome, "team1");
      assert.equal(current.series_id, seriesId);
      assert.equal(current.round_number, 2);
      assert.equal(current.phase, "editing");
      assert.equal(current.match_outcome, "pending");
      assert.equal(current.predictions_settled_at, null);
      assert.deepEqual(current.roster, expectedRoster);
      assert.equal(current.formation_state, null);
      assert.equal(
        (
          await ok(
            svc
              .from("balance_session_series")
              .select("session_date,closed_at")
              .eq("id", seriesId)
              .single(),
          )
        ).session_date,
        "2026-09-15",
      );
      assert.equal(
        (
          await ok(
            svc
              .from("balance_session_predictions")
              .select("*")
              .eq("session_id", firstRound),
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await ok(
            svc
              .from("balance_session_predictions")
              .select("*")
              .eq("session_id", secondRound),
          )
        ).length,
        0,
      );
      assert.ok((await close(leader.client, firstRound)).error);
      assert.deepEqual(
        await ok(
          leader.client
            .from("balance_sessions")
            .update({ roster: {} })
            .eq("id", firstRound)
            .select("id"),
        ),
        [],
      );
    },
  );

  await t.test(
    "closing cancels an unstarted round, preserves all history and allows a new session",
    async () => {
      assert.ok((await close(member.client, secondRound)).error);
      assert.ok((await close(outsider.client, secondRound)).error);
      assert.equal((await ok(close(leader.client, secondRound))).ok, true);
      assert.equal((await ok(close(leader.client, secondRound))).ok, true);
      const round = await ok(readRound(secondRound));
      assert.equal(round.match_outcome, "void");
      assert.ok(round.closed_at);
      const series = await ok(
        svc
          .from("balance_session_series")
          .select("*")
          .eq("id", seriesId)
          .single(),
      );
      assert.ok(series.closed_at);
      assert.equal(series.session_date, "2026-09-15");
      assert.ok((await next(leader.client, secondRound)).error);
      const reopened = await ok(open(leader.client));
      assert.notEqual(reopened.series_id, seriesId);
      assert.equal((await ok(readRound(reopened.round_id))).round_number, 1);
      assert.equal(
        (
          await ok(
            svc.from("balance_sessions").select("id").eq("series_id", seriesId),
          )
        ).length,
        2,
      );
      await ok(close(leader.client, reopened.round_id));
    },
  );
});
