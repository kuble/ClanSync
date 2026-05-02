/**
 * `.env.local` 를 process.env 에 합친 뒤 `npx supabase <args>` 실행.
 * 사용: `node scripts/with-dotenv-local.mjs db push`
 */
import { resolve } from "path";
import { spawnSync } from "child_process";
import { parseEnvFile } from "./parse-env-file.mjs";

const root = resolve(process.cwd());
const local = parseEnvFile(resolve(root, ".env.local"));
for (const [k, v] of Object.entries(local)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("사용: node scripts/with-dotenv-local.mjs <supabase-args...>");
  process.exit(1);
}

const r = spawnSync("npx", ["supabase", ...args], {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: process.env,
});

process.exit(r.status ?? 1);
