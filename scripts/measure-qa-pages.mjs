import { createServerClient } from "@supabase/ssr";
import { loadTestEnv } from "./test-env.mjs";
import { qaFixtureEmail, FIXTURE_PASSWORD, QA_SEED_CLANS } from "./fixtures/qa-fixtures.mjs";

// Read-only QA requests. Run once before and after a change; no fixture reseeding.
const env = loadTestEnv();
const port = process.env.QA_DEV_PORT || "3011";
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
  throw new Error("QA_DEV_PORT must be an unprivileged port between 1024 and 65535");
}
const cookies = new Map();
const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (items) => items.forEach(({ name, value }) => cookies.set(name, value)),
  },
});
const login = await client.auth.signInWithPassword({ email: qaFixtureEmail("Leader", "01"), password: FIXTURE_PASSWORD });
if (login.error) throw new Error(login.error.message);
const { data: clan, error } = await client.from("clans").select("id").eq("name", QA_SEED_CLANS[0].name).single();
if (error || !clan) throw new Error("QA clan is unavailable; this script does not seed it.");
const base = `http://localhost:${port}/games/overwatch/clan/${clan.id}`;
const pages = ["", "/balance", "/stats", "/events", "/manage", "/store"];
for (let run = 1; run <= 3; run++) {
  for (const page of pages) {
    const started = performance.now();
    const response = await fetch(base + page, {
      headers: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") },
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    const headersMs = Math.round(performance.now() - started);
    const body = await response.text();
    console.log(JSON.stringify({
      run, page: page || "/home", status: response.status, headersMs,
      totalMs: Math.round(performance.now() - started),
      // fetch decompresses the body; this is not compressed network transfer size.
      decodedBodyKiB: Math.round(Buffer.byteLength(body) / 1024),
    }));
    if (!response.ok || body.includes("NEXT_HTTP_ERROR_FALLBACK;500")) throw new Error(`Page failed: ${page || "/home"}`);
  }
}
