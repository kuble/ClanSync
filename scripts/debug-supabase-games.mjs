/**
 * `.env.local` 기준으로 Supabase `games` 조회만 수행 (Next/쿠키 없음).
 * 사용: node scripts/debug-supabase-games.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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
const env = loadDotenv(resolve(root, ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url || "(missing)");
console.log("ANON_KEY prefix:", anon ? `${anon.slice(0, 12)}…` : "(missing)");

if (!url || !anon) {
  console.error("\nFAIL: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 없음");
  process.exit(1);
}

const supabase = createClient(url, anon);
const { data, error } = await supabase
  .from("games")
  .select("id, slug, name_ko")
  .order("slug");

if (error) {
  console.error("\nFAIL: PostgREST error");
  console.error("  code:", error.code);
  console.error("  message:", error.message);
  console.error("  details:", error.details);
  console.error("  hint:", error.hint);
  process.exit(1);
}

console.log("\nOK: games rows =", data?.length ?? 0);
for (const g of data ?? []) {
  console.log(" ", g.slug, g.name_ko);
}
process.exit(0);
