import { defineConfig } from "@playwright/test";

// This config deliberately does not import the browser config or load DB credentials.
export default defineConfig({
  testDir: "./e2e/logic",
  tsconfig: "./tsconfig.playwright.json",
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "dot",
  outputDir: "./test-results/logic",
  use: { trace: "off", screenshot: "off" },
});
