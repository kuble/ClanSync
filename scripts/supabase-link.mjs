/**
 * NEXT_PUBLIC_SUPABASE_URL 에서 project ref 를 뽑아 `supabase link` 실행.
 * 선행: `npx supabase login` (또는 SUPABASE_ACCESS_TOKEN)
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

const url =
  local.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

if (!url) {
  console.error(
    "[supabase-link] NEXT_PUBLIC_SUPABASE_URL 가 .env.local 또는 환경변수에 필요합니다.",
  );
  process.exit(1);
}

const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const ref = m?.[1];
if (!ref) {
  console.error("[supabase-link] URL 에서 project ref 를 파싱할 수 없습니다:", url);
  process.exit(1);
}

console.error(`[supabase-link] project-ref=${ref}`);

const r = spawnSync(
  "npx",
  ["supabase", "link", "--project-ref", ref, "--yes"],
  { stdio: "inherit", cwd: root, shell: true, env: process.env },
);

process.exit(r.status ?? 1);
