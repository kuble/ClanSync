import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv, TEST_PROJECT_REF } from "./test-env.mjs";

// QA only. Keep the retired schema/bucket; remove their records and files.
const env = loadTestEnv();
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = client.storage.from("profile-photos");
async function ok(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
async function rows() {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await ok(client.from("account_profile_photos").select("user_id,image_path").order("user_id").range(offset, offset + 999));
    result.push(...page);
    if (page.length < 1000) return result;
  }
}
async function files(prefix = "") {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await ok(bucket.list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } }));
    for (const item of page) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) result.push(path);
      else result.push(...await files(path));
    }
    if (page.length < 1000) return result;
  }
}

const records = await rows(), paths = await files();
const referenced = new Set(records.map(row => row.image_path).filter(Boolean));
console.log(JSON.stringify({ project: TEST_PROJECT_REF, records: records.length, files: paths.length, orphanFiles: paths.filter(path => !referenced.has(path)).length, apply: process.argv.includes("--apply") }));
if (process.argv.includes("--apply")) {
  // Storage API removes actual objects; deleting storage.objects in SQL would not.
  for (let offset = 0; offset < paths.length; offset += 100) await ok(bucket.remove(paths.slice(offset, offset + 100)));
  assert.equal((await files()).length, 0, "Profile photo files remain; records were not removed");
  for (let offset = 0; offset < records.length; offset += 100) {
    await ok(client.from("account_profile_photos").delete().in("user_id", records.slice(offset, offset + 100).map(row => row.user_id)));
  }
  assert.equal((await rows()).length, 0, "Profile photo records remain");
  console.log(JSON.stringify({ verified: true, remainingRecords: 0, remainingFiles: 0 }));
}
