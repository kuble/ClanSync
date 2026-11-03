import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { defaultMaForRoster } from "../src/lib/balance/ma-snapshot";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

test("역할 변경은 같은 역할의 점수만 사용한다", () => {
  const scores = { player: { m: 9, a: 9, roles: { tank: { m: 2, a: 1 }, dmg: { m: 6, a: -2 } } } };
  for (const [role, expected] of [["tank", { m: 2, a: 1 }], ["dmg", { m: 6, a: -2 }], ["sup", { m: 0, a: null }]] as const) {
    const roster = structuredClone(EMPTY_ROSTER);
    if (role === "tank") roster.team1.tank = "player";
    else roster.team1[role][0] = "player";
    expect(defaultMaForRoster(roster, scores).player).toEqual(expected);
  }
});

test("QA 역할별 점수 이어받기와 개인 통계 전환", async ({ page }) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "역할 점수 검증");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.slice(0, 10).map(user => user.id);
    const base = { team1: { tank: ids[0], dmg: [ids[1], ids[2]], sup: [ids[3], ids[4]] }, team2: { tank: ids[5], dmg: [ids[6], ids[7]], sup: [ids[8], ids[9]] } };
    const rosters = [structuredClone(base), structuredClone(base), structuredClone(base)];
    [rosters[1].team1.tank, rosters[1].team1.dmg[0]] = [ids[1], ids[0]];
    [rosters[2].team1.tank, rosters[2].team1.sup[0]] = [ids[3], ids[0]];
    expect((await fixture.service.from("balance_sessions").update({ round_number: 4 }).eq("id", round.id)).error).toBeNull();
    for (let i = 0; i < 3; i++) {
      const at = new Date(Date.parse(round.opened_at) - (3 - i) * 60_000).toISOString();
      expect((await fixture.service.from("balance_sessions").insert({
        clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0], series_id: round.series_id,
        round_number: i + 1, opened_at: at, closed_at: at, phase: "match_live", match_outcome: "team1",
        roster: rosters[i], ma_snapshot: { [ids[0]]: { m: [2, 6, -3][i], a: [1, 4, -2][i] } },
      })).error).toBeNull();
    }
    for (let i = 0; i < 3; i++) {
      expect((await fixture.service.from("balance_sessions").update({ roster: rosters[i] }).eq("id", round.id)).error).toBeNull();
      expect((await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({ [ids[0]]: { m: [2, 6, -3][i] } });
    }
    await page.goto(fixture.path.replace(/\/balance$/, "/stats") + `?player=${ids[0]}`);
    const roles = page.getByLabel("점수 역할", { exact: true });
    await expect(roles).toBeVisible();
    for (const [role, score] of [["돌격", "2"], ["공격", "6"], ["지원", "-3"]]) {
      await roles.getByRole("radio", { name: role, exact: true }).click();
      await expect(page.getByLabel("현재 평가 점수", { exact: true }).locator("strong")).toHaveText(score);
    }
    await page.getByRole("radio", { name: "분석 점수", exact: true }).click();
    await expect(page.getByLabel("현재 분석 점수", { exact: true }).locator("strong")).toHaveText("-2");
    const history = await fixture.service.from("balance_sessions").select("id").eq("clan_id", fixture.clanId).eq("round_number", 1).single();
    expect(history.error).toBeNull();
    const leader = await fixture.memberClient(0);
    expect((await leader.rpc("update_balance_history_mscore", { p_round_id: history.data!.id, p_clan_id: fixture.clanId, p_user_id: ids[0], p_score: 7 })).error).toBeNull();
    await page.reload();
    for (const [role, score] of [["돌격", "7"], ["공격", "6"], ["지원", "-3"]]) {
      await roles.getByRole("radio", { name: role, exact: true }).click();
      await expect(page.getByLabel("현재 평가 점수", { exact: true }).locator("strong")).toHaveText(score);
    }
    await page.getByLabel("현재 평가 점수", { exact: true }).screenshot({ path: test.info().outputPath("role-current-score.png") });
  } finally { await fixture.cleanup(); }
});
