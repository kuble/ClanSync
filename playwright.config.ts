import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./scripts/test-env.mjs";

Object.assign(process.env, loadTestEnv());

const isCi = !!process.env.CI;
const E2E_PORT = process.env.PLAYWRIGHT_DEV_PORT ?? "3010";
if (!/^\d+$/.test(E2E_PORT) || Number(E2E_PORT) < 1 || Number(E2E_PORT) > 65535) {
  throw new Error("PLAYWRIGHT_DEV_PORT must be a valid port number");
}
const defaultBase = `http://127.0.0.1:${E2E_PORT}`;

/**
 * 전용 QA DB·3010 포트 사용. 기존 서버는 DB 대상을 보장할 수 없어 재사용하지 않는다.
 * CI: `npm run build` 후 `next start --port`.
 * QA 픽스처 로그인 기본값은 `e2e/qa-fixture-credentials.ts` → `scripts/fixtures/qa-fixtures.mjs`.
 * 온보딩만 선택적으로 `E2E_EMAIL`·`E2E_PASSWORD`로 Member 계정 덮어쓰기 가능.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: defaultBase,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCi
      ? `npm run build && npx next start --port ${E2E_PORT}`
      : `npm run dev -- --port ${E2E_PORT}`,
    url: defaultBase,
    reuseExistingServer: false,
    timeout: 300_000,
    // Prevent Next.js from loading production management credentials from .env.local.
    env: { SUPABASE_ACCESS_TOKEN: "", SUPABASE_DB_PASSWORD: "" },
  },
});
