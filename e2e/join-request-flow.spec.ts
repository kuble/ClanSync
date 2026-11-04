import { test, expect } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("별도 클랜에 가입 신청 후 리더가 거절하면 안내 문구를 표시한다", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  const memberContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const removed = await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id);
    expect(removed.error).toBeNull();
    const clan = await f.service.from("clans").select("name").eq("id", f.clanId).single();
    expect(clan.error).toBeNull();

    const memberPage = await memberContext.newPage();
    await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await memberPage.goto("/games/overwatch/clan?q=" + encodeURIComponent(clan.data!.name));
    await memberPage.getByTestId(`clan-details-${f.clanId}`).click();
    await memberPage.getByTestId(`clan-join-open-${f.clanId}`).click();
    await memberPage.getByTestId(`clan-join-send-${f.clanId}`).click();
    await expect(memberPage.getByText("가입 신청을 보냈습니다.", { exact: true })).toBeVisible();

    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(`/games/overwatch/clan/${f.clanId}/manage?tab=requests`);
    const row = page.getByRole("listitem").filter({ hasText: f.users[1].nickname });
    await row.getByRole("button", { name: "거절", exact: true }).click();
    await row.getByRole("button", { name: "거절 확정", exact: true }).click();
    await expect(page.getByText("신청을 거절했습니다.", { exact: true })).toBeVisible();
    await expect(row).toHaveCount(0);
  } finally {
    await memberContext.close();
    await f.cleanup();
  }
});
