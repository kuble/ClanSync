import { copyFileSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnvFile } from "./parse-env-file.mjs";
import { loadTestEnv, TEST_PROJECT_REF } from "./test-env.mjs";

const action = process.argv[2];
if (!["push", "types", "list"].includes(action)) {
  throw new Error("Usage: node scripts/supabase-test.mjs push|types|list");
}
const env = loadTestEnv();
env.SUPABASE_ACCESS_TOKEN ||= parseEnvFile(".env.local").SUPABASE_ACCESS_TOKEN;
if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_DB_PASSWORD) {
  throw new Error("Supabase management token and test DB password are required");
}
const workdir = resolve(".supabase-test");
mkdirSync(resolve(workdir, "supabase"), { recursive: true });
copyFileSync("supabase/config.toml", resolve(workdir, "supabase/config.toml"));
cpSync("supabase/migrations", resolve(workdir, "supabase/migrations"), { recursive: true });
const cli = resolve("node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase");

function run(args, capture = false) {
  const result = spawnSync(cli, [...args, "--workdir", workdir], {
    env,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

// A separate CLI workdir keeps supabase/.temp linked to the existing main project.
run(["link", "--project-ref", TEST_PROJECT_REF, "--yes"]);
if (action === "push") run(["db", "push", "--linked", "--yes"]);
if (action === "list") run(["migration", "list", "--linked"]);
if (action === "types") {
  const types = run(["gen", "types", "typescript", "--linked", "--schema", "public"], true);
  writeFileSync(resolve(workdir, "database.types.ts"), types);
  console.log("Test DB types generated: .supabase-test/database.types.ts");
}
