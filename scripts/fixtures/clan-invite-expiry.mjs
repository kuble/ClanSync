import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadTestEnv } from "../test-env.mjs";
import { parseEnvFile } from "../parse-env-file.mjs";

/** Expire only an isolated fixture's invite, using the allowlisted QA connection. */
export function expireClanInvite(clanId) {
  assert.match(clanId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const env = loadTestEnv();
  env.SUPABASE_ACCESS_TOKEN ||= parseEnvFile(".env.local").SUPABASE_ACCESS_TOKEN;
  const dir = mkdtempSync(resolve(".supabase-test/invite-test-"));
  const file = join(dir, "expire.sql");
  writeFileSync(file, `UPDATE private.clan_join_invites SET expires_at=clock_timestamp()-interval '1 second' WHERE clan_id='${clanId}'::uuid;`);
  try {
    const result = spawnSync(resolve("node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase"),
      ["db", "query", "--linked", "--workdir", ".supabase-test", "--file", file], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally { unlinkSync(file); rmdirSync(dir); }
}
