import { expect, test } from "@playwright/test";
import { createBrowserClient, createServerClient, type SetAllCookies } from "@supabase/ssr";
import {
  applySessionCookiePolicy,
  DAY_SESSION_SECONDS,
  getSessionMaxAge,
  REMEMBERED_SESSION_SECONDS,
  SESSION_CHOICE_COOKIE,
} from "../src/lib/supabase/session-cookies";

type StoredCookie = Parameters<SetAllCookies>[0][number];
const authCookie = /^sb-.+-auth-token(?:\.\d+)?$/;

function cookieHarness() {
  const jar = new Map<string, StoredCookie>();
  let writes: StoredCookie[] = [];
  let tokenVersion = 0;
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", email: "cookie@test.invalid" };
  // The SDK runs its actual session storage/refresh logic; all HTTP stays local
  // to this mock, so these tests cannot alter QA or production sessions.
  const fetchAuth: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith("/logout")) return new Response("{}", { status: 200 });
    if (url.pathname.endsWith("/user")) return Response.json(user);
    expect(url.pathname).toBe("/auth/v1/token");
    const payload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, version: ++tokenVersion };
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    return Response.json({
      access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.test-signature`,
      refresh_token: `refresh-${tokenVersion}`,
      token_type: "bearer",
      expires_in: 3600,
      user,
    });
  };
  const cookieMethods = (loginMaxAge?: number) => ({
    getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
    setAll: ((cookies) => {
      writes = applySessionCookiePolicy(cookies, loginMaxAge ?? getSessionMaxAge([...jar.values()]));
      for (const cookie of writes) {
        if (cookie.options.maxAge === 0) jar.delete(cookie.name);
        else jar.set(cookie.name, cookie);
      }
    }) satisfies SetAllCookies,
  });
  const server = (loginMaxAge?: number) => createServerClient("https://session-policy-test.supabase.co", "test-anon-key", {
    global: { fetch: fetchAuth },
    cookies: cookieMethods(loginMaxAge),
  });
  const browser = () => createBrowserClient("https://session-policy-test.supabase.co", "test-anon-key", {
    isSingleton: false,
    global: { fetch: fetchAuth },
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
    cookies: cookieMethods(),
  });
  return { jar, server, browser, getWrites: () => writes };
}

function expectLifetime(jar: Map<string, StoredCookie>, seconds: number) {
  const tokens = [...jar.values()].filter(({ name }) => authCookie.test(name));
  expect(tokens.length).toBeGreaterThan(0);
  for (const token of tokens) {
    expect(token.options.maxAge).toBe(seconds);
    expect(token.options.secure).toBe(process.env.NODE_ENV === "production");
  }
  expect(jar.get(SESSION_CHOICE_COOKIE)?.value).toBe(seconds === REMEMBERED_SESSION_SECONDS ? "30" : "1");
  expect(jar.get(SESSION_CHOICE_COOKIE)?.options.maxAge).toBe(seconds);
}

for (const seconds of [DAY_SESSION_SECONDS, REMEMBERED_SESSION_SECONDS]) {
  test(`${seconds / DAY_SESSION_SECONDS}-day cookie choice survives server and browser SDK refreshes and logout`, async () => {
    const harness = cookieHarness();
    const signedIn = await harness.server(seconds).auth.signInWithPassword({ email: "cookie@test.invalid", password: "test-password" });
    expect(signedIn.error).toBeNull();
    expectLifetime(harness.jar, seconds);

    const refreshedServer = await harness.server().auth.refreshSession();
    expect(refreshedServer.error).toBeNull();
    expectLifetime(harness.jar, seconds);

    // Refresh can remove obsolete chunks while writing a live session. This
    // must clear the old chunk without treating it as logout.
    const staleChunk = "sb-session-policy-test-auth-token.9";
    harness.jar.set(staleChunk, { name: staleChunk, value: "old-chunk", options: { maxAge: seconds } });
    const browser = harness.browser();
    const refreshedBrowser = await browser.auth.refreshSession();
    expect(refreshedBrowser.error).toBeNull();
    expect(harness.jar.has(staleChunk)).toBe(false);
    expect(harness.getWrites().find(({ name }) => name === staleChunk)?.options.maxAge).toBe(0);
    expectLifetime(harness.jar, seconds);

    // An existing browser client must reread a later login's choice instead of
    // retaining the duration captured when the client was created.
    const changedSeconds = seconds === DAY_SESSION_SECONDS ? REMEMBERED_SESSION_SECONDS : DAY_SESSION_SECONDS;
    expect((await harness.server(changedSeconds).auth.signInWithPassword({ email: "cookie@test.invalid", password: "test-password" })).error).toBeNull();
    expect((await browser.auth.refreshSession()).error).toBeNull();
    expectLifetime(harness.jar, changedSeconds);

    expect((await browser.auth.signOut()).error).toBeNull();
    expect([...harness.jar.keys()].filter((name) => authCookie.test(name))).toEqual([]);
    expect(harness.jar.has(SESSION_CHOICE_COOKIE)).toBe(false);
    expect(harness.getWrites().every(({ options }) => options.maxAge === 0)).toBe(true);
  });
}

test("missing or invalid persistence choices fall back to 24 hours without rewriting unrelated cookies", () => {
  expect(getSessionMaxAge([])).toBe(DAY_SESSION_SECONDS);
  expect(getSessionMaxAge([{ name: SESSION_CHOICE_COOKIE, value: "400" }])).toBe(DAY_SESSION_SECONDS);
  const verifier = { name: "sb-test-auth-token-code-verifier", value: "test", options: { maxAge: 60 } };
  expect(applySessionCookiePolicy([verifier], REMEMBERED_SESSION_SECONDS)).toEqual([verifier]);
});
