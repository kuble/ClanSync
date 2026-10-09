import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

test.use({ actionTimeout: 20_000 });

test("현재 내전 기록: 다른 방 제외·좌우 드래그·승률 정렬·우측 요약·빈 기록", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(3);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "현재 내전 기록");
    const active = await fixture.activeRound(room.roomId);
    const ids = fixture.users.map((user) => user.id);
    const roster = structuredClone(EMPTY_ROSTER);
    roster.team1.dmg[0] = ids[0];
    roster.team2.dmg[0] = ids[1];
    const laterRoster = structuredClone(roster);
    laterRoster.team2.dmg[1] = ids[2];
    expect((await fixture.service.from("balance_sessions").update({ round_number: 3, roster }).eq("id", active.id)).error).toBeNull();
    const otherId = randomUUID();
    expect((await fixture.service.from("balance_session_series").insert({
      id: otherId, clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0], closed_at: new Date().toISOString(),
    })).error).toBeNull();
    expect((await fixture.service.from("balance_sessions").insert([
      { series_id: active.series_id, round_number: 1, resolved_map_label: "첫 경기", match_outcome: "team1" as const, roster },
      { series_id: active.series_id, round_number: 2, resolved_map_label: "두 번째 경기", match_outcome: "team2" as const, roster: laterRoster },
      { series_id: otherId, round_number: 1, resolved_map_label: "다른 내전 경기", match_outcome: "team1" as const, roster },
    ].map((record) => ({
      ...record, clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0],
      phase: "match_live" as const, closed_at: new Date().toISOString(),
    })))).error).toBeNull();
    await page.reload();
    await page.setViewportSize({ width: 1220, height: 884 });
    await page.getByRole("button", { name: "내전 기록 열기", exact: true }).hover();
    const history = page.getByRole("dialog", { name: "내전 기록", exact: true });
    await expect(history.getByTestId("balance-history-round")).toHaveCount(3, { timeout: 20_000 });
    await expect(history).not.toContainText("다른 내전 경기");
    await expect(history.getByRole("combobox")).toHaveCount(0);
    const rates = history.getByRole("columnheader", { name: /승률/ });
    await expect(rates).toHaveAttribute("aria-sort", "descending");
    const rows = history.locator("tbody tr");
    await expect(rows.first()).toContainText(fixture.users[2].nickname);
    const leader = rows.filter({ hasText: fixture.users[0].nickname });
    await expect(leader).toContainText("1/0/1");
    await expect(leader).toContainText("50%");
    await expect(leader).toContainText("1연패");
    await expect(history.getByRole("columnheader", { name: /승수/ })).toContainText("승/무/패");
    await expect(history.getByRole("columnheader")).toHaveCount(5);
    await rates.getByRole("button").click();
    await expect(rates).toHaveAttribute("aria-sort", "ascending");
    const matches = history.getByRole("region", { name: /^경기 기록 \d/ });
    const stats = history.getByRole("region", { name: "참여자 통계" });
    const matchBounds = await matches.boundingBox();
    const statsBounds = await stats.boundingBox();
    const summaryBounds = await history.getByText("완료 경기", { exact: true }).boundingBox();
    expect(matchBounds!.x + matchBounds!.width).toBeLessThan(statsBounds!.x);
    expect(summaryBounds!.x).toBeGreaterThan(matchBounds!.x + matchBounds!.width);
    expect(summaryBounds!.y).toBeLessThan(statsBounds!.y);
    const carousel = history.getByTestId("balance-history-carousel");
    const bounds = (await carousel.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + 28);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + 28, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => carousel.evaluate((element) => Math.round(element.scrollLeft / (element.clientWidth + 12)))).toBe(1);
    await history.getByRole("button", { name: "다음 경기 보기" }).click();
    await expect.poll(() => carousel.evaluate((element) => Math.round(element.scrollLeft / (element.clientWidth + 12)))).toBe(2);
    await expect(history.getByRole("button", { name: "다음 경기 보기" })).toBeDisabled();
    await carousel.focus();
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => carousel.evaluate((element) => Math.round(element.scrollLeft / (element.clientWidth + 12)))).toBe(1);
    await page.screenshot({ path: test.info().outputPath("history-current-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const columns = await history.getByTestId("balance-history-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.trim().split(" ")).toHaveLength(1);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "내전 기록", exact: true }).click();
    await expect(rates).toHaveAttribute("aria-sort", "descending");
    expect((await fixture.service.from("balance_sessions").delete().eq("series_id", active.series_id)).error).toBeNull();
    await history.getByRole("button", { name: "내전 기록 새로고침" }).click();
    await expect(history).toContainText("아직 기록된 내전 경기가 없습니다.");
    await expect(history).not.toContainText("다른 내전 경기");
  } finally { await fixture.cleanup(); }
});
