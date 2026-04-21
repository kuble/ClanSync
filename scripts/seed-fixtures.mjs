/**
 * 로컬·staging 픽스처 계정 1개 생성 (D-DEV-01).
 * 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QA_SEED_PASSWORD (.env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const p = join(__dirname, "..", ".env.local");
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
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
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // .env.local 없음 — CI 등에서는 환경변수 직접 주입
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.QA_SEED_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error(
    "[seed] NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QA_SEED_PASSWORD 가 필요합니다.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("[seed] QA_SEED_PASSWORD 는 D-AUTH-03 최소 8자 이상이어야 합니다.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = "fixture-solo@clansync-qa.local";

const { error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    nickname: "픽스처솔로",
    birth_year: 2000,
    gender: "undisclosed",
    auto_login: false,
  },
});

if (error) {
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered")) {
    console.log("[seed] 이미 존재:", email);
    process.exit(0);
  }
  console.error("[seed] createUser 실패:", error.message);
  process.exit(1);
}

console.log("[seed] 생성됨:", email);
