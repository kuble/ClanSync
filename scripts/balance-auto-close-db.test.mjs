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

async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}

test("balance sessions honor clan inactivity settings", async (t) => {
  const tag = randomUUID().slice(0, 8);
  const users = [];
  let clanId;

  t.after(async () => {
    if (clanId) await ok(svc.from("clans").delete().eq("id", clanId));
    for (const user of users) {
      await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });

  for (const role of ["leader", "member"]) {
    const email = `auto-close-${role}-${tag}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(
      svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `${role}_${tag}`, birth_year: 2000 },
      }),
    );
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
    );
    await ok(client.auth.signInWithPassword({ email, password }));
    users.push({ id: user.id, client, role });
  }

  const [leader, member] = users;
  const game = await ok(
    svc.from("games").select("id").eq("slug", "overwatch").single(),
  );
  const clan = await ok(
    svc
      .from("clans")
      .insert({ game_id: game.id, name: `Auto-${tag}` })
      .select("id, balance_auto_close_enabled, balance_auto_close_hours")
      .single(),
  );
  clanId = clan.id;
  assert.equal(clan.balance_auto_close_enabled, true);
  assert.equal(clan.balance_auto_close_hours, 3);

  await ok(
    svc.from("clan_members").insert(
      users.map((user) => ({
        clan_id: clanId,
        user_id: user.id,
        role: user.role,
        status: "active",
      })),
    ),
  );

  const settingArgs = {
    p_clan_id: clanId,
    p_enabled: false,
    p_hours: 1,
  };
  assert.ok(
    (await member.client.rpc("update_balance_auto_close_settings", settingArgs))
      .error,
  );
  await ok(leader.client.rpc("update_balance_auto_close_settings", settingArgs));
  assert.deepEqual(
    await ok(
      member.client
        .from("clans")
        .update({ balance_auto_close_hours: 2 })
        .eq("id", clanId)
        .select("id"),
    ),
    [],
  );
  assert.ok(
    (await member.client.rpc("close_stale_balance_sessions", {})).error,
  );

  const opened = await ok(
    leader.client.rpc("open_balance_session_series", { p_clan_id: clanId }),
  );
  const staleAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await ok(
    svc
      .from("balance_session_series")
      .update({ last_activity_at: staleAt })
      .eq("id", opened.series_id),
  );
  assert.equal((await ok(svc.rpc("close_stale_balance_sessions", {}))).closed, 0);

  await ok(
    leader.client
      .from("balance_sessions")
      .update({ map_ban_enabled: true })
      .eq("id", opened.round_id),
  );
  const touched = await ok(
    svc
      .from("balance_session_series")
      .select("last_activity_at")
      .eq("id", opened.series_id)
      .single(),
  );
  assert.ok(Date.parse(touched.last_activity_at) > Date.parse(staleAt));

  await ok(
    leader.client.rpc("update_balance_auto_close_settings", {
      ...settingArgs,
      p_enabled: true,
    }),
  );
  await ok(
    svc
      .from("balance_session_series")
      .update({ last_activity_at: staleAt })
      .eq("id", opened.series_id),
  );
  assert.equal((await ok(svc.rpc("close_stale_balance_sessions", {}))).closed, 1);

  const series = await ok(
    svc
      .from("balance_session_series")
      .select("closed_at")
      .eq("id", opened.series_id)
      .single(),
  );
  const round = await ok(
    svc
      .from("balance_sessions")
      .select("closed_at, match_outcome")
      .eq("id", opened.round_id)
      .single(),
  );
  assert.ok(series.closed_at);
  assert.ok(round.closed_at);
  assert.equal(round.match_outcome, "void");
});
