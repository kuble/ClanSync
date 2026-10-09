import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

function seconds(text: string | null) {
  const match = text?.match(/(\d+):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
}

test("맵 행 예측 시간: 중앙 제목·초 단위 시간·마감과 드로워 동기화", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await page.setViewportSize({ width: 1111, height: 884 });
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "타이머 표시 확인");
    const panel = page.getByTestId("clan-balance-session-panel");
    const tab = page.getByTestId("balance-prediction-tab");
    const countdown = panel.getByTestId("balance-prediction-countdown");
    const drawer = page.getByRole("dialog", { name: "승부예측", exact: true });
    await expect(countdown).toHaveCount(0);
    await expect(tab.getByTestId("balance-prediction-countdown")).toHaveCount(0);
    await expect(panel.getByTestId("balance-round-header")).not.toContainText("정규 내전");
    await tab.hover();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawer).toBeHidden();

    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.slice(1).map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const deadline = new Date(Date.now() + 300_000).toISOString();
    expect((await fixture.service.from("balance_sessions").update({
      roster, phase: "match_live", resolved_map_label: "부산", prediction_deadline_at: deadline,
    }).eq("id", round.id)).error).toBeNull();
    await page.reload();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await expect(panel.getByText("경기 진행 중", { exact: true })).toHaveCount(0);
    await expect(panel.getByTestId("balance-match-map-row").getByTestId("balance-prediction-countdown")).toBeVisible();
    await expect(countdown).toHaveText(/승부예측 마감까지\s*[1-5]:[0-5]\d/);
    const header = await panel.getByTestId("balance-round-header").boundingBox();
    const title = await panel.getByTestId("balance-room-title").boundingBox();
    const badge = await countdown.boundingBox();
    const card = await panel.getByTestId("balance-session-card").boundingBox();
    expect(header && title && badge && card).toBeTruthy();
    expect(Math.abs(title!.x + title!.width / 2 - header!.x - header!.width / 2)).toBeLessThan(1);
    const edgeOffset = badge!.x + badge!.width - card!.x - card!.width;
    expect(edgeOffset).toBeGreaterThan(0);
    expect(edgeOffset).toBeLessThan(12);
    const first = await countdown.textContent();
    await expect(countdown).not.toHaveText(first!);
    // Short deadlines in an isolated round keep the real server and browser
    // clocks aligned while testing display ticks and the expiry boundary.
    const finalMinute = new Date(Date.now() + 59_000).toISOString();
    expect((await fixture.service.from("balance_sessions").update({ prediction_deadline_at: finalMinute }).eq("id", round.id)).error).toBeNull();
    await page.reload();
    await expect.poll(async () => seconds(await countdown.textContent())).toBeLessThanOrEqual(55);
    await expect(countdown).toHaveText(/승부예측 마감까지\s*0:[0-5]\d/);
    await page.screenshot({ path: test.info().outputPath("prediction-countdown-map-row.png") });
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(countdown).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const mobileDisplay = await countdown.boundingBox();
    const shortcuts = await panel.getByTestId("balance-drawer-shortcuts").boundingBox();
    expect(mobileDisplay && shortcuts).toBeTruthy();
    expect(mobileDisplay!.x + mobileDisplay!.width).toBeLessThan(shortcuts!.x);
    await page.screenshot({ path: test.info().outputPath("prediction-countdown-mobile.png") });
    await page.setViewportSize({ width: 1111, height: 884 });

    // Opening late must use elapsed server time rather than restart from
    // the original page snapshot while the map row nears the deadline.
    await tab.hover();
    await expect(drawer).toBeVisible();
    const poolTime = drawer.getByTestId("balance-prediction-pool").getByRole("status").first();
    await expect.poll(async () => Math.abs(seconds(await countdown.textContent()) - seconds(await poolTime.textContent()))).toBeLessThanOrEqual(1);
    expect(Date.parse((await fixture.activeRound(room.roomId)).prediction_deadline_at!)).toBe(Date.parse(finalMinute));
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawer).toBeHidden();

    const ending = new Date(Date.now() + 8000).toISOString();
    expect((await fixture.service.from("balance_sessions").update({ prediction_deadline_at: ending }).eq("id", round.id)).error).toBeNull();
    await page.reload();
    await expect(countdown).toContainText("승부예측 마감까지");
    await expect(countdown).toHaveText("승부예측 마감", { timeout: 15_000 });
    await tab.hover();
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("마감됨");
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawer).toBeHidden();
    await expect(countdown).toHaveText("승부예측 마감");
    expect(Date.parse((await fixture.activeRound(room.roomId)).prediction_deadline_at!)).toBe(Date.parse(ending));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(countdown).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const mobileHeader = await panel.getByTestId("balance-round-header").boundingBox();
    const mobileTitle = await panel.getByTestId("balance-room-title").boundingBox();
    expect(mobileHeader && mobileTitle).toBeTruthy();
    expect(Math.abs(mobileTitle!.x + mobileTitle!.width / 2 - mobileHeader!.x - mobileHeader!.width / 2)).toBeLessThan(1);
    await tab.click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("마감됨");
    await drawer.getByRole("button", { name: "닫기", exact: true }).click();

    expect((await fixture.service.from("balance_sessions").update({ match_outcome: "team1" }).eq("id", round.id)).error).toBeNull();
    await page.reload();
    await expect(countdown).toHaveCount(0);
    await expect(panel.getByText("블루 팀 승리", { exact: true })).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});
