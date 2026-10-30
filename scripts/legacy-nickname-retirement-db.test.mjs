import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";

test("nickname columns stay retired while game IDs, account data and record names remain independent", async (t) => {
  const f = await createIsolatedBalanceFixture(1);
  const owner = await f.memberClient(0);
  t.after(async () => { await owner.auth.signOut(); await f.cleanup(); });
  const userId = f.users[0].id;
  async function ok(query) { const { data, error } = await query; assert.equal(error, null, error?.message); return data; }
  for (const table of ["users", "user_game_profiles"]) {
    assert.equal((await f.service.from(table).select("nickname").limit(1)).error?.code, "42703");
  }
  const before = await ok(f.service.from("users").select("*").eq("id", userId).single());
  assert.equal(before.birth_year, 2000);
  assert.equal("nickname" in before, false);
  assert.equal((await ok(f.service.auth.admin.getUserById(userId))).user.user_metadata.nickname, undefined);
  assert.ok((await owner.from("users").update({ nickname: "retired" }).eq("id", userId)).error);
  const guestId = randomUUID();
  await ok(f.service.from("clan_participants").insert({ clan_id: f.clanId, id: guestId, is_guest: true, nickname: "기존 게스트 기록명" }));
  const room = await ok(f.service.from("balance_rooms").insert({ game_id: f.gameId, clan_id: f.clanId, kind: "regular", status: "scheduled", title: "기록명 보존", created_by: userId, scheduled_at: new Date(Date.now() + 86_400_000).toISOString() }).select("id,operator_name").single());
  assert.equal(room.operator_name, f.users[0].nickname);
  await ok(owner.rpc("save_my_game_identity", { p_game_slug: "overwatch", p_identity: "Changed#9876" }));
  assert.deepEqual(await ok(f.service.from("users").select("*").eq("id", userId).single()), before);
  assert.equal((await ok(f.service.from("balance_rooms").select("operator_name").eq("id", room.id).single())).operator_name, room.operator_name);
  assert.equal((await ok(f.service.from("clan_participants").select("nickname").eq("clan_id", f.clanId).eq("id", guestId).single())).nickname, "기존 게스트 기록명");
  const peers = await ok(owner.rpc("clan_peer_nicknames", { p_clan_id: f.clanId }));
  assert.equal(peers.find(row => row.user_id === userId)?.nickname, "Changed#9876");
});
