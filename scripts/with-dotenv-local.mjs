/**
 * `.env.local` 를 process.env 에 합친 뒤 `npx supabase <args>` 실행.
 * 사용: `node scripts/with-dotenv-local.mjs db push`
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

function loadDotenv(path) {
  if (!existsSync(path)) return {};
  const o = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[k] = v;
  }
  return o;
}

const root = resolve(process.cwd());
const local = loadDotenv(resolve(root, ".env.local"));
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
