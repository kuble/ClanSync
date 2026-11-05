import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./scripts/test-env.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

Object.assign(process.env, loadTestEnv());

const isCi = !!process.env.CI;
const E2E_PORT = process.env.PLAYWRIGHT_DEV_PORT ?? "3010";
if (!/^\d+$/.test(E2E_PORT) || Number(E2E_PORT) < 1 || Number(E2E_PORT) > 65535) {
  throw new Error("PLAYWRIGHT_DEV_PORT must be a valid port number");
}
// Playwright's API request context permits Secure cookies on localhost, but
// not on a plain-HTTP loopback IP. Match the browser in production-mode tests.
const defaultBase = `http://localhost:${E2E_PORT}`;

/**
 * 전용 로컬 검사 DB·3010 포트 사용. 사용자의 3011 온라인 QA는 재사용하지 않는다.
 * CI: `npm run build` 후 `next start --port`.
 * QA 픽스처 로그인 기본값은 `e2e/qa-fixture-credentials.ts` → `scripts/fixtures/qa-fixtures.mjs`.
 * 온보딩만 선택적으로 `E2E_EMAIL`·`E2E_PASSWORD`로 Member 계정 덮어쓰기 가능.
 */
export default defineConfig({
  testDir: "./e2e",
  // Node-side loader assertions use Next's server marker without changing app resolution.
  tsconfig: "./tsconfig.playwright.json",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: 0,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: defaultBase,
    trace: "retain-on-failure",
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
    env: { SUPABASE_ACCESS_TOKEN: "", SUPABASE_DB_PASSWORD: "", DISCORD_BOT_TOKEN: "", DISCORD_CLIENT_SECRET: "", DISCORD_CLIENT_ID: "", TZ: "UTC", DEV_GAME_LINK_SIMULATOR: "1", CLANSYNC_E2E: "1",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(resolve("e2e/helpers/supabase-read-fault.mjs")).href}`].filter(Boolean).join(" "),
    },
  },
});
