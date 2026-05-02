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

/**
 * 로컬: `npm run dev`가 이미 떠 있으면 재사용(reuseExistingServer).
 *     온보딩 스펙은 `E2E_EMAIL` + `E2E_PASSWORD` 필요 (.env.local — 커밋 금지).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
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
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
