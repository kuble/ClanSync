import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { loadTestEnv } from "../test-env.mjs";
import { assertLocalWorkdir, container, runtimeEnv } from "../local-tests/runtime.mjs";

/** Expire an isolated fixture only in the dedicated local test container. */
export function expireClanInvite(clanId) {
  assert.match(clanId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const env = loadTestEnv();
  assertLocalWorkdir();
  const sql = `UPDATE private.clan_join_invites SET expires_at=clock_timestamp()-interval '1 second' WHERE clan_id='${clanId}'::uuid;`;
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { env: { ...env, PATH: runtimeEnv.PATH }, input: sql, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}
