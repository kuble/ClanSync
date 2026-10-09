import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { balanceHistoryDay } from "../src/lib/balance/history";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

test("오늘 기록: 날짜 경계·여러 방 합산·승률 정렬·좌우 배치·빈 기록", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(3);
  try {
    const day = balanceHistoryDay();
    const start = Date.parse(day.start);
    const at = (offset: number) => new Date(start + offset).toISOString();
    const ids = fixture.users.map((user) => user.id);
    const seriesIds = [randomUUID(), randomUUID()];
    const series = await fixture.service.from("balance_session_series").insert(
      seriesIds.map((id, index) => ({
        id, clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0],
        opened_at: at(index ? 3_600_000 : -3_600_000), closed_at: at(10_800_000),
      })),
    );
    expect(series.error).toBeNull();
    const roster = structuredClone(EMPTY_ROSTER);
    roster.team1.dmg[0] = ids[0];
    roster.team2.dmg[0] = ids[1];
    const laterRoster = structuredClone(roster);
    laterRoster.team2.dmg[1] = ids[2];
    const records = await fixture.service.from("balance_sessions").insert([
      { series_id: seriesIds[0], round_number: 8, opened_at: at(-1), resolved_map_label: "어제 경기", match_outcome: "team1" as const, roster },
      { series_id: seriesIds[0], round_number: 9, opened_at: at(0), resolved_map_label: "오늘 첫 경기", match_outcome: "team1" as const, roster },
      { series_id: seriesIds[1], round_number: 1, opened_at: at(7_200_000), resolved_map_label: "오늘 두 번째 경기", match_outcome: "team2" as const, roster: laterRoster },
      { series_id: seriesIds[0], round_number: 10, opened_at: day.end, resolved_map_label: "내일 경기", match_outcome: "team1" as const, roster },
    ].map((record) => ({
      ...record, clan_id: fixture.clanId, game_id: fixture.gameId, host_user_id: ids[0],
      closed_at: new Date(Date.parse(record.opened_at) + 30_000).toISOString(), phase: "match_live" as const,
    })));
    expect(records.error).toBeNull();
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await page.goto(fixture.path);
    await page.getByRole("button", { name: "내전 기록", exact: true }).click();
    const history = page.getByRole("dialog", { name: "내전 기록", exact: true });
    await expect(history.getByTestId("balance-history-round")).toHaveCount(2, { timeout: 20_000 });
    await expect(history).not.toContainText("어제 경기");
    await expect(history).not.toContainText("내일 경기");
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
    await page.setViewportSize({ width: 1220, height: 884 });
    const matches = history.getByRole("region", { name: "오늘 경기" });
    const stats = history.getByRole("region", { name: "참여자 통계" });
    const matchBounds = await matches.boundingBox();
    const statsBounds = await stats.boundingBox();
    expect(matchBounds!.x + matchBounds!.width).toBeLessThan(statsBounds!.x);
    await page.screenshot({ path: test.info().outputPath("history-today-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const mobileColumns = await history.getByTestId("balance-history-columns").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(mobileColumns.trim().split(" ")).toHaveLength(1);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "내전 기록", exact: true }).click();
    await expect(rates).toHaveAttribute("aria-sort", "descending");
    const cleared = await fixture.service.from("balance_sessions").delete().eq("clan_id", fixture.clanId);
    expect(cleared.error).toBeNull();
    await history.getByRole("button", { name: "내전 기록 새로고침" }).click();
    await expect(history).toContainText("오늘 기록된 내전 경기가 없습니다.");
  } finally {
    await fixture.cleanup();
  }
});
