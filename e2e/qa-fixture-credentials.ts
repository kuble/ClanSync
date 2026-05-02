/**
 * Playwright에서 QA 픽스처 계정 접근 — 규칙 단일 출처: scripts/fixtures/qa-fixtures.mjs
 * `.env.local` 없이도 이메일·비밀번호를 알 수 있음(저장소 커밋된 QA 전용 값).
 */
import {
  FIXTURE_PASSWORD,
  qaFixtureEmail,
  QA_SEED_ACCOUNTS,
} from "../scripts/fixtures/qa-fixtures.mjs";

export type FixtureRolePascal = "Member" | "Leader" | "Admin";

export function credentialsForFixture(
  role: FixtureRolePascal,
  numbering = "01",
): { email: string; password: string } {
  return {
    email: qaFixtureEmail(role, numbering),
    password: FIXTURE_PASSWORD,
  };
}

/**
 * 온보딩 등 Member 기준 플로.
 * `E2E_EMAIL`·`E2E_PASSWORD` 둘 다 있으면 다른 Supabase 프로젝트 디버그용으로 우선.
 */
export function credentialsForOnboarding(): { email: string; password: string } {
  const e = process.env.E2E_EMAIL?.trim();
  const p = process.env.E2E_PASSWORD?.trim();
  if (e && p) return { email: e, password: p };
  return credentialsForFixture("Member");
}

/** `npm run db:seed` 로 만들어진 QA 계정 목록(비밀번호 공통). */
export function allSeededFixtureCredentials(): Array<{
  rolePascal: string;
  numbering: string;
  nickname: string;
  email: string;
  password: string;
}> {
  return QA_SEED_ACCOUNTS.map((a) => ({
    rolePascal: a.rolePascal,
    numbering: a.numbering,
    nickname: a.nickname,
    email: qaFixtureEmail(a.rolePascal, a.numbering),
    password: FIXTURE_PASSWORD,
  }));
}
