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

test("formation revisions authorize writes and serialize live transitions", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  let clanId;
  let roundId;
  t.after(async () => {
    if (clanId) await ok(svc.from("clans").delete().eq("id", clanId));
    for (const user of users) {
      if (user.client) await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let index = 0; index < 10; index++) {
    const email = `formation-${tag}-${index}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(
      svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `fm_${tag}_${index}`, birth_year: 2000 },
      }),
    );
    const client =
      index < 2
        ? createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            options,
          )
        : null;
    users.push({ id: user.id, client });
    if (client) await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, member] = users;
  const game = await ok(
    svc.from("games").select("id").eq("slug", "overwatch").single(),
  );
  clanId = (
    await ok(
      svc
        .from("clans")
        .insert({ game_id: game.id, name: `Formation-${tag}` })
        .select("id")
        .single(),
    )
  ).id;
  await ok(
    svc
      .from("clan_members")
      .insert(
        users.map((user, index) => ({
          clan_id: clanId,
          user_id: user.id,
          role: index === 0 ? "leader" : "member",
          status: "active",
        })),
      ),
  );
  const opened = await ok(
    leader.client.rpc("open_balance_session_series", { p_clan_id: clanId }),
  );
  roundId = opened.round_id;
  const read = () =>
    svc.from("balance_sessions").select("*").eq("id", roundId).single();
  const ids = users.map((user) => user.id);
  const fullRoster = {
    team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) },
    team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) },
  };
  const captainRoster = {
    team1: { tank: ids[0], dmg: [null, null], sup: [null, null] },
    team2: { tank: ids[5], dmg: [null, null], sup: [null, null] },
  };
  const roles = [
    "tank",
    "dmg",
    "dmg",
    "sup",
    "sup",
    "tank",
    "dmg",
    "dmg",
    "sup",
    "sup",
  ];
  const state = (label, complete = false) => ({
    version: 1,
    mode: "draft",
    stage: complete ? "complete" : "draft",
    players: ids.map((id, index) => ({ id, role: roles[index] })),
    order: ids,
    captains: [ids[0], ids[5]],
    first: "team1",
    picks: complete ? 8 : 0,
    roster: complete ? fullRoster : captainRoster,
    sourceRoster: fullRoster,
    budgets: { team1: 1000, team2: 1000 },
    remaining: complete
      ? []
      : ids.filter((id) => id !== ids[0] && id !== ids[5]),
    auction: null,
    pausedAt: null,
    log: [{ text: label }],
  });
  const args = (revision, value) => ({
    p_round_id: roundId,
    p_clan_id: clanId,
    p_revision: revision,
    p_state: value,
    p_roster: value.roster,
    p_actor_id: leader.id,
    p_command: "start",
  });

  await t.test(
    "anon and authenticated users cannot invoke service CAS or write state columns",
    async () => {
      for (const client of [anon, leader.client, member.client]) {
        assert.equal(
          (
            await client.rpc(
              "commit_balance_formation",
              args(0, state("forged")),
            )
          ).error?.code,
          "42501",
        );
      }
      for (const client of [leader.client, member.client]) {
        for (const patch of [
          { formation_state: state("forged") },
          { formation_revision: 9 },
        ]) {
          assert.equal(
            (
              await client
                .from("balance_sessions")
                .update(patch)
                .eq("id", roundId)
            ).error?.code,
            "42501",
          );
        }
      }
      assert.equal((await ok(read())).formation_revision, 0);
    },
  );

  await t.test(
    "incomplete roster cannot leave editing; saving a roster increments its revision",
    async () => {
      const incomplete = await leader.client
        .from("balance_sessions")
        .update({ phase: "match_live" })
        .eq("id", roundId);
      assert.ok(incomplete.error);
      assert.match(incomplete.error.message, /10명/);
      const forged = await leader.client
        .from("balance_sessions")
        .update({ roster: { fake: ids }, phase: "match_live" })
        .eq("id", roundId);
      assert.ok(forged.error);
      assert.match(forged.error.message, /10명/);
      const duplicate = structuredClone(fullRoster);
      duplicate.team2.tank = duplicate.team1.tank;
      assert.ok(
        (
          await leader.client
            .from("balance_sessions")
            .update({ roster: duplicate, phase: "match_live" })
            .eq("id", roundId)
        ).error,
      );
      await ok(
        leader.client
          .from("balance_sessions")
          .update({ roster: fullRoster })
          .eq("id", roundId),
      );
      const row = await ok(read());
      assert.equal(row.phase, "editing");
      assert.equal(row.formation_revision, 1);
      assert.equal(row.formation_state, null);
      await ok(
        svc
          .from("clan_members")
          .update({ status: "left" })
          .eq("clan_id", clanId)
          .eq("user_id", ids[9]),
      );
      const departed = await leader.client
        .from("balance_sessions")
        .update({ phase: "match_live" })
        .eq("id", roundId);
      assert.ok(departed.error);
      assert.match(departed.error.message, /활동/);
      await ok(
        svc
          .from("clan_members")
          .update({ status: "active" })
          .eq("clan_id", clanId)
          .eq("user_id", ids[9]),
      );
    },
  );

  await t.test(
    "concurrent CAS commits accept exactly one revision and reject stale or wrong-clan writes",
    async () => {
      const results = await Promise.all(
        ["first", "second"].map((label) =>
          ok(svc.rpc("commit_balance_formation", args(1, state(label)))),
        ),
      );
      assert.equal(results.filter(Boolean).length, 1);
      const row = await ok(read());
      assert.equal(row.formation_revision, 2);
      assert.equal(
        row.formation_state.log[0].text,
        results[0] ? "first" : "second",
      );
      assert.deepEqual(row.roster, captainRoster);
      assert.equal(
        await ok(svc.rpc("commit_balance_formation", args(1, state("stale")))),
        false,
      );
      assert.equal(
        (
          await svc.rpc("commit_balance_formation", {
            ...args(2, state("wrong-clan")),
            p_clan_id: randomUUID(),
          })
        ).error?.code,
        "42501",
      );
      assert.equal((await ok(read())).formation_revision, 2);
    },
  );

  await t.test(
    "commit rechecks active membership and manager permissions after the read",
    async () => {
      assert.equal(
        (
          await svc.rpc("commit_balance_formation", {
            ...args(2, state("noncaptain")),
            p_actor_id: member.id,
            p_command: "pick",
          })
        ).error?.code,
        "42501",
      );
      await ok(
        svc
          .from("clan_members")
          .update({ status: "left" })
          .eq("clan_id", clanId)
          .eq("user_id", leader.id),
      );
      assert.equal(
        (await svc.rpc("commit_balance_formation", args(2, state("departed"))))
          .error?.code,
        "42501",
      );
      await ok(
        svc
          .from("clan_members")
          .update({ status: "active", role: "member" })
          .eq("clan_id", clanId)
          .eq("user_id", leader.id),
      );
      assert.equal(
        (await svc.rpc("commit_balance_formation", args(2, state("demoted"))))
          .error?.code,
        "42501",
      );
      await ok(
        svc
          .from("clan_members")
          .update({ role: "leader" })
          .eq("clan_id", clanId)
          .eq("user_id", leader.id),
      );
      assert.equal((await ok(read())).formation_revision, 2);
    },
  );

  await t.test(
    "active formation blocks direct roster edits and phase advancement",
    async () => {
      const roster = await leader.client
        .from("balance_sessions")
        .update({ roster: fullRoster })
        .eq("id", roundId);
      assert.ok(roster.error);
      assert.match(roster.error.message, /편성/);
      const phase = await leader.client
        .from("balance_sessions")
        .update({ phase: "match_live" })
        .eq("id", roundId);
      assert.ok(phase.error);
      assert.match(phase.error.message, /편성/);
      const row = await ok(read());
      assert.equal(row.formation_revision, 2);
      assert.equal(row.phase, "editing");
      assert.deepEqual(row.roster, captainRoster);
    },
  );

  await t.test(
    "completed formation permits phase advancement and prevents late CAS writes",
    async () => {
      assert.equal(
        await ok(
          svc.rpc("commit_balance_formation", { ...args(2, state("complete", true)), p_command: "pick" }),
        ),
        true,
      );
      await ok(
        leader.client
          .from("balance_sessions")
          .update({ phase: "match_live" })
          .eq("id", roundId),
      );
      assert.equal(
        await ok(svc.rpc("commit_balance_formation", args(3, state("late")))),
        false,
      );
      const row = await ok(read());
      assert.equal(row.formation_revision, 3);
      assert.equal(row.formation_state.stage, "complete");
      assert.equal(row.phase, "match_live");
      assert.deepEqual(row.roster, fullRoster);
      assert.ok(
        (
          await leader.client
            .from("balance_sessions")
            .update({ phase: "editing" })
            .eq("id", roundId)
        ).error,
      );
      assert.ok(
        (
          await leader.client
            .from("balance_sessions")
            .update({ roster: captainRoster })
            .eq("id", roundId)
        ).error,
      );
      const outcome = await ok(
        leader.client.rpc("set_balance_match_outcome", {
          p_session_id: roundId,
          p_outcome: "void",
        }),
      );
      assert.equal(outcome.ok, true);
      await ok(
        leader.client.rpc("close_balance_session_series", {
          p_clan_id: clanId,
          p_round_id: roundId,
        }),
      );
      assert.equal(
        await ok(svc.rpc("commit_balance_formation", args(3, state("closed")))),
        false,
      );
    },
  );
});
