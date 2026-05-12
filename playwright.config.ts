import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { parseEnvFile } from "./scripts/parse-env-file.mjs";

function applyPlaywrightEnvFiles(cwd: string = process.cwd()): void {
  const envPath = resolve(cwd, ".env");
  const localPath = resolve(cwd, ".env.local");
  const fromEnv = parseEnvFile(envPath) as Record<string, string>;
  const fromLocal = parseEnvFile(localPath) as Record<string, string>;
  for (const [k, v] of Object.entries(fromEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(fromLocal)) {
    process.env[k] = v;
  }
}

applyPlaywrightEnvFiles();

const isCi = !!process.env.CI;
/** 로컬: 3000. CI: 3010 + next start (같은 디렉터리에 dev 인스턴스 1개만 허용). */
const E2E_PORT = isCi
  ? (process.env.PLAYWRIGHT_DEV_PORT ?? "3010")
  : (process.env.PLAYWRIGHT_DEV_PORT ?? "3000");
const defaultBase = `http://127.0.0.1:${E2E_PORT}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

/**
 * 로컬: `npm run dev` 재사용(3000). 반영이 안 되면 dev 재시작.
 * CI: `npm run build` 후 `next start --port`(기본 3010).
 * 서버만 쓸 때: `PLAYWRIGHT_SKIP_WEBSERVER=1` + `PLAYWRIGHT_BASE_URL`.
 * QA 픽스처 로그인 기본값은 `e2e/qa-fixture-credentials.ts` → `scripts/fixtures/qa-fixtures.mjs`.
 * 온보딩만 선택적으로 `E2E_EMAIL`·`E2E_PASSWORD`로 Member 계정 덮어쓰기 가능.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  globalSetup: "./e2e/global-setup.ts",
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? defaultBase,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(skipWebServer
    ? {}
    : isCi
      ? {
          webServer: {
            command: `npm run build && npx next start --port ${E2E_PORT}`,
            url: defaultBase,
            reuseExistingServer: false,
            timeout: 300_000,
          },
        }
      : {
          webServer: {
            command: "npm run dev",
            url: defaultBase,
            reuseExistingServer: true,
            timeout: 120_000,
          },
        }),
});
