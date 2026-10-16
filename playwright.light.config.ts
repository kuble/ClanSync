import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

/** Use the real persisted preference, including in pages and body portals. */
export default defineConfig({
  ...config,
  use: {
    ...config.use,
    colorScheme: "light",
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(config.use!.baseURL!).origin, localStorage: [{ name: "clansync-theme", value: "light" }] }],
    },
  },
});
