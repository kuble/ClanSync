import { test, expect } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("isolated onboarding links a BattleTag and requests the intended clan", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await f.service.from("user_game_profiles").delete().eq("user_id", f.users[1].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.getByRole("link", { name: /오버워치/i }).first().click();
    await page.waitForURL(/\/games\/overwatch\/auth/);
    await page.getByText("개발용 연결 테스트", { exact: true }).click();
    await page.getByLabel("테스트 배틀태그", { exact: true }).fill(`NewPlayer#${String(Date.now()).slice(-8)}`);
    await page.getByRole("button", { name: "테스트 배틀태그로 연결", exact: true }).click();
    await page.waitForURL(/\/games\/overwatch\/clan/);
    const clan = await f.service.from("clans").select("name").eq("id", f.clanId).single();
    await page.goto("/games/overwatch/clan?q=" + encodeURIComponent(clan.data!.name));
    await page.getByTestId(`clan-details-${f.clanId}`).click();
    await page.getByTestId(`clan-join-open-${f.clanId}`).click();
    await page.getByLabel("가입 메시지 (선택)").fill("같이 빠른 대전을 하고 싶어요.");
    await page.getByTestId(`clan-join-send-${f.clanId}`).click();
    await expect(page.getByText("가입 신청을 보냈습니다.", { exact: true })).toBeVisible();
    const request = await f.service.from("clan_join_requests").select("user_id,status").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single();
    expect(request.data).toEqual({ user_id: f.users[1].id, status: "pending" });
    const pending = page.getByRole("region", {name: "현재 신청 중인 클랜"});
    const results = page.getByRole("region", {name: "클랜 검색 결과"});
    const detailsId = `clan-details-${f.clanId}`;
    await expect(pending.getByTestId(detailsId)).toBeVisible();
    await expect(results.getByTestId(detailsId)).toHaveCount(0);
    const cardBox = await pending.boundingBox();
    const tabBox = await page.getByRole("tablist").boundingBox();
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(tabBox!.y);
    await pending.getByTestId(detailsId).click();
    await page.getByText("내 신청 메시지", {exact: true}).click();
    await expect(page.getByText("같이 빠른 대전을 하고 싶어요.", {exact: true})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({width: 390, height: 844});
    await page.getByRole("tab", {name: "클랜 생성"}).click();
    await expect(pending.getByRole("button", {name: "클랜 문의방"})).toBeVisible();
    expect(await pending.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await pending.getByRole("button", {name: "신청 취소"}).click();
    await expect(pending).toHaveCount(0);
    await expect(page.getByRole("tab", {name: "클랜 생성"})).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", {name: "클랜 가입"}).click();
    await expect(results.getByTestId(detailsId)).toBeVisible();
  } finally { await f.cleanup(); }
});
