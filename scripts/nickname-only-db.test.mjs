import { test } from "node:test";
import assert from "node:assert/strict";
import { createIsolatedBalanceFixture } from "../e2e/isolated-balance-fixture.ts";

test("nickname-only defaults, saves and rejects invalid values and member writes", async (t) => {
  const f = await createIsolatedBalanceFixture(2);
  const owner = await f.memberClient(0), member = await f.memberClient(1);
  t.after(async () => { await Promise.all([owner.auth.signOut(), member.auth.signOut()]); await f.cleanup(); });
  const created = await owner.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: "regular", p_title: "Nickname display check" });
  assert.equal(created.error, null, created.error?.message);
  const settings = { roles: "manual", teams: "keep", auctionBudget: 1000, minBid: 10, durationSeconds: 20, auctionPreparationSeconds: 5, bidExtensionSeconds: 5, auctionItemsEnabled: false, strategySeconds: 30 };
  async function save(extra, actor = owner) {
    const round = await f.activeRound();
    return actor.rpc("set_balance_prematch_settings", { p_round_id: round.id, p_clan_id: f.clanId, p_revision: round.formation_revision, p_settings: { ...settings, ...extra }, p_map_ban: false, p_hero_ban: false, p_map_ban_seconds: 30, p_hero_ban_seconds: 30, p_map_types: ["control"], p_hero_bans_per_team: 1 });
  }
  assert.equal((await save({})).error, null);
  assert.equal((await f.activeRound()).formation_settings.nicknameOnly, true);
  assert.equal((await save({ nicknameOnly: false })).error, null);
  assert.equal((await f.activeRound()).formation_settings.nicknameOnly, false);
  assert.equal((await save({ nicknameOnly: true })).error, null);
  assert.equal((await f.activeRound()).formation_settings.nicknameOnly, true);
  for (const value of [null, "true", 1]) assert.ok((await save({ nicknameOnly: value })).error);
  assert.ok((await save({ nicknameOnly: false }, member)).error);
  assert.equal((await f.activeRound()).formation_settings.nicknameOnly, true);
});
