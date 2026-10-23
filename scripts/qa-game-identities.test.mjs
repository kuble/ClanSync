import { test } from "node:test";
import assert from "node:assert/strict";
import { QA_SEED_ACCOUNTS, qaFixtureBattleTag } from "./fixtures/qa-fixtures.mjs";
import { qaIdentityPatch } from "./qa-game-identities.mjs";

test("QA identities are unique, valid, allowlisted and preserve existing display/provider IDs", () => {
  const tags = QA_SEED_ACCOUNTS.map((a) => qaFixtureBattleTag(a.rolePascal, a.numbering));
  assert.equal(new Set(tags).size, 14);
  assert.ok(tags.every((tag) => /^[A-Za-z0-9]{2,20}#[0-9]{4,10}$/.test(tag)));
  assert.throws(() => qaFixtureBattleTag("Leader", "99"));
  const account = QA_SEED_ACCOUNTS.find((a) => a.rolePascal === "Leader");
  const base = { games: { slug: "overwatch" }, game_uid: "stable-provider", battle_tag: null, is_verified: true };
  assert.deepEqual(qaIdentityPatch(account, base), { battle_tag: "QALeader01#1001" });
  assert.deepEqual(qaIdentityPatch(account, { ...base, battle_tag: "Existing#1234" }), {});
  assert.deepEqual(qaIdentityPatch(account, { ...base, games: { slug: "valorant" }, riot_id: null, is_verified: false }), { riot_id: "QALeader01#QA1", is_verified: true });
  assert.deepEqual(qaIdentityPatch(account, { ...base, games: { slug: "pubg" }, is_verified: false }), {});
});
