import { test, expect } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("isolated onboarding links a BattleTag and requests the intended clan", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").update({ is_verified: false }).eq("user_id", f.users[1].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.getByRole("link", { name: /오버워치/i }).first().click();
    await page.waitForURL(/\/games\/overwatch\/auth/);
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill(`NewPlayer#${String(Date.now()).slice(-8)}`);
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    await page.getByTestId(`clan-join-open-${f.clanId}`).click();
    await page.getByTestId(`clan-join-send-${f.clanId}`).click();
    await expect(page.getByText("가입 신청을 보냈습니다.", { exact: true })).toBeVisible();
    const request = await f.service.from("clan_join_requests").select("user_id,status").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single();
    expect(request.data).toEqual({ user_id: f.users[1].id, status: "pending" });
    await page.goto("/games");
  } finally { await f.cleanup(); }
});
