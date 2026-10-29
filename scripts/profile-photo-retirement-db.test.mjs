import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

test("retired profile photo table and bucket are absent in QA", async () => {
  const env = loadTestEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const table = await client.from("account_profile_photos").select("user_id").limit(1);
  assert.ok(["PGRST205", "42P01"].includes(table.error?.code), "Retired table is still exposed");
  const bucket = await client.storage.getBucket("profile-photos");
  assert.equal(bucket.error?.message, "Bucket not found");
  assert.equal(bucket.data, null);
});
