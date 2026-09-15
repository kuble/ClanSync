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

test("clan notices and rules require active membership and officer permissions", async (t) => {
  const users = [];
  const tag = randomUUID().slice(0, 8);
  let clanId;
  t.after(async () => {
    if (clanId) await ok(svc.from("clans").delete().eq("id", clanId));
    for (const user of users) {
      await ok(user.client.auth.signOut());
      await ok(svc.auth.admin.deleteUser(user.id));
    }
  });
  for (let index = 0; index < 4; index++) {
    const email = `notice-${tag}-${index}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { user } = await ok(
      svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `nt_${tag}_${index}`, birth_year: 2000 },
      }),
    );
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
    );
    users.push({ id: user.id, client });
    await ok(client.auth.signInWithPassword({ email, password }));
  }
  const [leader, officer, member, outsider] = users;
  const game = await ok(
    svc.from("games").select("id").eq("slug", "overwatch").single(),
  );
  const clan = await ok(
    svc
      .from("clans")
      .insert({ game_id: game.id, name: `Notice-${tag}` })
      .select("id")
      .single(),
  );
  clanId = clan.id;
  await ok(
    svc.from("clan_members").insert([
      { clan_id: clanId, user_id: leader.id, role: "leader", status: "active" },
      {
        clan_id: clanId,
        user_id: officer.id,
        role: "officer",
        status: "active",
      },
      { clan_id: clanId, user_id: member.id, role: "member", status: "active" },
    ]),
  );
  const read = (client) =>
    client.from("clan_notices").select("*").eq("clan_id", clanId);
  const rules = (client, text) =>
    client.rpc("update_clan_rules", { p_clan_id: clanId, p_rules: text });
  let noticeId;
  await t.test(
    "leader creates a notice with authenticated author defaults",
    async () => {
      const notice = await ok(
        leader.client
          .from("clan_notices")
          .insert({
            clan_id: clanId,
            title: "클랜 공지",
            content: "함께 지킬 약속",
            is_pinned: true,
          })
          .select("*")
          .single(),
      );
      noticeId = notice.id;
      assert.equal(notice.created_by, leader.id);
      assert.equal(notice.updated_by, leader.id);
    },
  );
  await t.test(
    "officer edits and pins a different officer's notice",
    async () => {
      const notice = await ok(
        officer.client
          .from("clan_notices")
          .update({
            title: "수정한 공지",
            is_pinned: false,
            updated_by: officer.id,
          })
          .eq("id", noticeId)
          .select("*")
          .single(),
      );
      assert.equal(notice.title, "수정한 공지");
      assert.equal(notice.is_pinned, false);
      assert.equal(notice.created_by, leader.id);
      assert.equal(notice.updated_by, officer.id);
    },
  );
  await t.test(
    "only active members can read and only officers can write",
    async () => {
      assert.equal((await ok(read(member.client))).length, 1);
      assert.deepEqual(await ok(read(outsider.client)), []);
      assert.ok((await read(anon)).error);
      assert.ok(
        (
          await member.client.from("clan_notices").insert({
            clan_id: clanId,
            title: "권한 없음",
            content: "권한 없음",
          })
        ).error,
      );
      assert.deepEqual(
        await ok(
          member.client
            .from("clan_notices")
            .delete()
            .eq("id", noticeId)
            .select("id"),
        ),
        [],
      );
      await ok(
        svc
          .from("clan_members")
          .update({ status: "left" })
          .eq("clan_id", clanId)
          .eq("user_id", officer.id),
      );
      assert.deepEqual(await ok(read(officer.client)), []);
      assert.ok((await rules(officer.client, "권한 없음")).error);
      await ok(
        svc
          .from("clan_members")
          .update({ status: "active" })
          .eq("clan_id", clanId)
          .eq("user_id", officer.id),
      );
    },
  );
  await t.test(
    "author, timestamps and clan cannot be reassigned and input is constrained",
    async () => {
      for (const changes of [
        { clan_id: randomUUID() },
        { created_by: officer.id },
        { created_at: new Date().toISOString() },
        { title: " " },
        { content: " " },
        { title: "x".repeat(201) },
        { updated_by: leader.id },
      ]) {
        assert.ok(
          (
            await officer.client
              .from("clan_notices")
              .update(changes)
              .eq("id", noticeId)
          ).error,
        );
      }
      assert.ok(
        (
          await leader.client.from("clan_notices").insert({
            clan_id: clanId,
            title: "위조 작성자",
            content: "내용",
            created_by: officer.id,
          })
        ).error,
      );
    },
  );
  await t.test(
    "rules accept officer changes and reject direct unauthorized RPC calls",
    async () => {
      for (const client of [anon, svc, member.client, outsider.client]) {
        assert.ok((await rules(client, "권한 없음")).error);
      }
      assert.ok((await rules(officer.client, "x".repeat(20001))).error);
      await ok(rules(officer.client, "  서로 존중해요.  "));
      const updated = await ok(
        svc
          .from("clans")
          .select("rules,coin_balance")
          .eq("id", clanId)
          .single(),
      );
      assert.equal(updated.rules, "서로 존중해요.");
      assert.equal(updated.coin_balance, 0);
      await ok(rules(leader.client, ""));
      const cleared = await ok(
        svc.from("clans").select("rules").eq("id", clanId).single(),
      );
      assert.equal(cleared.rules, null);
    },
  );
  await t.test("officer deletes the notice", async () => {
    const deleted = await ok(
      officer.client
        .from("clan_notices")
        .delete()
        .eq("id", noticeId)
        .select("id"),
    );
    assert.equal(deleted.length, 1);
    assert.deepEqual(await ok(read(member.client)), []);
  });
});
