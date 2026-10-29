import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTestEnv, TEST_PROJECT_REF } from "./test-env.mjs";
import { parseEnvFile } from "./parse-env-file.mjs";

const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");
assert(process.argv.slice(2).every(arg => ["--apply", "--check"].includes(arg)) && !(apply && check), "Usage: node scripts/reset-qa-cosmetics.mjs [--apply|--check]");
const qa = loadTestEnv();
const workdir = resolve(".supabase-test");
assert.equal(readFileSync(resolve(workdir, "supabase/.temp/project-ref"), "utf8").trim(), TEST_PROJECT_REF);
const env = { ...process.env, SUPABASE_ACCESS_TOKEN: qa.SUPABASE_ACCESS_TOKEN || parseEnvFile(".env.local").SUPABASE_ACCESS_TOKEN };
assert(env.SUPABASE_ACCESS_TOKEN, "Supabase management authentication required");
function query(sql) {
  const sqlFile = resolve(workdir, "cosmetic-reset-query.sql");
  writeFileSync(sqlFile, sql);
  const result = spawnSync(resolve("node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase"), ["db", "query", "--file", sqlFile, "--linked", "--workdir", workdir, "--output", "json"], { env, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || "QA SQL failed");
  return JSON.parse(result.stdout).rows;
}
const tables = ["store_items", "nameplate_options", "purchases", "user_nameplate_inventory", "user_namecard_selections", "coin_transactions"];
const snapshotQuery = `select jsonb_build_object(${tables.map(table => `'${table}',(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${table} t)`).join(",")},
  'balances',(select jsonb_agg(jsonb_build_object('id',id,'coin_balance',coin_balance) order by id) from public.users),
  'clans',(select jsonb_agg(jsonb_build_object('id',id,'banner_url',banner_url,'coin_balance',coin_balance) order by id) from public.clans)) as snapshot`;
const snapshot = query(snapshotQuery)[0].snapshot;
const retired = snapshot.nameplate_options.filter(row => /^(symbol-|starter-|theme-|pf_entrance_store:)/.test(row.code) || ["title-team-player", "title-dawn-strategist", "title-clan-companion"].includes(row.code));
console.log(JSON.stringify({ project: TEST_PROJECT_REF, mode: apply ? "apply" : check ? "check" : "preview", retiredOptions: retired.length, selections: snapshot.user_namecard_selections.length, inventory: snapshot.user_nameplate_inventory.length, purchases: snapshot.purchases.length }));
if (check) {
  query("BEGIN;" + readFileSync(new URL("./reset-qa-cosmetics.sql", import.meta.url), "utf8") + "ROLLBACK;");
  assert.deepEqual(query(snapshotQuery)[0].snapshot, snapshot, "Rollback must preserve the entire cosmetic/coin snapshot");
  console.log("Atomic cleanup and preservation assertions passed; all changes rolled back.");
}
if (apply) {
  const backup = resolve(workdir, `cosmetics-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  mkdirSync(workdir, { recursive: true });
  writeFileSync(backup, JSON.stringify(snapshot, null, 2));
  const result = query(readFileSync(new URL("./reset-qa-cosmetics.sql", import.meta.url), "utf8"));
  console.log(JSON.stringify({ backup, result }));
}
