import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { analysisValue, parseAnalysisContext } from "../src/lib/balance/analysis-context";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ actionTimeout: 20_000 });

test("미리 선택한 맵은 주장 지명과 추첨 완료 후 다시 선택하지 않는다", async ({ page }) => {
  test.setTimeout(120_000);
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
      const picker = panel.getByRole("region", { name: "경기 맵", exact: true });
      await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
      await picker.getByRole("button", { name: "리장 타워 선택", exact: true }).click();
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("리장 타워");
      // A selected map can still be changed while editing the formation.
      const summary = panel.locator("details > summary").filter({ hasText: "경기 맵" });
      await expect(summary).toContainText("리장 타워");
      await summary.click();
      await expect(picker).toBeVisible();
      await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("부산");
      await panel.getByRole("button", { name: mode === "draft" ? "편성 진행" : "추첨 시작", exact: true }).click();
      if (mode === "draft") {
        const candidates = panel.locator('[aria-label="지명 가능한 선수"]');
        for (let pick = 0; pick < 8; pick++) {
          await expect(candidates.getByRole("button")).toHaveCount(8 - pick);
          await candidates.locator("button:enabled").first().click();
        }
      }
      await expect(panel.getByRole("heading", { name: /경기 준비/ })).toBeVisible({ timeout: 20_000 });
      await expect(picker).toHaveCount(0);
      const ready = panel.getByRole("region", { name: "경기 준비", exact: true });
      await expect(ready).toContainText("부산");
      await expect(ready.getByRole("button", { name: /선택$/ })).toHaveCount(0);
      expect((await fixture.activeRound(room.roomId)).resolved_map_label).toBe("부산");
      await panel.getByRole("button", { name: "화면 안내", exact: true }).click();
      const guide = page.getByRole("dialog", { name: "선정된 맵", exact: true });
      await expect(guide).toBeVisible();
      await guide.getByRole("button", { name: "닫기", exact: true }).click();
      await ready.getByRole("button", { name: heroBan ? "영웅 밴 시작" : "경기 시작", exact: true }).click();
      await expect(panel).toHaveAttribute("data-balance-phase", heroBan ? "hero_ban" : "match_live");
      expect((await fixture.activeRound(room.roomId)).resolved_map_label).toBe("부산");
      await panel.screenshot({ path: test.info().outputPath(`preselected-map-${mode}.png`) });
    }
  } finally { await fixture.cleanup(); }
});

test("편성 중 맵 변경은 분석만 변경하고 경기 중 분석은 읽기 전용", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "맵 분석 검증");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.slice(0, 10).map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const historyStart = Date.parse(round.opened_at) - 60 * 60_000;
    expect((await fixture.service.from("balance_sessions").update({ round_number: 21 }).eq("id", round.id)).error).toBeNull();
    const history = await fixture.service.from("balance_sessions").insert(Array.from({ length: 20 }, (_, i) => ({
      clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0], series_id: round.series_id,
      round_number: i + 1, opened_at: new Date(historyStart + i * 60_000).toISOString(),
      closed_at: new Date(historyStart + i * 60_000 + 30_000).toISOString(), phase: "match_live" as const,
      match_outcome: i < 10 ? "team1" as const : "team2" as const,
      resolved_map_label: i < 10 ? "리장 타워" : "오아시스", roster,
    })));
    expect(history.error).toBeNull();
    const seed = await fixture.service.from("balance_sessions").update({
      round_number: 21, roster, map_ban_enabled: false, hero_ban_enabled: false,
      formation_settings: { roles: "manual", teams: "keep" },
      ma_snapshot: Object.fromEntries(ids.map((id) => [id, { m: 2, a: null }])),
    }).eq("id", round.id);
    expect(seed.error).toBeNull();
    const leader = await fixture.memberClient(0);
    const member = await fixture.memberClient(10);
    expect((await member.rpc("read_balance_analysis_context", { p_round_id: round.id, p_clan_id: fixture.clanId })).error?.code).toBe("42501");
    const model = await leader.rpc("read_balance_analysis_context", { p_round_id: round.id, p_clan_id: fixture.clanId });
    expect(model.error).toBeNull();
    const context = parseAnalysisContext(model.data);
    expect(analysisValue(context, ids[0], "tank", "리장 타워")).toBe(5);
    expect(analysisValue(context, ids[0], "tank", "오아시스")).toBe(-5);
    expect(analysisValue(context, ids[0], "tank", "왕의 길")).toBe(0);
    expect(analysisValue(context, fixture.users[10].id, null, null)).toBeNull();

    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    await expect(panel.locator('[data-roster-slot="team1:tank"]')).toBeVisible();
    const picker = panel.getByRole("region", { name: "경기 맵", exact: true });
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "리장 타워 선택", exact: true }).click();
    await expect.poll(async () => (await fixture.activeRound(room.roomId)).resolved_map_label).toBe("리장 타워");
    await panel.getByRole("button", { name: "분석 점수", exact: true }).click();
    const card = panel.locator('[data-roster-slot="team1:tank"]');
    await expect(card).toContainText("+5점");
    await panel.locator("details > summary").filter({ hasText: "경기 맵" }).click();
    await picker.getByRole("button", { name: "오아시스 선택", exact: true }).click();
    await expect(card).toContainText("-5점");
    const mapRound = await fixture.activeRound(room.roomId);
    expect((mapRound.ma_snapshot as Record<string, { m: number; a: number }>)[ids[0]]).toEqual({ m: 2, a: -5 });
    await panel.getByRole("button", { name: "평가 점수", exact: true }).click();
    await expect(card).toContainText("+2점");
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await panel.getByRole("button", { name: "경기 시작", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await panel.getByRole("button", { name: "점수 조정", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "참가자 점수 조정", exact: true });
    await drawer.getByRole("button", { name: "분석 점수", exact: true }).click();
    await expect(drawer.getByRole("spinbutton")).toHaveCount(0);
    await expect(drawer.getByRole("button", { name: "점수 저장", exact: true })).toHaveCount(0);
    await expect(drawer).toContainText("수정할 수 없습니다");
    await drawer.getByRole("button", { name: "평가 점수", exact: true }).click();
    await drawer.getByRole("spinbutton").first().fill("3");
    await drawer.getByRole("button", { name: "점수 저장", exact: true }).click();
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
    await drawer.screenshot({ path: test.info().outputPath("analysis-read-only.png") });
  } finally { await fixture.cleanup(); }
});
