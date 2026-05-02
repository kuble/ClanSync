/**
 * E2E 변수가 Playwright와 동일 규칙으로 로드되는지 점검 (비밀번호는 길이만).
 * 사용: npm run test:e2e:env-check
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../scripts/parse-env-file.mjs";
import {
  FIXTURE_PASSWORD,
  qaFixtureEmail,
  QA_SEED_ACCOUNTS,
} from "../scripts/fixtures/qa-fixtures.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const fromEnv = parseEnvFile(resolve(root, ".env"));
const fromLocal = parseEnvFile(resolve(root, ".env.local"));
const merged = { ...fromEnv, ...fromLocal };

const email = (merged.E2E_EMAIL ?? "").trim();
const password = (merged.E2E_PASSWORD ?? "").trim();

const at = email.indexOf("@");
const mask =
  at > 0 ? `***@${email.slice(at + 1)}` : email ? "***" : "(없음)";

console.log("--- 코드 기본 픽스처 (db:seed 후 사용) ---");
console.log(
  "계정:",
  QA_SEED_ACCOUNTS.map((a) => qaFixtureEmail(a.rolePascal, a.numbering)).join(
    ", ",
  ),
);
console.log("비밀번호 글자 수:", FIXTURE_PASSWORD.length);

console.log("\n--- .env 오버라이드 (선택, 온보딩 Member만) ---");
console.log("E2E_EMAIL (마스킹):", mask);
console.log("E2E_PASSWORD 길이:", password.length || "(미설정)");

const partial =
  Boolean(email) !== Boolean(password);
if (partial) {
  console.log(
    "\n⚠ E2E_EMAIL 과 E2E_PASSWORD 는 둘 다 두거나 둘 다 빼세요.",
  );
} else if (email && password) {
  console.log(
    "\n온보딩 테스트는 위 오버라이드 계정을 씁니다. 비밀번호 글자 수가 수동 로그인과 같은지 확인하세요.",
  );
  console.log(
    "`#` 포함 비번은 공통 파서(`parse-env-file`)로 전체가 유지되는지 확인하세요.",
  );
} else {
  console.log(
    "\n오버라이드 없음 → Playwright는 qa-fixtures.mjs 규칙으로 로그인합니다.",
  );
}
