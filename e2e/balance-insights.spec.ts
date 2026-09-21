import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
test.use({ actionTimeout: 15_000 });

test("점수 토글·즉시 맵 비교·깜짝 결과 무보상과 데이터 삭제", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const regular = await createAndEnterBalanceRoom(page, fixture.path, "점수 비교 검증");
    const ids = fixture.users.slice(0, 10).map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const scores = Object.fromEntries(ids.map((id, i) => [id, { m: i < 5 ? 1 : 3, a: i < 5 ? 2 : 4 }]));
    const round = await fixture.activeRound(regular.roomId);
    const seed = await fixture.service.from("balance_sessions").update({ roster, hero_bans_per_team: 1 }).eq("id", round.id);
    expect(seed.error).toBeNull();
    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    const insights = panel.getByRole("complementary", { name: "팀 밸런스 비교" });
    await expect(panel.locator('[data-roster-slot="team1:tank"]')).toContainText(/[+-]?\d+(?:\.\d+)?점/);
    const standbyMember = panel.getByRole("button", { name: `${fixture.users[10].nickname} 출전 명단에 추가` });
    await standbyMember.hover();
    await expect(page.getByRole("tooltip").filter({ hasText: fixture.users[10].nickname })).toHaveCount(0);
    await expect(panel.getByText("샘플 점수·승률 포함", { exact: true })).toHaveCount(0);
    await expect(insights).toHaveCount(0);
    await expect(panel.getByText("출전 명단 10 / 10", { exact: true })).toHaveCount(0);
    expect((await fixture.activeRound(regular.roomId)).ma_snapshot).toEqual({});
    await page.screenshot({ path: test.info().outputPath("roster-sample-insights.png"), fullPage: true });
    // Add completed rounds only to this isolated session; its active round stays intact.
    const savedScores = await fixture.service.from("balance_sessions").update({ ma_snapshot: scores, round_number: 4 }).eq("id", round.id);
    expect(savedScores.error).toBeNull();
    const historyStart = Date.now() - 4 * 60_000;
    const pastRounds = await fixture.service.from("balance_sessions").insert(
      (["team1", "draw", "team2"] as const).map((match_outcome, index) => ({
        clan_id: fixture.clanId,
        game_id: fixture.gameId,
        host_user_id: ids[0],
        series_id: round.series_id,
        round_number: index + 1,
        opened_at: new Date(historyStart + index * 60_000).toISOString(),
        closed_at: new Date(historyStart + index * 60_000 + 30_000).toISOString(),
        phase: "match_live" as const,
        match_outcome,
        roster,
      })),
    );
    expect(pastRounds.error).toBeNull();
    await page.reload();
    const player = panel.locator('[data-roster-slot="team1:tank"]');
    await expect(player).toContainText("+1점");
    await expect(player).not.toContainText(/\b[MA]\s*[+-]?\d/);
    await expect(panel.getByTestId("team1-score-total")).toContainText("+5점");
    await expect(panel.getByTestId("team2-score-total")).toContainText("+15점");
    await expect(panel.locator('[aria-label="팀 비교 요약 보기"]')).toContainText("1팀(+5점)");
    await expect(panel.locator('[aria-label="팀 비교 요약 보기"]')).toContainText("2팀(+15점)");
    await panel.locator('[aria-label="팀 비교 요약 보기"]').hover();
    const teamSummary = page.getByRole("tooltip").filter({ hasText: "팀 비교 요약" });
    await expect(teamSummary).toBeVisible();
    await expect(teamSummary.getByTestId("team-summary-evaluation")).toContainText(/평가 점수 합계.*\+5점.*\+15점/);
    await expect(teamSummary.getByTestId("team-summary-analysis")).toContainText(/분석 점수 합계.*\+10점.*\+20점/);
    await expect(teamSummary.getByTestId("team-summary-prediction")).toContainText(/예측 승률.*\d+%.*\d+%/);
    const predictionBox = await teamSummary.getByTestId("team-summary-prediction").boundingBox();
    const evaluationBox = await teamSummary.getByTestId("team-summary-evaluation").boundingBox();
    const analysisBox = await teamSummary.getByTestId("team-summary-analysis").boundingBox();
    expect(predictionBox!.y).toBeLessThan(evaluationBox!.y);
    expect(Math.abs(evaluationBox!.y - analysisBox!.y)).toBeLessThan(4);
    expect(evaluationBox!.width).toBeLessThan(predictionBox!.width);
    await expect(teamSummary).toHaveCSS("pointer-events", "none");
    await page.mouse.move(0, 0);
    await expect(teamSummary).toBeHidden();
    const blueCard = panel.locator('[data-roster-slot="team1:tank"]');
    const redCard = panel.locator('[data-roster-slot="team2:tank"]');
    await expect(blueCard.locator(":scope > span")).toHaveCSS("flex-direction", "row");
    await expect(redCard.locator(":scope > span")).toHaveCSS("flex-direction", "row-reverse");
    // Exercise a state change before hover so the server-rendered buttons are hydrated.
    await panel.getByRole("button", { name: "분석 점수", exact: true }).click();
    await expect(player).toContainText("+2점");
    await panel.getByRole("button", { name: "평가 점수", exact: true }).click();
    await expect(player).toContainText("+1점");
    await player.hover();
    const playerInfo = page.getByRole("tooltip").filter({ hasText: fixture.users[0].nickname });
    await expect(playerInfo).toBeVisible();
    await expect(playerInfo).toContainText("이번 세션 전적");
    await expect(playerInfo).toContainText(/1\s*승.*1\s*무.*1\s*패/);
    await expect(playerInfo).toContainText("33.3%");
    await expect(playerInfo).toContainText(/1\s*연패/);
    await expect(playerInfo).toContainText("평가 점수");
    await expect(playerInfo).toContainText("분석 점수");
    await expect(playerInfo).toContainText(/마이크\s*미설정/);
    await expect(playerInfo).toHaveCSS("pointer-events", "none");
    await expect(playerInfo.locator("..")).toHaveCSS("pointer-events", "none");
    await page.screenshot({ path: test.info().outputPath("player-session-details.png"), fullPage: true });
    await panel.locator('[data-roster-slot="team1:d0"]').hover();
    const nextPlayerInfo = page.getByRole("tooltip").filter({ hasText: fixture.users[1].nickname });
    await expect(nextPlayerInfo).toBeVisible();
    await expect(playerInfo).toBeHidden();
    await page.mouse.move(0, 0);
    await expect(nextPlayerInfo).toBeHidden();
    await panel.locator('[data-roster-slot="team2:d1"]').focus();
    await page.keyboard.press("Tab");
    await expect(player).toBeFocused();
    await expect(playerInfo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(playerInfo).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("roster-scores-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1211, height: 1272 });
    await panel.getByRole("button", { name: "분석 점수", exact: true }).click();
    await expect(player).toContainText("+2점");
    await expect(panel.getByTestId("team1-score-total")).toContainText("+10점");
    await expect(panel.getByTestId("team2-score-total")).toContainText("+20점");
    await panel.getByRole("button", { name: "평가 점수", exact: true }).click();
    await panel.locator('[data-roster-slot="team1:tank"]').click();
    await panel.locator('[data-roster-slot="team2:tank"]').click();
    await expect(panel.locator('[data-roster-slot="team1:tank"]')).toContainText("+3점");
    await expect(panel.locator('[data-roster-slot="team2:tank"]')).toContainText("+1점");
    await expect(panel.getByTestId("team1-score-total")).toContainText("+7점");
    await expect(panel.getByTestId("team2-score-total")).toContainText("+13점");
    await expect(panel.getByTestId("balance-formation").getByRole("button", { name: "세션 종료", exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    await settings.getByRole("radio", { name: /직접 배정/ }).check();
    await settings.getByRole("combobox", { name: "팀원 선발 방식", exact: true }).selectOption("keep");
    await settings.getByRole("tab", { name: "밴픽", exact: true }).click();
    await settings.getByRole("checkbox", { name: "맵 밴 사용", exact: true }).uncheck();
    await settings.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }).uncheck();
    await settings.getByRole("tab", { name: "화면 표시", exact: true }).click();
    await settings.getByRole("checkbox", { name: "선수 카드 점수 표시", exact: true }).uncheck();
    await settings.getByRole("checkbox", { name: "팀 비교 요약 표시", exact: true }).uncheck();
    await settings.getByRole("checkbox", { name: "플레이어 세션 정보 요약 표시", exact: true }).uncheck();
    await settings.getByRole("combobox", { name: "선수 카드 보조 정보", exact: true }).selectOption("streak");
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    const adjustedPlayer = panel.locator('[data-roster-slot="team1:tank"]');
    await expect(adjustedPlayer).not.toContainText(/[+-]?\d+(?:\.\d+)?점/);
    await expect(adjustedPlayer).toContainText(/1연[승패]/);
    await expect(adjustedPlayer.locator(":scope > span > span").first()).toHaveCSS("text-align", "center");
    await expect(panel.locator('[aria-label="팀 비교 요약 보기"]')).toHaveCount(0);
    await adjustedPlayer.hover();
    await expect(page.getByRole("tooltip").filter({ hasText: fixture.users[0].nickname })).toHaveCount(0);
    await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
    await settings.getByRole("tab", { name: "화면 표시", exact: true }).click();
    await settings.getByRole("checkbox", { name: "플레이어 세션 정보 요약 표시", exact: true }).check();
    await settings.getByRole("checkbox", { name: "선수 카드 보조 정보 표시", exact: true }).uncheck();
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect(adjustedPlayer).not.toContainText(/\d+승|\d+무|\d+패|\d+연[승패]/);
    await expect(adjustedPlayer.locator(":scope > span > span").first()).toHaveCSS("text-align", "center");
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(panel.getByRole("button", { name: "혼합", exact: true })).toBeVisible({ timeout: 20_000 });
    await panel.getByRole("button", { name: "혼합", exact: true }).click();
    await page.route("**/balance?room=*", async (route) => {
      if (route.request().method() === "POST" && route.request().postData()?.includes("왕의 길")) await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await panel.getByRole("button", { name: "왕의 길 선택", exact: true }).click();
    await expect(insights.getByTestId("balance-win-probability")).toHaveCount(1);
    await expect(insights).toContainText("예측 승률 · 왕의 길 반영");
    await expect(insights).toContainText("샘플");
    await expect(panel.getByRole("button", { name: "경기 시작", exact: true })).toBeEnabled();
    await panel.getByRole("button", { name: "눔바니 선택", exact: true }).click();
    await expect(insights).toContainText("예측 승률 · 눔바니 반영");
    await expect.poll(async () => (await fixture.activeRound(regular.roomId)).resolved_map_label).toBe("눔바니");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("map-insights-mobile.png"), fullPage: true });
    await panel.getByRole("button", { name: "경기 시작", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await expect(panel.locator('[data-board-slot="team1:d0"]').getByText("딜러 1", { exact: true })).toHaveCount(0);
    const spectator = await fixture.memberClient(10);
    const prediction = { session_id: round.id, user_id: fixture.users[10].id, pick_team: 1 };
    expect((await spectator.from("balance_session_predictions").insert(prediction)).error).toBeNull();
    expect((await spectator.from("balance_session_predictions").update({ pick_team: 2 }).eq("session_id", round.id).eq("user_id", prediction.user_id).select()).data).toHaveLength(1);

    // Reuse the same fixture to cover the DB-only lifetime/reward boundary.
    const owner = await fixture.memberClient(1);
    const created = await owner.rpc("create_balance_room", { p_clan_id: fixture.clanId, p_kind: "flash", p_title: "휘발성 검증" });
    expect(created.error).toBeNull();
    const flash = created.data as { series_id: string; room_id: string };
    const creatorRsvp = await owner.from("balance_room_rsvps").select("user_id,response").eq("room_id", flash.room_id);
    expect(creatorRsvp.error).toBeNull();
    expect(creatorRsvp.data).toEqual([{ user_id: ids[1], response: "going" }]);
    const flashRound = await fixture.activeRound(flash.series_id);
    const setup = await fixture.service.from("balance_sessions").update({ roster, map_ban_enabled: false, hero_ban_enabled: false }).eq("id", flashRound.id);
    expect(setup.error).toBeNull();
    const state = { version: 1, mode: "keep", stage: "complete", players: ids.map((id) => ({ id })), order: ids, captains: [], roster, sourceRoster: roster, remaining: [], log: [] };
    const formed = await fixture.service.rpc("commit_balance_formation", { p_round_id: flashRound.id, p_clan_id: fixture.clanId, p_revision: (await fixture.activeRound(flash.series_id)).formation_revision, p_state: state, p_roster: roster, p_actor_id: ids[1], p_command: "start" });
    expect(formed.error).toBeNull(); expect(formed.data).toBe(true);
    const mapped = await fixture.service.from("balance_sessions").update({ resolved_map_label: "왕의 길" }).eq("id", flashRound.id);
    expect(mapped.error).toBeNull();
    const started = await fixture.service.from("balance_sessions").update({ phase: "match_live" }).eq("id", flashRound.id);
    expect(started.error).toBeNull();
    expect((await spectator.from("balance_session_predictions").insert({ ...prediction, session_id: flashRound.id })).error?.code).toBe("42501");
    expect((await spectator.from("balance_session_predictions").update({ session_id: flashRound.id }).eq("session_id", round.id).eq("user_id", prediction.user_id)).error?.code).toBe("42501");
    const legacy = await fixture.service.from("balance_session_predictions").insert({ ...prediction, session_id: flashRound.id });
    expect(legacy.error).toBeNull();
    const blockedUpdate = await spectator.from("balance_session_predictions").update({ pick_team: 2 }).eq("session_id", flashRound.id).eq("user_id", prediction.user_id).select();
    expect(blockedUpdate.error).toBeNull(); expect(blockedUpdate.data).toEqual([]);
    await page.goto(`${fixture.path}?room=${flash.room_id}`);
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await expect(panel.getByText("승부예측", { exact: true })).toHaveCount(0);
    const predicted = await fixture.service.from("balance_session_predictions").insert({ session_id: flashRound.id, user_id: ids[0], pick_team: 1 });
    expect(predicted.error).toBeNull();
    const coinBefore = await fixture.service.from("users").select("coin_balance").eq("id", ids[0]).single();
    const outcome = await owner.rpc("set_balance_match_outcome", { p_session_id: flashRound.id, p_outcome: "team1" });
    expect(outcome.error).toBeNull(); expect(outcome.data, JSON.stringify(outcome.data)).toMatchObject({ ok: true });
    const coinAfter = await fixture.service.from("users").select("coin_balance").eq("id", ids[0]).single();
    expect(coinAfter.data).toEqual(coinBefore.data);
    const ledger = await fixture.service.from("coin_transactions").select("id").eq("reference_id", flashRound.id);
    expect(ledger.error).toBeNull(); expect(ledger.data).toEqual([]);
    const publicRecords = await fixture.service.from("balance_sessions")
      .select("id,balance_session_series!inner(opened_at,balance_rooms!inner(kind))")
      .eq("clan_id", fixture.clanId).eq("balance_session_series.balance_rooms.kind", "regular");
    expect(publicRecords.error).toBeNull(); expect(publicRecords.data?.map((row) => row.id)).not.toContain(flashRound.id);
    const closed = await owner.rpc("close_balance_session_series", { p_clan_id: fixture.clanId, p_round_id: flashRound.id });
    expect(closed.error).toBeNull();
    const remaining = await fixture.service.from("balance_session_predictions").select("session_id").eq("session_id", flashRound.id);
    expect(remaining.error).toBeNull(); expect(remaining.data).toEqual([]);
    expect((await fixture.activeRound(regular.roomId)).id).toBe(round.id);
    const scheduled = await owner.rpc("create_balance_room", { p_clan_id: fixture.clanId, p_kind: "flash", p_title: "자동 참여 예약", p_scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(), p_rsvp_days: 1 });
    expect(scheduled.error).toBeNull();
    const scheduledId = (scheduled.data as { room_id: string }).room_id;
    const reserved = await owner.from("balance_room_rsvps").select("response").eq("room_id", scheduledId).eq("user_id", ids[1]).single();
    expect(reserved.error).toBeNull(); expect(reserved.data?.response).toBe("going");
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, fixture.users[2]);
    await page.goto(fixture.path);
    for (const width of [1211, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const actions = page.getByTestId("balance-room-actions");
      await expect(actions).toHaveCount(2);
      await expect(actions.first()).toBeVisible();
      await expect(actions.last()).toBeVisible();
      const boxes = await actions.evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, width: element.getBoundingClientRect().width })));
      expect(boxes[0]).toEqual(boxes[1]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.getByTestId("clan-balance-lobby").screenshot({ path: test.info().outputPath("lobby-actions-mobile.png") });
    await page.goto(regular.url);
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await expect(panel.getByRole("button", { name: "평가 점수", exact: true })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "분석 점수", exact: true })).toHaveCount(0);
    await expect(panel.getByTestId("team1-score-total")).toHaveCount(0);
    await expect(panel.getByTestId("team2-score-total")).toHaveCount(0);
    const memberPlayer = panel.locator('[data-board-slot="team1:tank"]');
    await memberPlayer.hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "이번 세션 전적" })).toHaveCount(0);
    await expect(page.getByRole("tooltip").filter({ hasText: "평가 점수" })).toHaveCount(0);
    await expect(page.getByRole("tooltip").filter({ hasText: "분석 점수" })).toHaveCount(0);
    await expect(panel).not.toContainText("이번 세션 전적");
    await expect(memberPlayer).not.toContainText(/[+-]\d+(?:\.\d+)?점/);
    await expect(panel.getByRole("button", { name: "무승부", exact: true })).toHaveCount(0);
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(regular.url);
    await panel.getByRole("button", { name: "무승부", exact: true }).click();
    await page.getByRole("dialog", { name: "경기 결과를 확정할까요?" }).getByRole("button", { name: "결과 확정", exact: true }).click();
    await expect.poll(async () => (await fixture.activeRound(regular.roomId)).match_outcome).toBe("draw");
    await panel.locator('[data-board-slot="team1:tank"]').hover();
    const updatedPlayerInfo = page.getByRole("tooltip").filter({ hasText: "이번 세션 전적" });
    await expect(updatedPlayerInfo).toHaveCount(0);
    await expect(panel.locator('[data-board-slot="team1:tank"]')).not.toContainText(/점|\d+승|\d+무|\d+패/);
    await owner.auth.signOut();
    await spectator.auth.signOut();
  } catch (error) {
    await page.screenshot({ path: test.info().outputPath("before-fixture-cleanup.png"), fullPage: true });
    throw error;
  } finally {
    await fixture.cleanup();
  }
});
