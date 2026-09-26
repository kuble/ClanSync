import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanStatsPage } from "../src/lib/clan/stats/load-clan-stats";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("stats: period-wide filters, wheel, tooltip, record tab and staff qualification boundary", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3);
  try {
    const rows = await ok(f.service.from("matches").insert(Array.from({ length: 10 }, (_, i) => ({ clan_id: f.clanId, game_id: f.gameId, match_type: "intra" as const, status: "finished" as const, played_at: i === 0 ? "2025-07-01T10:00:00Z" : "2025-08-02T10:00:00Z", map_label: i === 0 ? "부산" : "네팔", created_by: f.users[0].id }))).select("id, map_label"));
    await ok(f.service.from("match_players").insert(rows.flatMap((row) => [{ match_id: row.id, user_id: f.users[0].id, team: 1 }, ...(row.map_label === "부산" ? [{ match_id: row.id, user_id: f.users[1].id, team: 2 }] : [])])));
    await ok(f.service.from("match_results").insert(rows.map((row) => ({ match_id: row.id, winner_team: 1 }))));
    const [leader, member] = await Promise.all([f.memberClient(0), f.memberClient(1)]);
    const [staffModel, memberModel] = await Promise.all([loadClanStatsPage(leader, f.users[0].id, f.clanId), loadClanStatsPage(member, f.users[1].id, f.clanId)]);
    expect(staffModel?.hof.periods.all.minimumGames).toBe(3);
    expect(staffModel?.hof.periods.all.unqualified.map((row) => row.userId).sort()).toEqual([f.users[1].id, f.users[2].id].sort());
    expect(memberModel?.hof.periods.all.unqualified).toEqual([]);
    expect(memberModel?.intraPeriods.all).toMatchObject({ completed: 10, participants: 2 });
    expect(JSON.stringify(memberModel?.intraPeriods)).not.toContain(f.users[1].id);
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "stats"));
    await expect(page.getByText("3경기 이상 출전", { exact: true })).toBeVisible();
    await page.getByText(/규정 미달 2명/).click();
    await expect(page.getByLabel("규정 미달 멤버")).toContainText("0 / 3경기");
    await page.getByRole("tab", { name: "내전 통계" }).click();
    const summary = page.getByLabel("선택 기간 요약");
    const completed = summary.getByRole("button", { name: /완료 경기/ });
    await expect(completed).toContainText("10경기");
    await completed.click();
    await expect(page.getByRole("searchbox", { name: "경기 참가자 검색" })).toHaveCount(0);
    await page.getByRole("radio", { name: "월별", exact: true }).click();
    await page.getByRole("listbox", { name: "연도", exact: true }).press("End");
    const month = page.getByRole("listbox", { name: "월", exact: true });
    await month.press("Home");
    for (let i = 0; i < 6; i++) await month.press("ArrowDown");
    await expect(month.getByRole("option", { selected: true })).toHaveText("7월");
    await expect(completed).toContainText("1경기");
    await expect(page.getByLabel("맵별 경기 비중")).toContainText("부산");
    await month.hover();
    // A large mouse-wheel impulse must advance one month, not skip to December.
    await page.mouse.wheel(0, 800);
    await expect(month.getByRole("option", { selected: true })).toHaveText("8월");
    await expect(completed).toContainText("9경기");
    await expect(page.getByLabel("맵별 경기 비중")).toContainText("네팔");
    const chart = page.getByRole("img", { name: /완료 경기 그래프/ });
    await chart.hover();
    await expect(page.getByRole("status", { name: "참여 추이 선택 값" })).toBeVisible();
    await chart.focus(); await chart.press("Home"); await chart.press("ArrowRight");
    await expect(page.getByRole("status", { name: "참여 추이 선택 값" })).toContainText("9경기");
    await expect(page.getByRole("listbox", { name: "일자", exact: true })).toHaveCount(0);
    await expect(completed).toContainText("9경기");
    await page.getByRole("tab", { name: "경기 기록" }).click();
    await expect(page.getByRole("searchbox", { name: "경기 참가자 검색" })).toBeVisible();
    await expect(page.getByLabel("경기 기록 주간 달력")).toBeVisible();
    await page.getByRole("tab", { name: "내전 통계" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("radio", { name: "월별", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("tab", { name: "명예의 전당" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await f.cleanup(); }
});
