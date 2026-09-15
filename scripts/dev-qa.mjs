import { spawn } from "node:child_process";
import { loadTestEnv } from "./test-env.mjs";

const port = process.env.QA_DEV_PORT || "3011";
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error("QA_DEV_PORT must be an unprivileged port between 1024 and 65535");
}
const env = {
  ...loadTestEnv(),
  NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
  SUPABASE_ACCESS_TOKEN: "",
  SUPABASE_DB_PASSWORD: "",
  DEV_GAME_LINK_SIMULATOR: "1",
};
console.log(`QA preview: http://localhost:${port} (isolated test database)`);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", port], {
  env, stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
