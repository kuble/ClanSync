import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { analysisValue, parseAnalysisContext } from "../src/lib/balance/analysis-context";
import { analysisWinPercent, buildPredictionModel, readPredictionBasis } from "../src/lib/balance/analysis-prediction";
import { parseRoster } from "../src/lib/balance/roster-schema";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ actionTimeout: 20_000 });

test("미리 선택한 맵은 주장 지명과 추첨 완료 후 다시 선택하지 않는다", async ({ page }) => {
  test.setTimeout(240_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    // The operator is not a captain, so one browser can manage both draft turns.
    const ids = fixture.users.slice(1, 11).map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    for (const mode of ["draft", "random"] as const) {
      const heroBan = mode === "random";
      const room = await createAndEnterBalanceRoom(page, fixture.path, `선택 맵 유지 ${mode}`);
      const round = await fixture.activeRound(room.roomId);
      expect((await fixture.service.from("balance_sessions").update({
        roster, map_ban_enabled: false, hero_ban_enabled: heroBan,
        formation_settings: { roles: "manual", teams: mode },
      }).eq("id", round.id)).error).toBeNull();
      await page.reload();
      const panel = page.getByTestId("clan-balance-session-panel");
      const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
      await expect(picker.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(picker.getByRole("button", { name: "리장 타워 선택", exact: true })).toBeVisible();
      await picker.getByRole("button", { name: "리장 타워 선택", exact: true }).click();
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("리장 타워");
      // A selected map can still be changed while editing the formation.
      await expect(picker).toBeHidden();
      await panel.getByRole("button", { name: "경기 맵 변경 · 리장 타워", exact: true }).click();
      await expect(picker).toBeVisible();
      await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("부산");
      await panel.getByRole("button", { name: mode === "draft" ? "편성 진행" : "추첨 시작", exact: true }).click();
      if (mode === "draft") {
        const candidates = panel.locator('[aria-label="지명 가능한 선수"]');
        for (let pick = 0; pick < 8; pick++) {
          await expect(candidates.getByRole("button")).toHaveCount(8 - pick, { timeout: 20_000 });
          await candidates.locator("button:enabled").first().click();
        }
      }
      await expect(picker).toBeHidden();
      const nextPhase = heroBan ? "hero_ban" : "match_live";
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).phase, { timeout: 60_000 }).toBe(nextPhase);
      await expect(panel).toHaveAttribute("data-balance-phase", nextPhase, { timeout: 20_000 });
      expect((await fixture.activeRound(room.roomId)).resolved_map_label).toBe("부산");
      await panel.screenshot({ path: test.info().outputPath(`preselected-map-${mode}.png`) });
    }
  } finally { await fixture.cleanup(); }
});

test("편성 중 맵 변경은 분석만 변경하고 경기 중 분석은 읽기 전용", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 979, height: 884 });
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const playerId = fixture.users[1].id;
    const player = await fixture.memberClient(1);
    const membership = await player.from("clan_members").select("joined_at").eq("clan_id", fixture.clanId).eq("user_id", playerId).single();
    const signup = { p_clan_id: fixture.clanId, p_joined_at: membership.data!.joined_at! };
    expect((await player.rpc("complete_balance_score_welcome", { ...signup, p_scores: { tank: 0, dmg: 1, sup: -3.4 } })).data).toBe(true);
    expect((await player.rpc("complete_balance_score_welcome", { ...signup, p_scores: { dmg: 5.4 } })).data).toBe(true);
    const entry = await player.from("clan_members").select("welcome_completed_at").eq("clan_id", fixture.clanId).eq("user_id", playerId).single();
    const enteredAt = Date.parse(entry.data!.welcome_completed_at!);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "맵 분석 검증");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.slice(0, 10).map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const historyStart = Date.parse(round.opened_at) - 60 * 60_000;
    const leader = await fixture.memberClient(0);
    const args = { p_clan_id: fixture.clanId, p_round_id: round.id };
    const opening = await leader.rpc("read_balance_analysis_model", args);
    expect(opening.error).toBeNull();
    const initialBasis = readPredictionBasis((opening.data as { basis: Json }).basis);
    expect(initialBasis.ratings).toEqual({ [playerId + ":tank"]: 0, [playerId + ":dmg"]: 0.5, [playerId + ":sup"]: -1.7 });
    const initialForecast = buildPredictionModel([], round.opened_at, {}, initialBasis);
    expect(analysisWinPercent(initialForecast, parseRoster(roster), null)).toBeCloseTo(100 / (1 + (0.35 / 0.65) ** 0.1), 8);
    // One damage appearance predates signup. The next 19 use the remaining role weight.
    const historyTimes = Array.from({ length: 20 }, (_, i) => i === 0 ? historyStart : enteredAt + i * 10);
    expect(historyTimes[19] + 1).toBeLessThan(Date.parse(round.opened_at));
    expect((await fixture.service.from("balance_sessions").update({ round_number: 21 }).eq("id", round.id)).error).toBeNull();
    const history = await fixture.service.from("balance_sessions").insert(Array.from({ length: 20 }, (_, i) => ({
      clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0], series_id: round.series_id,
      round_number: i + 1, opened_at: new Date(historyTimes[i]).toISOString(),
      closed_at: new Date(historyTimes[i] + 1).toISOString(), phase: "match_live" as const,
      match_outcome: i < 10 ? "team1" as const : "team2" as const,
      resolved_map_label: i < 10 ? "리장 타워" : "오아시스", roster,
    }))).select("id,round_number").order("round_number");
    expect(history.error).toBeNull();
    // Assign roles before setting their explicit evaluation scores.
    expect((await fixture.service.from("balance_sessions").update({ roster }).eq("id", round.id)).error).toBeNull();
    const seed = await fixture.service.from("balance_sessions").update({
      round_number: 21, roster, map_ban_enabled: false, hero_ban_enabled: false,
      formation_settings: { roles: "manual", teams: "keep" },
      ma_snapshot: Object.fromEntries(ids.map((id) => [id, { m: 2, a: null }])),
    }).eq("id", round.id);
    expect(seed.error).toBeNull();
    const member = await fixture.memberClient(10);
    expect((await member.rpc("read_balance_analysis_context", { p_round_id: round.id, p_clan_id: fixture.clanId })).error?.code).toBe("42501");
    expect((await member.rpc("read_balance_analysis_model", { p_round_id: round.id, p_clan_id: fixture.clanId })).error?.code).toBe("42501");
    const prediction = await leader.rpc("read_balance_analysis_model", { p_round_id: round.id, p_clan_id: fixture.clanId });
    expect(prediction.error).toBeNull();
    const basis = readPredictionBasis((prediction.data as { basis: Json }).basis);
    const editorContext = parseAnalysisContext((prediction.data as { context: Json }).context);
    expect(analysisValue(editorContext, ids[0], "tank", "리장 타워")).toBe(5);
    let learned = 0;
    for (let i = 0; i < 20; i++) {
      const signupContribution = i === 0 ? 0 : 0.5 - i * 0.025;
      const difference = 2 * learned + signupContribution / 5;
      const expected = 1 / (1 + (0.35 / 0.65) ** difference);
      expect(basis.baselines[history.data![i].id]).toBeCloseTo(expected, 8);
      learned += (i < 10 ? 0.2 : 0.12) * ((i < 10 ? 1 : 0) - expected);
    }
    expect(basis.ratings[playerId + ":tank"]).toBe(0);
    expect(basis.ratings[playerId + ":sup"]).toBe(-1.7);
    expect(basis.ratings[playerId + ":dmg"]).toBeCloseTo(learned, 8);
    expect(basis.ratings[ids[5] + ":tank"]).toBeCloseTo(-learned, 8);
    expect(Object.keys(basis.baselines)).toHaveLength(20);
    const model = await leader.rpc("read_balance_analysis_context", { p_round_id: round.id, p_clan_id: fixture.clanId });
    expect(model.error).toBeNull();
    const context = parseAnalysisContext(model.data);
    expect(analysisValue(context, playerId, "dmg", "오아시스")).toBeCloseTo(learned, 8);
    expect(analysisValue(context, playerId, "sup", null)).toBe(-1.7);
    expect(analysisValue(context, ids[0], "tank", "리장 타워")).toBe(5);
    expect(analysisValue(context, ids[0], "tank", "오아시스")).toBe(-5);
    expect(analysisValue(context, ids[0], "tank", "왕의 길")).toBe(0);
    expect(analysisValue(context, fixture.users[10].id, null, null)).toBeNull();

    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    await expect(panel.locator('[data-roster-slot="team1:tank"]')).toBeVisible();
    const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "리장 타워 선택", exact: true }).click();
    const changeMap = panel.getByRole("button", { name: "경기 맵 변경 · 리장 타워", exact: true });
    await expect(changeMap).toContainText("변경");
    await changeMap.click();
    await expect(picker).toBeVisible();
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("리장 타워");
    await panel.getByRole("button", { name: "분석 점수", exact: true }).click();
    const card = panel.locator('[data-roster-slot="team1:tank"]');
    await expect(panel.locator('[data-roster-slot="team1:d0"]')).toContainText(learned.toFixed(2));
    await expect(card).toContainText("+5", { timeout: 15_000 });
    const blueChance = panel.getByTestId("team-comparison-graph").getByLabel("1팀 예측 승률", { exact: true });
    const lijiang = parseFloat((await blueChance.textContent())!);
    await panel.getByRole("button", { name: "경기 맵 변경 · 리장 타워", exact: true }).click();
    await picker.getByRole("button", { name: "오아시스 선택", exact: true }).click();
    await expect(card).toContainText("-5", { timeout: 15_000 });
    await expect.poll(async () => parseFloat((await blueChance.textContent())!)).toBeCloseTo(lijiang - 5, 1);
    await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("오아시스");
    const mapRound = await fixture.activeRound(room.roomId);
    expect((mapRound.ma_snapshot as Record<string, { a: number }>)[playerId].a).toBeCloseTo(learned, 8);
    expect((mapRound.ma_snapshot as Record<string, { m: number; a: number }>)[ids[0]]).toEqual({ m: 2, a: -5 });
    await panel.getByRole("button", { name: "평가 점수", exact: true }).click();
    await expect(card).toContainText("+2");
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();

    await expect.poll(async () => {
      const current = await fixture.activeRound(room.roomId);
      return { phase: current.phase, formation: (current.formation_state as { stage?: string } | null)?.stage };
    }, { timeout: 60_000 }).toMatchObject({ phase: "match_live" });
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 20_000 });
    await expect(panel.getByRole("button", { name: "점수 조정", exact: true })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "분석 점수", exact: true })).toHaveCount(0);
    await panel.getByRole("button", { name: `${fixture.users[0].nickname} 평가 점수 수정`, exact: true }).click();
    await panel.getByRole("textbox", { name: `${fixture.users[0].nickname} 평가 점수`, exact: true }).fill("3");
    await panel.getByRole("button", { name: `${fixture.users[0].nickname} 점수 저장`, exact: true }).click();
    await expect.poll(async () => (await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({ [ids[0]]: { m: 3, a: -5 } });
    // A forged direct RPC cannot alter the frozen A even with valid edit permission.
    const forged = { ...(await fixture.activeRound(room.roomId)).ma_snapshot as Record<string, Json> };
    forged[ids[0]] = { m: 4, a: 9 };
    expect((await leader.rpc("set_balance_scores", { p_round_id: round.id, p_clan_id: fixture.clanId, p_snapshot: forged })).error).toBeNull();
    expect((await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({ [ids[0]]: { m: 4, a: -5 } });
    expect((await member.rpc("set_balance_scores", { p_round_id: round.id, p_clan_id: fixture.clanId, p_snapshot: forged })).error?.code).toBe("42501");
    const direct = await leader.from("balance_sessions").update({ ma_snapshot: forged }).eq("id", round.id);
    expect(direct.error?.code).toBe("42501");
    const beforeEmpty = (await fixture.activeRound(room.roomId)).ma_snapshot;
    expect((await leader.rpc("set_balance_scores", { p_round_id: round.id, p_clan_id: fixture.clanId, p_snapshot: {} })).error).toBeNull();
    expect((await fixture.activeRound(room.roomId)).ma_snapshot).toEqual(beforeEmpty);
    await panel.screenshot({ path: test.info().outputPath("analysis-read-only.png") });
  } finally { await fixture.cleanup(); }
});
