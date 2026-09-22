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

test("prematch rules, voting deadlines and explicit match start are atomic", async (t) => {
  const tag = randomUUID().slice(0, 8),
    users = [];
  let clanId, roundId;
  t.after(async () => {
    if (clanId) {
      await ok(svc.from("balance_sessions").delete().eq("clan_id", clanId));
      await ok(svc.from("balance_session_series").delete().eq("clan_id", clanId));
      await ok(svc.from("clans").delete().eq("id", clanId));
    }
    for (const user of users) {
      if (user.client) await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let i = 0; i < 12; i++) {
    const email = `prematch-${tag}-${i}@clansync-qa.local`,
      password = `${randomUUID()}aA1!`;
    const { user } = await ok(
      svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `pm_${tag}_${i}`, birth_year: 2000 },
      }),
    );
    const client = [0, 1, 2, 11].includes(i)
      ? createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          options,
        )
      : null;
    users.push({ id: user.id, client });
    if (client) await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, member, outsider] = users,
    reserve = users[11];
  const game = await ok(
    svc.from("games").select("id").eq("slug", "overwatch").single(),
  );
  clanId = (
    await ok(
      svc
        .from("clans")
        .insert({ game_id: game.id, name: `Prematch-${tag}` })
        .select("id")
        .single(),
    )
  ).id;
  await ok(
    svc.from("clan_members").insert(
      users
        .filter((_, i) => i !== 2)
        .map((user, i) => ({
          clan_id: clanId,
          user_id: user.id,
          role: i ? "member" : "leader",
          status: "active",
        })),
    ),
  );
  ({ round_id: roundId } = await ok(
    leader.client.rpc("open_balance_session_series", { p_clan_id: clanId }),
  ));
  const ids = users
    .filter((_, i) => i !== 2 && i !== 11)
    .map((user) => user.id);
  const roster = {
    team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) },
    team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) },
  };
  await ok(
    leader.client.from("balance_sessions").update({ roster }).eq("id", roundId),
  );
  const read = () =>
    ok(svc.from("balance_sessions").select("*").eq("id", roundId).single());
  const patch = (value, client = leader.client) =>
    client.from("balance_sessions").update(value).eq("id", roundId);
  const settingsArgs = (row, overrides = {}) => ({
    p_round_id: roundId,
    p_clan_id: clanId,
    p_revision: row.formation_revision,
    p_settings: row.formation_settings,
    p_map_ban: row.map_ban_enabled,
    p_hero_ban: row.hero_ban_enabled,
    p_map_ban_seconds: row.map_ban_seconds,
    p_hero_ban_seconds: row.hero_ban_seconds,
    p_hero_bans_per_team: row.hero_bans_per_team,
    p_map_types: row.map_types,
    ...overrides,
  });
  const settings = async (overrides) =>
    ok(
      leader.client.rpc(
        "set_balance_prematch_settings",
        settingsArgs(await read(), overrides),
      ),
    );
  const countVotes = async (kind) =>
    (
      await ok(
        svc
          .from(`balance_session_${kind}_votes`)
          .select("user_id")
          .eq("session_id", roundId),
      )
    ).length;
  const mapVote = async (client = member.client, deadline) =>
    client.rpc("submit_balance_ban_vote", {
      p_round_id: roundId,
      p_clan_id: clanId,
      p_kind: "map",
      p_expected_deadline: deadline ?? (await read()).map_ban_deadline_at,
      p_choice_idx: 0,
    });
  const heroVote = async (client = member.client, deadline, picks = ["ana", "mercy"]) =>
    client.rpc("submit_balance_ban_vote", {
      p_round_id: roundId,
      p_clan_id: clanId,
      p_kind: "hero",
      p_expected_deadline: deadline ?? (await read()).hero_ban_deadline_at,
      p_picks: picks,
    });

  await t.test(
    "settings check auth, clan, bounds and revision; formation stays intact",
    async () => {
      const initial = await read();
      assert.equal(initial.map_ban_seconds, 15);
      assert.equal(initial.hero_ban_seconds, 20);
      assert.deepEqual(initial.map_types, []);
      for (const client of [anon, member.client, outsider.client])
        assert.ok(
          (
            await client.rpc(
              "set_balance_prematch_settings",
              settingsArgs(initial),
            )
          ).error,
        );
      for (const overrides of [
        { p_clan_id: randomUUID() },
        { p_map_ban_seconds: 4 },
        { p_hero_ban_seconds: 301 },
        { p_hero_bans_per_team: 0 },
        { p_hero_bans_per_team: 3 },
        { p_map_types: ["fake"] },
      ])
        assert.ok(
          (
            await leader.client.rpc(
              "set_balance_prematch_settings",
              settingsArgs(initial, overrides),
            )
          ).error,
        );
      const results = await Promise.all(
        [5, 10].map((seconds) =>
          ok(
            leader.client.rpc(
              "set_balance_prematch_settings",
              settingsArgs(initial, { p_map_ban_seconds: seconds }),
            ),
          ),
        ),
      );
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal(
        await settings({
          p_map_ban: true,
          p_map_ban_seconds: 5,
          p_hero_ban_seconds: 5,
          p_hero_ban: true,
          p_map_types: ["control"],
        }),
        true,
      );
      const row = await read();
      assert.equal(row.formation_settings.playerCardInfo, "record");
      assert.equal(row.formation_settings.auctionItemsEnabled, false);
      assert.equal(row.formation_settings.strategySeconds, 30);
      const state = {
        stage: "complete",
        roster,
        sourceRoster: roster,
        players: ids.map((id) => ({ id })),
        settings: row.formation_settings,
      };
      assert.equal(
        await ok(
          svc.rpc("commit_balance_formation", {
            p_round_id: roundId,
            p_clan_id: clanId,
            p_revision: row.formation_revision,
            p_actor_id: leader.id,
            p_command: "start",
            p_state: state,
            p_roster: roster,
          }),
        ),
        true,
      );
      const formed = await read();
      assert.ok(
        (
          await leader.client.rpc(
            "set_balance_prematch_settings",
            settingsArgs(formed, {
              p_settings: { ...formed.formation_settings, teams: "random" },
            }),
          )
        ).error,
      );
      assert.equal(await settings({ p_hero_ban_seconds: 10 }), true);
      assert.deepEqual((await read()).formation_state, state);
      assert.deepEqual((await read()).draw_history, formed.draw_history);
      assert.ok((await patch({ phase: "match_live" })).error);
    },
  );

  await t.test("a stale browser ballot cannot vote after settings reset and restart", async () => {
    const ballot = { phase: "map_ban", map_candidates: ["리장 타워", "오아시스", "일리오스"] };
    await ok(patch(ballot));
    const oldDeadline = (await read()).map_ban_deadline_at;
    await ok(mapVote(member.client, oldDeadline));
    assert.equal(await settings({ p_map_ban_seconds: 6 }), true);
    assert.equal(await countVotes("map"), 0);
    await ok(patch(ballot));
    const newDeadline = (await read()).map_ban_deadline_at;
    assert.notEqual(newDeadline, oldDeadline);
    assert.ok((await mapVote(member.client, oldDeadline)).error);
    assert.equal(await countVotes("map"), 0);
    assert.equal(await ok(mapVote(member.client, newDeadline)), true);
    assert.equal(await countVotes("map"), 1);
    assert.equal(await settings({ p_map_ban_seconds: 5 }), true);
  });

  await t.test(
    "map ballots enforce deadlines, retain resolved phase and preserve map on hero edits",
    async () => {
      await ok(
        patch({
          phase: "map_ban",
          map_candidates: ["리장 타워", "오아시스", "일리오스"],
        }),
      );
      const voting = await read();
      const activity = await ok(svc.from("balance_session_series").select("last_activity_at").eq("id", voting.series_id).single());
      const ballotDuration = Date.parse(voting.map_ban_deadline_at) - Date.parse(activity.last_activity_at);
      assert.ok(
        Math.abs(ballotDuration - voting.map_ban_seconds * 1000) < 500,
        `DB ballot duration: ${ballotDuration}ms`,
      );
      await ok(mapVote());
      assert.ok((await mapVote(outsider.client)).error);
      assert.ok((await mapVote(anon)).error);
      for (const client of [leader.client, member.client]) {
        assert.equal((await client.from("balance_session_map_votes").insert({
          session_id: roundId, user_id: member.id, choice_idx: 1,
        })).error?.code, "42501");
        assert.equal((await client.from("balance_session_map_votes").update({ choice_idx: 1 })
          .eq("session_id", roundId).eq("user_id", member.id)).error?.code, "42501");
      }
      assert.ok(
        (
          await patch({
            resolved_map_label: "리장 타워",
            map_ban_deadline_at: null,
          })
        ).error,
      );
      await ok(
        patch(
          { map_ban_deadline_at: new Date(Date.now() - 1000).toISOString() },
          svc,
        ),
      );
      assert.ok((await mapVote()).error);
      const expired = await read();
      await ok(
        patch({ resolved_map_label: "리장 타워", map_ban_deadline_at: null }),
      );
      const resolved = await read();
      assert.equal(resolved.phase, "map_ban");
      assert.ok(resolved.formation_revision > expired.formation_revision);
      assert.ok((await patch({ phase: "match_live" })).error);
      assert.equal(await settings({ p_hero_ban_seconds: 5 }), true);
      const edited = await read();
      assert.equal(edited.phase, "editing");
      assert.equal(edited.resolved_map_label, "리장 타워");
      assert.equal(await countVotes("map"), 1);
    },
  );

  await t.test("current heroes and rapid ballot replacements persist without duplicate votes", async () => {
    assert.equal(await settings({ p_hero_ban_seconds: 60, p_hero_bans_per_team: 2 }), true);
    await ok(patch({ phase: "hero_ban" }));
    const deadline = (await read()).hero_ban_deadline_at;
    const readBallot = () => ok(svc.from("balance_session_hero_votes")
      .select("pick_1,pick_2,pick_3").eq("session_id", roundId).eq("user_id", member.id));
    try {
      for (const hero of ["dmon", "domina", "hazard", "anran", "emre", "sierra", "shion", "vendetta", "jetpack_cat", "mizuki", "wuyang"]) {
        const result = await heroVote(member.client, deadline, [hero, "dva"]);
        assert.equal(result.error, null, `${hero}: ${result.error?.message}`);
        assert.deepEqual(await readBallot(), [{ pick_1: hero, pick_2: "dva", pick_3: null }]);
      }
      await Promise.all([["hazard"], ["hazard", "wuyang"], ["wuyang"], []]
        .map((picks) => ok(heroVote(member.client, deadline, picks))));
      await ok(heroVote(member.client, deadline, ["hazard", "wuyang"]));
      assert.deepEqual(await readBallot(), [{ pick_1: "hazard", pick_2: "wuyang", pick_3: null }]);
      for (const picks of [["hazard", "hazard"], ["hazard", "wuyang", "ana"], [null], ["unknown_hero"]]) {
        assert.ok((await heroVote(member.client, deadline, picks)).error);
        assert.deepEqual(await readBallot(), [{ pick_1: "hazard", pick_2: "wuyang", pick_3: null }]);
      }
      await ok(heroVote(member.client, deadline, []));
      assert.deepEqual(await readBallot(), []);
    } finally {
      assert.equal(await settings({ p_hero_ban_seconds: 5 }), true);
    }
  });

  await t.test(
    "hero ballots enforce lineup, abstention and atomic resolution/start with manager-only context",
    async () => {
      assert.equal(await settings({ p_hero_bans_per_team: 1 }), true);
      await ok(patch({ phase: "hero_ban" }));
      assert.ok((await heroVote()).error);
      assert.ok((await heroVote(member.client, undefined, ["invalid"])).error);
      await ok(heroVote(member.client, undefined, ["ana"]));
      await ok(heroVote(member.client, undefined, []));
      assert.equal(await countVotes("hero"), 0);
      await ok(heroVote(member.client, undefined, ["ana"]));
      assert.ok((await heroVote(reserve.client)).error);
      assert.equal((await member.client.from("balance_session_hero_votes").insert({
        session_id: roundId, user_id: member.id, pick_1: "ana", pick_2: "mercy", pick_3: "reinhardt",
      })).error?.code, "42501");
      assert.equal((await member.client.from("balance_session_hero_votes").update({ pick_1: "juno" })
        .eq("session_id", roundId).eq("user_id", member.id)).error?.code, "42501");
      assert.equal(await settings({ p_hero_ban_seconds: 6 }), true);
      assert.equal(await countVotes("hero"), 0);
      assert.equal((await read()).phase, "editing");
      assert.equal((await read()).resolved_map_label, "리장 타워");
      await ok(patch({ phase: "hero_ban" }));
      await ok(
        patch(
          { hero_ban_deadline_at: new Date(Date.now() - 1000).toISOString() },
          svc,
        ),
      );
      assert.ok((await heroVote()).error);
      const voting = await read();
      const context = { version: 1, bansPerTeam: 1, teams: { team1: [], team2: [] } };
      const memberWrite = await member.client.from("balance_sessions").update({ hero_ban_context: context }).eq("id", roundId).select("id");
      assert.ok(memberWrite.error || memberWrite.data?.length === 0);
      await ok(patch({ banned_heroes: [], hero_ban_deadline_at: null, hero_ban_context: context, phase: "match_live" }));
      const resolved = await read();
      assert.equal(resolved.phase, "match_live");
      assert.deepEqual(resolved.hero_ban_context, context);
      assert.deepEqual(resolved.banned_heroes, []);
      assert.ok(resolved.formation_revision > voting.formation_revision);
      await ok(patch({ phase: "match_live" }));
      assert.equal((await read()).phase, "match_live");
      assert.equal(await settings({ p_map_ban_seconds: 20 }), false);
      assert.ok((await patch({ map_ban_enabled: false })).error);
      assert.ok((await patch({ phase: "editing" })).error);
    },
  );

  await t.test(
    "next round inherits rules and map changes invalidate hero ballots",
    async () => {
      const completed = await read();
      assert.equal(
        (
          await ok(
            leader.client.rpc("set_balance_match_outcome", {
              p_session_id: roundId,
              p_outcome: "void",
            }),
          )
        ).ok,
        true,
      );
      ({ round_id: roundId } = await ok(
        leader.client.rpc("next_balance_round", {
          p_clan_id: clanId,
          p_round_id: roundId,
        }),
      ));
      const next = await read();
      assert.equal(next.map_ban_seconds, completed.map_ban_seconds);
      assert.equal(next.hero_ban_seconds, completed.hero_ban_seconds);
      assert.equal(next.hero_bans_per_team, completed.hero_bans_per_team);
      assert.deepEqual(next.map_types, completed.map_types);
      assert.equal(next.resolved_map_label, null);
      assert.equal(next.banned_heroes, null);
      assert.ok((await patch({ phase: "match_live" })).error);
      assert.equal(await settings({ p_map_ban: false }), true);
      await ok(patch({ resolved_map_label: "오아시스" }));
      await ok(patch({ phase: "hero_ban" }));
      await ok(heroVote(member.client, undefined, ["ana"]));
      await ok(patch({ resolved_map_label: "리장 타워" }));
      assert.equal((await read()).phase, "editing");
      assert.equal(await countVotes("hero"), 0);
      assert.equal((await read()).banned_heroes, null);
      assert.equal(await settings({ p_hero_ban: false }), true);
      await ok(patch({ phase: "match_live" }));
      // A map is required only on entry: old completed rows remain editable for
      // outcome/score changes without being rewritten by a table-wide constraint.
      await ok(patch({ ma_snapshot: {} }, svc));
    },
  );
});
