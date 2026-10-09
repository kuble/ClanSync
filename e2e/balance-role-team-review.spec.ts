import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, createAndEnterBalanceRoom, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { parseRoster } from "../src/lib/balance/roster-schema";
import type { FormationState } from "../src/lib/balance/formation";

test.use({ actionTimeout: 20_000 });

test("역할 자동배정 후 팀 조정·저장·공유 확인을 마쳐야 다음 단계로 진행한다", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const member = await memberContext.newPage();
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path);
    const panel = page.getByTestId("clan-balance-session-panel");
    const round = await fixture.activeRound();
    const ids = fixture.users.map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const { error } = await fixture.service.from("balance_sessions").update({
      roster, formation_settings: { roles: "lottery", teams: "random" },
      map_ban_enabled: false, hero_ban_enabled: false, resolved_map_label: "부산",
    }).eq("id", round.id);
    expect(error).toBeNull();
    await page.reload();
    // Changing ballot rules clears the selected map; choose through its UI.
    const mapPicker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await expect(mapPicker).toBeVisible();
    await mapPicker.getByRole("button", { name: "부산 선택", exact: true }).click();
    await expect(mapPicker).toBeHidden();
    await loginIsolatedBalanceUser(member, fixture.users[1]);
    await member.goto(room.url);
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    await panel.getByRole("button", { name: "추첨 시작", exact: true }).click();
    await expect(panel.getByLabel("공개 추첨 진행", { exact: true })).toBeVisible();
    const next = panel.getByRole("button", { name: "다음 단계", exact: true });
    await expect(next).toBeVisible({ timeout: 25_000 });
    await expect(memberPanel).toContainText("운영진이 팀 밸런스를 조정하고 있습니다.");
    await expect(memberPanel.getByRole("button", { name: "다음 단계", exact: true })).toHaveCount(0);
    await expect(page.getByTestId("balance-preparation-overlay")).toBeHidden();
    const drawn = await fixture.activeRound();
    const state = drawn.formation_state as unknown as FormationState;
    expect(state.stage).toBe("review");
    expect(state.appliedAt).toBeUndefined();
    // The background recovery clock must not skip this operator-controlled step.
    await expect(panel).toHaveAttribute("data-balance-phase", "editing");
    const original = parseRoster(drawn.roster);
    const tank = panel.locator('[data-roster-slot="team1:tank"]');
    const blue = panel.locator('[data-roster-slot="team1:d0"]');
    const red = panel.locator('[data-roster-slot="team2:d0"]');
    await tank.click();
    await red.click();
    expect(parseRoster((await fixture.activeRound()).roster)).toEqual(original);
    await blue.click();
    await red.click();
    const swapped = structuredClone(original);
    [swapped.team1.dmg[0], swapped.team2.dmg[0]] = [swapped.team2.dmg[0], swapped.team1.dmg[0]];
    await expect.poll(async () => parseRoster((await fixture.activeRound()).roster)).toEqual(swapped);
    await expect.poll(async () => (await fixture.activeRound()).formation_state).toEqual({ ...state, roster: swapped });
    const redPlayer = fixture.users.find((user) => user.id === swapped.team1.dmg[0])!;
    await expect(memberPanel.locator('[data-board-slot="team1:d0"]')).toContainText(redPlayer.nickname);
    await page.reload();
    await expect(blue).toContainText(redPlayer.nickname);
    await expect(next).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Confirm immediately after another local edit: the flush saves it first.
    await blue.click();
    await red.click();
    await next.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 25_000 });
    await expect(memberPanel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 25_000 });
    const applied = await fixture.activeRound();
    expect(parseRoster(applied.roster)).toEqual(original);
    expect(applied.formation_state).toEqual({ ...state, stage: "complete", appliedAt: expect.any(Number) });
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});
