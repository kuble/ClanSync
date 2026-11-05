import { resolve } from "node:path";
import { parseEnvFile } from "./parse-env-file.mjs";

/** Explicit QA allowlist: production is never a fixture target. */
export const TEST_PROJECT_REF = "moretvteewfcztxvwztw";
export const LOCAL_TEST_URL = "http://127.0.0.1:55431";

export function assertTestTarget(env) {
  if (env.NEXT_PUBLIC_SUPABASE_URL !== LOCAL_TEST_URL) {
    throw new Error(`Automated tests require ${LOCAL_TEST_URL}. Run npm run test:local:setup. Shared QA and production are never automatic test targets.`);
  }
  assertKeys(env);
}

function assertKeys(env) {
  for (const key of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[key]?.trim()) throw new Error(`Missing QA environment variable: ${key}`);
  }
}

/** @returns {Record<string, string | undefined>} */
export function loadTestEnv({ cwd = process.cwd(), env = process.env } = {}) {
  const result = { ...parseEnvFile(resolve(cwd, ".env.test-local")), ...env };
  assertTestTarget(result);
  return { ...result, SUPABASE_ACCESS_TOKEN: "", SUPABASE_DB_PASSWORD: "", DISCORD_BOT_TOKEN: "", DISCORD_CLIENT_SECRET: "", DISCORD_CLIENT_ID: "" };
}

/** Human QA preview and explicitly invoked QA maintenance only. Never seeds. */
export function loadSharedQaEnv({ cwd = process.cwd(), env = process.env } = {}) {
  const result = { ...parseEnvFile(resolve(cwd, ".env.e2e.local")), ...env };
  if (result.NEXT_PUBLIC_SUPABASE_URL !== `https://${TEST_PROJECT_REF}.supabase.co`)
    throw new Error("Shared QA requires the allowlisted clansync-test project.");
  assertKeys(result);
  return result;
}
