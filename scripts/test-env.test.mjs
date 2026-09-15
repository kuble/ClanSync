import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertTestTarget, loadTestEnv, TEST_PROJECT_REF } from "./test-env.mjs";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${TEST_PROJECT_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-anon",
  SUPABASE_SERVICE_ROLE_KEY: "qa-service",
};

test("fixture writes reject production and unapproved hosts", () => {
  for (const url of [undefined, "https://mxkrfnzlgaxzdzcjbfkg.supabase.co", `${valid.NEXT_PUBLIC_SUPABASE_URL}.example.com`]) {
    assert.throws(() => assertTestTarget({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }));
  }
  assert.doesNotThrow(() => assertTestTarget(valid));
});

test("test env never falls back to production .env.local", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "clansync-test-env-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, ".env.local"), Object.entries(valid).map(([k, v]) => `${k}=${v}`).join("\n"));
  assert.throws(() => loadTestEnv({ cwd, env: {} }));
  writeFileSync(join(cwd, ".env.e2e.local"), Object.entries(valid).map(([k, v]) => `${k}=${v}`).join("\n"));
  assert.equal(loadTestEnv({ cwd, env: {} }).SUPABASE_SERVICE_ROLE_KEY, "qa-service");
  assert.throws(() => loadTestEnv({ cwd, env: { NEXT_PUBLIC_SUPABASE_URL: "https://production.supabase.co" } }));
  assert.throws(() => loadTestEnv({ cwd, env: { SUPABASE_SERVICE_ROLE_KEY: "" } }));
});
