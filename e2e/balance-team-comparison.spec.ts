import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("중앙 팀 그래프의 점수 토글·승률 설정 저장·모바일 표시", async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(10);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const { roomId } = await createAndEnterBalanceRoom(page, fixture.path, "팀 그래프 검증");
    const ids = fixture.users.map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const scores = Object.fromEntries(ids.map((id, index) => [id, { m: index < 5 ? -1 : -3, a: index < 5 ? 2 : 4 }]));
    const round = await fixture.activeRound(roomId);
    expect((await fixture.service.from("balance_sessions").update({ roster, ma_snapshot: scores, round_number: 2, resolved_map_label: "리장 타워" }).eq("id", round.id)).error).toBeNull();
    expect((await fixture.service.from("balance_sessions").insert({
      clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0], series_id: round.series_id,
      round_number: 1, opened_at: new Date(Date.now() - 60_000).toISOString(), closed_at: new Date(Date.now() - 30_000).toISOString(),
      phase: "match_live", match_outcome: "draw", roster,
    })).error).toBeNull();
    await page.reload();
    await page.setViewportSize({ width: 1062, height: 884 });
    const panel = page.getByTestId("clan-balance-session-panel");
    const header = panel.getByTestId("balance-round-header");
    await expect(header.getByRole("heading", { name: "팀 그래프 검증", exact: true })).toBeVisible();
    await expect(header).toContainText("정규 내전");
    await expect(header).toContainText(`호스트 · ${fixture.users[0].nickname}`);
    const graph = panel.getByTestId("team-comparison-graph");
    await expect(graph).toContainText(/평가 점수 합계.*-5점.*-15점/);
    const teamHeading = panel.locator('[aria-label="팀 비교 요약 보기"]');
    await expect(teamHeading.locator(":scope > span").first()).toHaveText("1팀");
    await expect(teamHeading.locator(":scope > span").last()).toHaveText("2팀");
    await expect(panel.locator('[data-roster-slot="team2:s1"]')).toBeInViewport();
    await expect(graph.getByTestId("team-comparison-blue-bar")).toHaveAttribute("style", /width:\s*75%/);
    const toggle = panel.getByRole("group", { name: "점수 표시" });
    await toggle.getByRole("button", { name: "분석 점수", exact: true }).click();
    await expect(graph).toContainText(/분석 점수 합계.*0점.*0점/);
    await expect(graph.getByTestId("team-comparison-blue-bar")).toHaveAttribute("style", /width:\s*50%/);
    await toggle.getByRole("button", { name: "평가 점수", exact: true }).click();
    await expect(graph).toContainText("-5점");
    const settings = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    const openSettings = async () => {
      await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
      await settings.getByRole("tab", { name: "화면 표시", exact: true }).click();
    };
    await openSettings();
    await expect(settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true })).toHaveValue("score");
    await settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true }).selectOption("prediction");
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect(graph).toContainText(/예측 승률.*\d+%.*\d+%.*샘플/);
    await toggle.getByRole("button", { name: "분석 점수", exact: true }).click();
    await expect(graph).toHaveAttribute("data-score-mode", "a");
    await expect(graph).toContainText(/예측 승률.*\d+%.*\d+%/);
    await expect.poll(async () => (await fixture.activeRound(roomId)).formation_settings).toMatchObject({ teamComparisonMode: "prediction" });
    await page.reload();
    await expect(graph).toHaveAttribute("data-mode", "prediction");
    await openSettings();
    await expect(settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true })).toHaveValue("prediction");
    await settings.getByRole("checkbox", { name: "팀 비교 요약 표시", exact: true }).uncheck();
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect(panel.locator('[aria-label="팀 비교 요약 보기"]')).toHaveCount(0);
    await expect(graph).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await graph.screenshot({ path: test.info().outputPath("team-graph-mobile.png") });
    // An incomplete lineup must never receive even a QA sample percentage.
    await panel.locator('[data-roster-slot="team1:tank"]').press("Delete");
    await expect(graph).toContainText("10명 편성 후 확인");
    await expect(graph).not.toContainText("%");
    await expect(graph.getByTestId("team-comparison-blue-bar")).toHaveCount(0);
    await openSettings();
    await settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true }).selectOption("score");
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect(graph).toContainText("평가 점수 합계");
    const saved = await fixture.activeRound(roomId);
    expect((await fixture.service.from("clans").update({ subscription_tier: "free" }).eq("id", fixture.clanId)).error).toBeNull();
    expect((await fixture.service.from("balance_sessions").update({ formation_settings: { ...(saved.formation_settings as object), teamComparisonMode: "prediction" } }).eq("id", saved.id)).error).toBeNull();
    await page.reload();
    await expect(graph).toContainText("평가 점수 합계");
    await expect(graph).not.toContainText("예측 승률");
    await expect(panel.getByRole("button", { name: "분석 점수", exact: true })).toHaveCount(0);
    await openSettings();
    await expect(settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true })).toHaveValue("score");
    await expect(settings.getByRole("combobox", { name: "팀 비교 그래프", exact: true }).locator('option[value="prediction"]')).toHaveAttribute("disabled", "");
  } finally { await fixture.cleanup(); }
});
