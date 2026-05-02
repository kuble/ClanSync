/**
 * E2E 변수가 Playwright와 동일 규칙으로 로드되는지 점검 (비밀번호는 길이만).
 * 사용: npm run test:e2e:env-check
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../scripts/parse-env-file.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const fromEnv = parseEnvFile(resolve(root, ".env"));
const fromLocal = parseEnvFile(resolve(root, ".env.local"));
const merged = { ...fromEnv, ...fromLocal };

const email = (merged.E2E_EMAIL ?? "").trim();
const password = (merged.E2E_PASSWORD ?? "").trim();

const at = email.indexOf("@");
const mask =
  at > 0 ? `***@${email.slice(at + 1)}` : email ? "***" : "(없음)";

console.log("E2E_EMAIL (마스킹):", mask);
console.log("E2E_PASSWORD 길이:", password.length || "(없음)");
if (!email || !password) {
  console.log(
    "\n`.env.local`에 E2E_EMAIL, E2E_PASSWORD를 넣었는지, 변수 이름 철자를 확인하세요.",
  );
} else {
  console.log(
    "\n수동 로그인에 쓰는 비밀번호 글자 수와 위 길이가 같아야 합니다. 다르면 `.env`에서 `#` 때문에 잘렸을 수 있습니다 — 이제 공통 파서로 `#` 전체가 유지됩니다.",
  );
}
