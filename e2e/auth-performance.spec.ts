import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadTestEnv } from "../scripts/test-env.mjs";

function qaService() {
  const env = loadTestEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AuthUser = {
  svc: ReturnType<typeof qaService>;
  id: string;
  email: string;
  password: string;
  ip: string;
};

const test = base.extend<{ authUser: AuthUser }>({
  authUser: async ({}, provide) => {
    const svc = qaService();
    const tag = randomUUID().slice(0, 12);
    const email = `auth-speed-${tag}@clansync-qa.local`;
    const password = `${randomUUID()}aA1!`;
    const { data, error } = await svc.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { birth_year: 2000, gender: "undisclosed" },
    });
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    try {
      await provide({ svc, id: data.user!.id, email, password, ip: "198.51.100.77" });
    } finally {
      const cleanup = await Promise.all([
        svc.from("auth_failed_logins").delete().eq("email", email),
        svc.from("auth_login_lockouts").delete().eq("email", email),
        svc.auth.admin.deleteUser(data.user!.id),
      ]);
      for (const result of cleanup) expect(result.error).toBeNull();
    }
  },
});

test.setTimeout(90_000);

async function fillSignIn(page: Page, user: AuthUser, remember = false) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": user.ip });
  await page.goto("/sign-in");
  await page.getByLabel("이메일", { exact: true }).fill(user.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(user.password);
  await page.getByRole("switch", { name: "자동 로그인", exact: true }).setChecked(remember);
}

async function expectCookieLifetime(page: Page, days: number) {
  const cookies = (await page.context().cookies()).filter((cookie) => cookie.name.includes("-auth-token") || cookie.name === "clansync-session-days");
  expect(cookies.length).toBeGreaterThan(1);
  for (const cookie of cookies) {
    expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(days * 86400 - 3600);
    expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(days * 86400 + 5);
  }
}

test("successful login preserves the profile, clears failures and keeps the personal auto-login choice until disabled", async ({ page, authUser }) => {
  const { svc, id, email, ip } = authUser;
  expect((await svc.from("users").update({ birth_year: 1995 }).eq("id", id)).error).toBeNull();
  await fillSignIn(page, authUser, true);
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("이메일 또는 비밀번호");
  const failure = await svc.from("auth_login_lockouts").select("consecutive_failures")
    .eq("email", email).eq("ip", ip).single();
  expect(failure.error).toBeNull();
  expect(failure.data!.consecutive_failures).toBe(1);

  // React resets uncontrolled form fields after the action resolves, including
  // an error response. Re-enter the full login attempt as a user would.
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(authUser.password);
  await page.getByRole("switch", { name: "자동 로그인", exact: true }).check();
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/games$/);
  const [profile, cleared] = await Promise.all([
    svc.from("users").select("birth_year,auto_login").eq("id", id).single(),
    svc.from("auth_login_lockouts").select("consecutive_failures,locked_until").eq("email", email).eq("ip", ip).single(),
  ]);
  expect(profile.error).toBeNull();
  expect(profile.data).toEqual({ birth_year: 1995, auto_login: true });
  expect(cleared.error).toBeNull();
  expect(cleared.data).toEqual({ consecutive_failures: 0, locked_until: null });
  await expectCookieLifetime(page, 400);

  await page.getByLabel("프로필 메뉴", { exact: true }).click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await fillSignIn(page, authUser);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/games$/);
  const normal = await svc.from("users").select("auto_login,birth_year").eq("id", id).single();
  expect(normal.error).toBeNull();
  expect(normal.data).toEqual({ birth_year: 1995, auto_login: false });
  await expectCookieLifetime(page, 1);

  await page.goto("/profile", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
  const autoLogin = page.getByRole("switch", { name: "자동 로그인", exact: true });
  await expect(autoLogin).not.toBeChecked();
  await autoLogin.click();
  await expect(autoLogin).toBeChecked();
  await expectCookieLifetime(page, 400);
  expect((await svc.from("users").select("auto_login").eq("id", id).single()).data?.auto_login).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
  await expect(page.getByRole("switch", { name: "자동 로그인", exact: true })).toBeChecked();
  await autoLogin.click();
  await expect(autoLogin).not.toBeChecked();
  await expectCookieLifetime(page, 1);
  expect((await svc.from("users").select("auto_login").eq("id", id).single()).data?.auto_login).toBe(false);
});

test("login still restores a missing public profile from the authenticated user", async ({ page, authUser }) => {
  const { svc, id } = authUser;
  expect((await svc.from("users").delete().eq("id", id)).error).toBeNull();
  await fillSignIn(page, authUser, true);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/games$/);
  const restored = await svc.from("users").select("birth_year,auto_login").eq("id", id).single();
  expect(restored.error).toBeNull();
  expect(restored.data).toEqual({ birth_year: 2000, auto_login: true });
});

test("an active login lock blocks even a correct password before a session is created", async ({ page, authUser }) => {
  const { svc, email, ip } = authUser;
  expect((await svc.from("auth_login_lockouts").upsert({
    email, ip, consecutive_failures: 5, locked_until: new Date(Date.now() + 15 * 60000).toISOString(),
  }, { onConflict: "email,ip" })).error).toBeNull();
  await fillSignIn(page, authUser);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("이메일 또는 비밀번호");
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await page.context().cookies()).filter((cookie) => cookie.name.includes("-auth-token"))).toEqual([]);
  const audit = await svc.from("auth_failed_logins").select("reason").eq("email", email).eq("ip", ip);
  expect(audit.error).toBeNull();
  expect(audit.data).toEqual([{ reason: "locked" }]);
});

test("an expired login lock allows a new failure series", async ({ page, authUser }) => {
  const { svc, email, ip } = authUser;
  expect((await svc.from("auth_login_lockouts").upsert({
    email, ip, consecutive_failures: 5, locked_until: new Date(Date.now() - 60_000).toISOString(),
  }, { onConflict: "email,ip" })).error).toBeNull();

  await fillSignIn(page, authUser);
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("이메일 또는 비밀번호");

  const lock = await svc.from("auth_login_lockouts")
    .select("consecutive_failures,locked_until").eq("email", email).eq("ip", ip).single();
  expect(lock.error).toBeNull();
  expect(lock.data).toEqual({ consecutive_failures: 1, locked_until: null });
});
