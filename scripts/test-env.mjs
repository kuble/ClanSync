import { resolve } from "node:path";
import { parseEnvFile } from "./parse-env-file.mjs";

/** Explicit QA allowlist: production is never a fixture target. */
export const TEST_PROJECT_REF = "moretvteewfcztxvwztw";

export function assertTestTarget(env) {
  const expected = `https://${TEST_PROJECT_REF}.supabase.co`;
  if (env.NEXT_PUBLIC_SUPABASE_URL !== expected) {
    throw new Error(`QA requires the isolated Supabase project ${TEST_PROJECT_REF}. Configure .env.e2e.local; .env.local is not used.`);
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[key]?.trim()) throw new Error(`Missing QA environment variable: ${key}`);
  }
}

/** @returns {Record<string, string | undefined>} */
export function loadTestEnv({ cwd = process.cwd(), env = process.env } = {}) {
  const result = { ...parseEnvFile(resolve(cwd, ".env.e2e.local")), ...env };
  assertTestTarget(result);
  return result;
}
