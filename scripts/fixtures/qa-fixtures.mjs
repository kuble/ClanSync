/**
 * 로컬·staging QA 픽스처 네이밍 단일 출처 (시드·Playwright 문서와 동기화).
 *
 * 규칙:
 * - 이메일 로컬파트: QA_[Role]_[numbering]@
 * - 닉네임: QA_[Role]_[numbering]
 * - 비밀번호: 고정 (FIXTURE_PASSWORD)
 * - 클랜 표시 이름: QA_[numbering]_Clan
 */

export const FIXTURE_EMAIL_DOMAIN = "clansync-qa.local";

/** QA 픽스처 공통 비밀번호 (로컬·staging 전용). */
export const FIXTURE_PASSWORD = "qwer1234#";

/**
 * @param {string} rolePascal Member, Leader, Admin 등 PascalCase
 * @param {string} numbering 예: 01
 */
export function qaFixtureEmail(rolePascal, numbering) {
  return `QA_${rolePascal}_${numbering}@${FIXTURE_EMAIL_DOMAIN}`;
}

/** 시드 순서 중 인덱스 1이 QA_01_Clan 리더 */
export const QA_SEED_ACCOUNTS = [
  { rolePascal: "Member", numbering: "01", nickname: "QA_Member_01" },
  { rolePascal: "Leader", numbering: "01", nickname: "QA_Leader_01" },
  { rolePascal: "Admin", numbering: "01", nickname: "QA_Admin_01" },
];

export const QA_SEED_CLANS = [
  {
    gameSlug: "overwatch",
    name: "QA_01_Clan",
    leaderAccountIndex: 1,
  },
];

/** 온보딩 E2E 기본 계정 */
export const DEFAULT_E2E_EMAIL = qaFixtureEmail("Member", "01");
