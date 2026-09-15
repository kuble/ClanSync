import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { parseEnvFile } from "./parse-env-file.mjs";

const env = { ...parseEnvFile(".env.local"), ...process.env };
const cli = resolve("node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase");
const result = spawnSync(cli, ["gen", "types", "typescript", "--linked", "--schema", "public"], {
  env, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!result.stdout.includes("export type Database =")) throw new Error("No database types generated");
// Keep the previous valid file when authentication or generation fails.
writeFileSync("src/lib/supabase/database.types.ts", result.stdout);
console.log("Database types synchronized.");
