import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("관전자 코인 풀: 편성부터 참여·공유 마감·비례 정산·현재 내전 공개 순위", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(13);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const spectator = await context.newPage();
  try {
    expect((await f.service.from("users").update({ coin_balance: 100 }).in("id", f.users.slice(10).map((u) => u.id))).error).toBeNull();
    await Promise.all([loginIsolatedBalanceUser(page, f.users[0]), loginIsolatedBalanceUser(spectator, f.users[10])]);
    const room = await createAndEnterBalanceRoom(page, f.path, "코인 풀 검증");
    const round = await f.activeRound(room.roomId);
    const ids = f.users.slice(0, 10).map((u) => u.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    expect((await f.service.from("balance_sessions").update({ roster, map_ban_enabled: false, hero_ban_enabled: false, formation_settings: { roles: "manual", teams: "keep", predictionEnabled: true } }).eq("id", round.id)).error).toBeNull();
    await spectator.goto(room.url);
    await spectator.getByRole("button", { name: "승부예측", exact: true }).click();
    const drawer = spectator.getByRole("dialog", { name: "승부예측", exact: true });
    await expect(drawer).toContainText("경기 시작 후 5분");
    await expect(drawer).toContainText("사용 가능 100");
    await drawer.getByRole("button", { name: "블루 승", exact: true }).click();
    await drawer.getByRole("textbox", { name: "걸 코인", exact: true }).fill("101");
    await drawer.getByRole("button", { name: "코인 걸기", exact: true }).click();
    await expect(spectator.locator('[data-sonner-toast][data-type="error"]')).toContainText("사용 가능한 코인");
    await drawer.getByRole("textbox", { name: "걸 코인", exact: true }).fill("10");
    await drawer.getByRole("button", { name: "코인 걸기", exact: true }).click();
    await expect(drawer).toContainText("블루 승 · 10코인 참여");
    await drawer.getByRole("button", { name: "취소", exact: true }).click();
    await expect(drawer).toContainText("사용 가능 100");
    await expect(drawer.getByRole("button", { name: "코인 걸기", exact: true })).toBeVisible();
    await drawer.getByRole("button", { name: "블루 승", exact: true }).click();
    await drawer.getByRole("textbox", { name: "걸 코인", exact: true }).fill("10");
    await drawer.getByRole("button", { name: "코인 걸기", exact: true }).click();
    await expect(drawer).toContainText("블루 승 · 10코인 참여");
    for (const [index, pick, stake] of [[11, 1, 20], [12, 2, 30]]) {
      const client = await f.memberClient(index);
      expect((await client.rpc("place_balance_prediction_pool", { p_session_id: round.id, p_pick: pick, p_stake: stake })).error).toBeNull();
    }
    await expect(drawer).toContainText("60 코인", { timeout: 15_000 });
    await expect(drawer.getByRole("button", { name: "블루 승", exact: true })).toContainText("2.00배");
    await page.reload();
    const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
    await page.getByTestId("clan-balance-session-panel").getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(page.getByTestId("clan-balance-session-panel")).toHaveAttribute("data-balance-phase", "match_live");
    await expect(drawer).toContainText(/4:[0-5]\d/);
    const deadline = (await f.activeRound(room.roomId)).prediction_deadline_at;
    await spectator.reload();
    await spectator.getByRole("button", { name: "승부예측", exact: true }).click();
    await expect(drawer).toContainText("블루 승 · 10코인 참여");
    expect((await f.activeRound(room.roomId)).prediction_deadline_at).toBe(deadline);
    expect((await f.service.from("balance_sessions").update({ prediction_deadline_at: new Date(Date.now() - 1000).toISOString() }).eq("id", round.id)).error).toBeNull();
    await expect(drawer).toContainText("마감됨");
    await expect(drawer.getByRole("textbox", { name: "걸 코인", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "1팀 승리 선택", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: /로 확정할까요\?/ });
    await confirm.getByRole("button", { name: "확정", exact: true }).click();
    await expect(drawer).toContainText("적중 · 20코인 수령 · 순이익 +10");
    const ranking = drawer.getByRole("table");
    await expect(ranking.getByRole("columnheader")).toHaveText(["닉네임", "적중률", "순이익"]);
    await expect(ranking.getByRole("row").nth(1)).toContainText(f.users[11].nickname);
    await expect(ranking.getByRole("row").nth(1)).toContainText("+20");
    await expect(ranking.getByRole("row").nth(3)).toContainText("-30");
    await spectator.setViewportSize({ width: 390, height: 844 });
    expect(await ranking.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await spectator.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await spectator.screenshot({ path: test.info().outputPath("prediction-pool-settled-mobile.png"), fullPage: true });
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await page.getByRole("button", { name: "승부예측", exact: true }).click();
    const participant = page.getByRole("dialog", { name: "승부예측", exact: true });
    await expect(participant.getByRole("table")).toContainText(f.users[11].nickname);
  } finally {
    await context.close();
    await f.cleanup();
  }
});
