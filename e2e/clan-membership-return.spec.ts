import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("자진 탈퇴·이전 구성원·기록 유지 재가입·강퇴 후 허용을 별도 클랜에서 처리한다", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  let memberContext;
  try {
    const clanName = `재가입검증-${f.clanId.slice(0, 6)}`;
    expect((await f.service.from("clans").update({ name: clanName }).eq("id", f.clanId)).error).toBeNull();
    expect((await f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    const read = () => f.service.from("clan_members").select("id,status,role").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single();
    const membershipId = (await read()).data!.id;
    expect((await f.service.rpc("edit_clan_match_record", { p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_operation: "create", p_id: null as unknown as string, p_revision: null as unknown as string,
      p_record: { playedAt: "2026-10-01T10:00:00Z", occurredAt: "2026-10-01T10:00:00Z", mapLabel: "부산", outcome: "team1", players: [{ userId: f.users[1].id, team: 1, role: "tank" }, { userId: f.users[0].id, team: 2, role: "tank" }] } })).error).toBeNull();
    const history = () => f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[1].id });
    const original = (await history()).data;
    expect(original).toHaveLength(1);
    await page.setViewportSize({ width: 1244, height: 884 });
    await loginIsolatedBalanceUser(page, f.users[0]);
    const manage = `/games/overwatch/clan/${f.clanId}/manage`;
    await page.goto(`${manage}?tab=members`);
    memberContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const memberPage = await memberContext.newPage();
    memberPage.setDefaultTimeout(15_000);
    await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await memberPage.goto("/profile");
    await memberPage.waitForLoadState("networkidle");
    const accountTab = memberPage.getByRole("tab", { name: "계정 정보", exact: true });
    await expect(async () => { await accountTab.click(); await expect(accountTab).toHaveAttribute("aria-selected", "true", { timeout: 1000 }); }).toPass({ timeout: 15_000 });
    await memberPage.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await memberPage.getByRole("button", { name: `${clanName} 클랜 탈퇴`, exact: true }).click();
    const leave = memberPage.getByRole("dialog", { name: "클랜을 탈퇴하시겠습니까?", exact: true });
    await expect(leave).toContainText("내전 기록과 통계는 남습니다");
    await leave.getByRole("button", { name: "클랜 탈퇴", exact: true }).click();
    await expect(leave).toBeHidden();
    await expect.poll(async () => (await read()).data?.status).toBe("left");
    await expect(memberPage.getByRole("region", { name: "내 클랜", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("link", { name: `${f.users[1].nickname} 개인 기록`, exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "이전 구성원", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: f.users[1].nickname })).toContainText("자진 탈퇴");
    await expect(page.getByRole("link", { name: `${f.users[1].nickname} 개인 기록`, exact: true })).toHaveAttribute("href", new RegExp(`player=${f.users[1].id}$`));
    await page.screenshot({ path: info.outputPath("former-member.png"), animations: "disabled" });

    // A different name must not create a new identity when the same account returns.
    f.users[1].nickname = `돌아온멤버_${f.clanId.slice(0, 4)}`;
    expect((await f.service.from("users").update({ nickname: f.users[1].nickname }).eq("id", f.users[1].id)).error).toBeNull();
    const apply = async () => {
      await memberPage.goto("/games/overwatch/clan");
      await memberPage.getByTestId(`clan-join-open-${f.clanId}`).click();
      await memberPage.getByTestId(`clan-join-send-${f.clanId}`).click();
    };
    await apply();
    await expect(memberPage.getByText("가입 신청을 보냈습니다.", { exact: true })).toBeVisible();
    const approve = async () => {
      await page.goto(`${manage}?tab=requests`);
      await expect(page.getByText("재가입 · 기존 내전 기록 유지", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "가입 승인", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "클랜 재가입 승인", exact: true });
      await expect(dialog.getByRole("radio")).toHaveCount(0);
      await expect(dialog.getByRole("textbox")).toHaveCount(0);
      await expect(dialog).toContainText("일반 멤버로 가입");
      await page.screenshot({ path: info.outputPath("returning-approval.png"), animations: "disabled" });
      await dialog.getByRole("button", { name: "가입 승인", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect.poll(async () => (await read()).data).toEqual({ id: membershipId, status: "active", role: "member" });
    };
    await approve(); expect((await history()).data).toEqual(original);

    await page.goto(`${manage}?tab=members`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `${f.users[1].nickname} 강퇴`, exact: true }).click();
    await expect.poll(async () => (await read()).data?.status).toBe("banned");
    await page.getByRole("radio", { name: "이전 구성원", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: f.users[1].nickname })).toContainText("강퇴 · 재가입 차단");
    await apply(); await expect(memberPage.locator("p[role=alert]")).toContainText("재가입이 제한");
    expect((await f.service.from("clan_join_requests").select("id").eq("clan_id", f.clanId).eq("status", "pending")).data).toHaveLength(0);
    await page.getByRole("button", { name: `${f.users[1].nickname} 재가입 허용`, exact: true }).click();
    const allow = page.getByRole("dialog", { name: "재가입을 허용하시겠습니까?", exact: true });
    await expect(allow).toContainText("별도로 승인");
    await allow.getByRole("button", { name: "재가입 허용", exact: true }).click();
    await expect(allow).toBeHidden();
    await expect.poll(async () => (await read()).data?.status).toBe("left");
    await expect(page.getByRole("row").filter({ hasText: f.users[1].nickname })).toContainText("강퇴 · 재가입 허용");
    await page.screenshot({ path: info.outputPath("rejoin-allowed.png"), animations: "disabled" });
    await memberPage.getByTestId(`clan-join-send-${f.clanId}`).click();
    await expect(memberPage.getByText("가입 신청을 보냈습니다.", { exact: true })).toBeVisible();
    await approve(); expect((await history()).data).toEqual(original);
    await page.goto(`${manage}?tab=members`);
    await page.getByRole("radio", { name: "이전 구성원", exact: true }).click();
    await expect(page.getByRole("link", { name: `${f.users[1].nickname} 개인 기록`, exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { try { await memberContext?.close(); } finally { await f.cleanup(); } }
});
