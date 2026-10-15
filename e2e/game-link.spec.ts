import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { allowDevGameLink } from "../src/lib/auth/allow-dev-game-link";
import type { Database } from "../src/lib/supabase/database.types";

test("nickname-free signup retains errors; a new Auth profile uses the BattleTag name", async ({ page }, info) => {
  test.setTimeout(120_000);
  const env = loadTestEnv();
  const svc = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `signup-${randomUUID()}@clansync-qa.local`;
  const password = `${randomUUID()}aA1!`;
  let id: string | undefined;
  try {
    await page.goto("/sign-up");
    await expect(page.getByLabel("닉네임", { exact: true })).toHaveCount(0);
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("출생연도", { exact: true }).selectOption("2000");
    await page.getByLabel("비밀번호", { exact: true }).fill(password);
    await page.getByRole("checkbox", { name: /이용약관/ }).check();
    await page.getByRole("button", { name: "가입하기", exact: true }).click();
    // QA has no custom SMTP. Its disposable .local email is intentionally rejected.
    // Verify the real server action accepts the missing nickname and retains input.
    await expect(page.getByRole("alert").filter({ hasText: "가입하지 못했습니다" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(email);
    await expect(page.getByLabel("출생연도", { exact: true })).toHaveValue("2000");
    // No delivery bypass or global auth setting changes: create only a new fixture.
    const created = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { birth_year: 2000 } });
    expect(created.error).toBeNull();
    id = created.data.user!.id;
    const profile = await svc.from("users").select("id,nickname").eq("email", email).single();
    expect(profile.error).toBeNull();
    expect(profile.data!.id).toBe(id);
    expect(profile.data!.nickname).toBe("새 회원");
    expect((await svc.auth.admin.getUserById(id)).data.user?.user_metadata.nickname).toBeUndefined();
    await loginIsolatedBalanceUser(page, { id, email, password, nickname: "새 회원" });
    await page.goto("/games/overwatch/auth");
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill("별빛에임#45678");
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    expect((await svc.from("users").select("nickname").eq("id", id).single()).data?.nickname).toBe("별빛에임");
    await page.goto("/profile");
    await expect(page.getByText("별빛에임", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("battletag-profile.png") });
    await page.goto("/games");
  } finally {
    if (!id) id = (await svc.from("users").select("id").eq("email", email).maybeSingle()).data?.id;
    if (id) expect((await svc.auth.admin.deleteUser(id)).error).toBeNull();
  }
});

test("QA BattleTag relinking preserves stable IDs; duplicate names work and forged or duplicate tags fail", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  const suffix = String(Date.now()).slice(-8);
  const tag = `SameName#${suffix}`;
  try {
    const before = (await f.service.from("user_game_profiles").select("game_uid").eq("user_id", f.users[1].id).eq("game_id", f.gameId).single()).data!;
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto("/games/overwatch/auth?reauth=1");
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill(tag);
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    const linked = await f.service.from("user_game_profiles").select("battle_tag,is_verified,game_uid").eq("user_id", f.users[1].id).eq("game_id", f.gameId).single();
    expect(linked.data).toEqual({ battle_tag: tag, is_verified: true, game_uid: before.game_uid });
    expect((await f.service.from("users").select("nickname").eq("id", f.users[1].id).single()).data?.nickname).toBe("SameName");
    expect((await f.service.from("user_game_profiles").update({ battle_tag: `SameName#${suffix}1` }).eq("user_id", f.users[2].id).eq("game_id", f.gameId)).error).toBeNull();
    expect((await f.service.from("users").select("nickname").in("id", [f.users[1].id, f.users[2].id])).data?.map((r) => r.nickname)).toEqual(["SameName", "SameName"]);
    const client = await f.memberClient(1);
    expect((await client.from("user_game_profiles").update({ battle_tag: "Fake#12345" }).eq("user_id", f.users[1].id)).error).toBeTruthy();
    expect((await client.from("users").update({ nickname: "다른이름" }).eq("id", f.users[1].id)).error).toBeTruthy();
    await page.goto("/games/overwatch/auth?reauth=1");
    await expect(page.getByLabel("테스트 배틀태그", { exact: true })).toHaveValue(tag);
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill(`samename#${suffix}1`);
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "이미 다른 계정에 연결된 배틀태그" })).toBeVisible();
    expect((await f.service.from("user_game_profiles").select("battle_tag,game_uid").eq("user_id", f.users[1].id).eq("game_id", f.gameId).single()).data).toEqual({ battle_tag: tag, game_uid: before.game_uid });
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill(`Renamed#${suffix}`);
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    expect((await f.service.from("users").select("nickname,coin_balance").eq("id", f.users[1].id).single()).data).toEqual({ nickname: "Renamed", coin_balance: 0 });
    expect((await f.service.from("user_game_profiles").select("game_uid").eq("user_id", f.users[1].id).eq("game_id", f.gameId).single()).data?.game_uid).toBe(before.game_uid);
    expect(allowDevGameLink({ VERCEL_ENV: "production", DEV_GAME_LINK_SIMULATOR: "1" })).toBe(false);
    expect(allowDevGameLink({ NEXT_PUBLIC_SUPABASE_URL: "https://mxkrfnzlgaxzdzcjbfkg.supabase.co", NODE_ENV: "development" })).toBe(false);
    await page.goto("/games");
  } finally { await f.cleanup(); }
});
