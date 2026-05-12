/**
 * 로컬·staging 픽스처 — D-DEV-01.
 * 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 계정·비밀번호·클랜 이름 규칙: scripts/fixtures/qa-fixtures.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  FIXTURE_PASSWORD,
  QA_SEED_ACCOUNTS,
  QA_SEED_CLANS,
  qaFixtureEmail,
} from "./fixtures/qa-fixtures.mjs";

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
const password = FIXTURE_PASSWORD;

if (!url || !serviceKey) {
  console.error(
    "[seed] NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("[seed] 픽스처 비밀번호는 D-AUTH-03 최소 8자 이상이어야 합니다.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * @param {string} email
 * @param {{ nickname: string }} meta
 */
async function ensureAuthUser(email, meta) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nickname: meta.nickname,
      birth_year: 2000,
      gender: "undisclosed",
      auto_login: false,
    },
  });

  if (!error && data.user) {
    console.log("[seed] 생성됨:", email);
    return data.user.id;
  }

  const msg = (error?.message ?? "").toLowerCase();
  if (
    msg.includes("already") ||
    msg.includes("registered") ||
    msg.includes("duplicate")
  ) {
    const { data: row, error: selErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (selErr) {
      console.error("[seed] 기존 사용자 조회 실패:", selErr.message);
      process.exit(1);
    }
    if (!row?.id) {
      console.error("[seed] 이메일은 있으나 public.users 없음:", email);
      process.exit(1);
    }
    console.log("[seed] 이미 존재:", email);
    return row.id;
  }

  console.error("[seed] createUser 실패:", error?.message);
  process.exit(1);
}

const userIds = [];
for (const acc of QA_SEED_ACCOUNTS) {
  const email = qaFixtureEmail(acc.rolePascal, acc.numbering);
  const id = await ensureAuthUser(email, { nickname: acc.nickname });
  userIds.push(id);
}

/**
 * D-AUTH-01 — 게임 하위 라우트·MainClan 진입을 위해 픽스처 계정에 검증된 게임 프로필 부여 (QA 전용).
 */
async function ensureVerifiedGameProfiles(ids, gameSlug) {
  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (gErr || !game?.id) {
    console.error(`[seed] game slug='${gameSlug}' 없음`);
    process.exit(1);
  }

  for (const uid of ids) {
    const suffix = uid.replace(/-/g, "").slice(0, 12);
    const { error } = await supabase.from("user_game_profiles").upsert(
      {
        user_id: uid,
        game_id: game.id,
        game_uid: `qa_seed_${suffix}`,
        is_verified: true,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "user_id,game_id" },
    );
    if (error) {
      console.error("[seed] user_game_profiles upsert 실패:", error.message);
      process.exit(1);
    }
  }
  console.log(`[seed] ${gameSlug} user_game_profiles (${ids.length}명)`);
}

await ensureVerifiedGameProfiles(userIds, "overwatch");

for (const clanDef of QA_SEED_CLANS) {
  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id")
    .eq("slug", clanDef.gameSlug)
    .maybeSingle();

  if (gErr) {
    console.error("[seed] games 조회 실패:", gErr.message);
    process.exit(1);
  }
  if (!game?.id) {
    console.error(
      `[seed] game slug='${clanDef.gameSlug}' 를 찾을 수 없습니다.`,
    );
    process.exit(1);
  }

  const leaderId = userIds[clanDef.leaderAccountIndex];
  if (!leaderId) {
    console.error("[seed] 리더 계정 인덱스 오류:", clanDef.leaderAccountIndex);
    process.exit(1);
  }

  const { data: existingClan } = await supabase
    .from("clans")
    .select("id")
    .eq("game_id", game.id)
    .eq("name", clanDef.name)
    .maybeSingle();

  let clanId = existingClan?.id;
  if (!clanId) {
    const { data: inserted, error: cErr } = await supabase
      .from("clans")
      .insert({
        game_id: game.id,
        name: clanDef.name,
      })
      .select("id")
      .single();

    if (cErr) {
      console.error("[seed] 클랜 insert 실패:", cErr.message);
      process.exit(1);
    }
    clanId = inserted.id;
    console.log("[seed] 클랜 생성:", clanDef.name);
  } else {
    console.log("[seed] 클랜 이미 존재:", clanDef.name);
  }

  const { data: existingMem } = await supabase
    .from("clan_members")
    .select("id, role, status")
    .eq("clan_id", clanId)
    .eq("user_id", leaderId)
    .maybeSingle();

  if (!existingMem) {
    const { error: mErr } = await supabase.from("clan_members").insert({
      clan_id: clanId,
      user_id: leaderId,
      role: "leader",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (mErr) {
      console.error("[seed] clan_members insert 실패:", mErr.message);
      process.exit(1);
    }
    console.log("[seed] 클랜 리더 연결:", clanDef.name);
  } else {
    console.log("[seed] 리더 멤버십 이미 존재:", clanDef.name);
  }

  const { error: tierErr } = await supabase
    .from("clans")
    .update({ subscription_tier: "premium" })
    .eq("id", clanId);
  if (tierErr) {
    console.error(
      `[seed] QA 클랜 subscription_tier(premium) 갱신 실패:`,
      tierErr.message,
    );
    process.exit(1);
  }
  console.log(`[seed] QA 클랜 premium 보장: ${clanDef.name}`);
}

console.log("[seed] 완료 (비밀번호는 qa-fixtures.mjs FIXTURE_PASSWORD 와 동일).");
