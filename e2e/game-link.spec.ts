import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAsFixtureRole } from "./fixture-login-helper";
import { credentialsForFixture } from "./qa-fixture-credentials";
import { loadTestEnv } from "../scripts/test-env.mjs";

test("R03 authorized QA simulator writes game proof through the server", async ({ page }) => {
  const env = loadTestEnv();
  const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user } = await svc.from("users").select("id").eq("email", credentialsForFixture("Member").email).single();
  const { data: game } = await svc.from("games").select("id").eq("slug", "overwatch").single();
  expect(user).toBeTruthy();
  expect(game).toBeTruthy();
  const { data: profile } = await svc.from("user_game_profiles").select("*").eq("user_id", user!.id).eq("game_id", game!.id).single();
  expect(profile).toBeTruthy();
  try {
    expect((await svc.from("user_game_profiles").update({ is_verified: false }).eq("id", profile!.id)).error).toBeNull();
    await loginAsFixtureRole(page, "Member");
    await page.goto("/games/overwatch/auth");
    await page.getByRole("button", { name: /Battle\.net으로 계속/ }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    const result = await svc.from("user_game_profiles").select("is_verified,verified_at,game_uid").eq("id", profile!.id).single();
    expect(result.error).toBeNull();
    expect(result.data?.is_verified).toBe(true);
    expect(result.data?.verified_at).toBeTruthy();
    expect(result.data?.game_uid).toMatch(/^dev:overwatch:/);
  } finally {
    expect((await svc.from("user_game_profiles").upsert(profile!)).error).toBeNull();
  }
});
