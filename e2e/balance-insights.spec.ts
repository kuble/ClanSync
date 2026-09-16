import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
test.use({ actionTimeout: 15_000 });

test("점수 토글·즉시 맵 비교·깜짝 결과 무보상과 데이터 삭제", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(10);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const regular = await createAndEnterBalanceRoom(page, fixture.path, "점수 비교 검증");
    const ids = fixture.users.map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const scores = Object.fromEntries(ids.map((id, i) => [id, { m: i < 5 ? 1 : 3, a: i < 5 ? 2 : 4 }]));
    const round = await fixture.activeRound(regular.roomId);
    const seed = await fixture.service.from("balance_sessions").update({ roster, ma_snapshot: scores }).eq("id", round.id);
    expect(seed.error).toBeNull();
    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    const insights = panel.getByRole("complementary", { name: "팀 밸런스 비교" });
    await expect(insights).toContainText("1팀 5.0");
    await panel.getByRole("button", { name: "A 점수", exact: true }).click();
    await expect(insights).toContainText("1팀 10.0");
    await expect(panel.locator('[data-roster-slot="team1:tank"]')).toContainText("A 2");
    await panel.getByRole("button", { name: "M 점수", exact: true }).click();
    await panel.locator('[data-roster-slot="team1:tank"]').click();
    await panel.locator('[data-roster-slot="team2:tank"]').click();
    await expect(insights).toContainText("1팀 7.0");
    await expect(insights).toContainText("2팀 13.0");
    await expect(insights).not.toContainText("50%");
    await expect(panel.getByTestId("balance-formation").getByRole("button", { name: "세션 종료", exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    await settings.getByRole("radio", { name: /직접 배정/ }).check();
    await settings.getByRole("combobox", { name: "팀원 선발 방식", exact: true }).selectOption("keep");
    await settings.getByRole("checkbox", { name: "맵 밴 사용", exact: true }).uncheck();
    await settings.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }).uncheck();
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await panel.getByRole("button", { name: "편성 시작", exact: true }).click();
    await panel.getByRole("button", { name: "편성 적용", exact: true }).click();
    await panel.getByRole("button", { name: "혼합", exact: true }).click();
    await page.route("**/balance?room=*", async (route) => {
      if (route.request().method() === "POST" && route.request().postData()?.includes("왕의 길")) await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await panel.getByRole("button", { name: "왕의 길 선택", exact: true }).click();
    await expect(insights).toContainText("맵 반영 승률 · 왕의 길");
    await expect(insights).toContainText("예측 준비 중");
    await expect(panel.getByRole("button", { name: "경기 시작", exact: true })).toBeEnabled();
    await panel.getByRole("button", { name: "눔바니 선택", exact: true }).click();
    await expect(insights).toContainText("맵 반영 승률 · 눔바니");
    await expect.poll(async () => (await fixture.activeRound(regular.roomId)).resolved_map_label).toBe("눔바니");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("map-insights-mobile.png"), fullPage: true });

    // Reuse the same fixture to cover the DB-only lifetime/reward boundary.
    const owner = await fixture.memberClient(1);
    const created = await owner.rpc("create_balance_room", { p_clan_id: fixture.clanId, p_kind: "flash", p_title: "휘발성 검증" });
    expect(created.error).toBeNull();
    const flash = created.data as { series_id: string; room_id: string };
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
    await owner.auth.signOut();
  } finally {
    await fixture.cleanup();
  }
});
