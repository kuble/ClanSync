import { expect, test, type Locator } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });
async function boxes(locators: Locator[]) {
  await locators[0].evaluate(async element => {
    await Promise.all(element.ownerDocument.body.getAnimations({ subtree: true }).filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
  return Promise.all(locators.map(locator => locator.boundingBox()));
}
function unchanged(before: Awaited<ReturnType<typeof boxes>>, after: Awaited<ReturnType<typeof boxes>>) {
  before.forEach((box, index) => { for (const axis of ["x", "y", "width", "height"] as const) expect(Math.abs(box![axis] - after[index]![axis]), `element ${index} ${axis}`).toBeLessThan(1); });
}

test("지연·실패·재시도 중 통계의 필터·소개·카드 영역을 유지한다", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2), player = f.users[1];
  const stats = f.path.replace(/balance$/, "stats");
  let release = () => {};
  let gate = Promise.resolve();
  let fail = false;
  try {
    const matches = await f.service.from("matches").insert(Array.from({ length: 3 }, (_, index) => ({ clan_id: f.clanId, game_id: f.gameId, match_type: "intra" as const, status: "finished" as const, played_at: `2026-09-0${index + 1}T10:00:00Z`, map_label: "부산", created_by: f.users[0].id }))).select("id");
    expect(matches.error).toBeNull();
    expect((await f.service.from("match_players").insert(matches.data!.map(match => ({ match_id: match.id, user_id: player.id, team: 1 })))).error).toBeNull();
    expect((await f.service.from("match_results").insert(matches.data!.map(match => ({ match_id: match.id, winner_team: 1 })))).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.route(`**/api/clans/${f.clanId}/stats?section=personal&userId=${player.id}`, async route => {
      await gate;
      if (fail) await route.fulfill({ status: 503, json: { error: "unavailable" } });
      else await route.continue();
    });
    for (const width of [1280, 390]) {
      gate = new Promise<void>(resolve => { release = resolve; });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(stats + "?player=" + player.id);
      const filter = page.getByRole("region", { name: "개인 기록 기간", exact: true });
      const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
      const summary = page.getByRole("region", { name: "플레이어 요약", exact: true });
      const maps = page.getByRole("region", { name: "맵별 승률", exact: true });
      await expect(filter.locator("..")).toHaveAttribute("aria-busy", "true");
      await expect(banner).toHaveAttribute("aria-busy", "false");
      await expect(summary.getByText("—", { exact: true }).first()).toBeVisible();
      const before = await boxes([filter, banner, summary, maps]);
      const nodes = await Promise.all([filter, banner, summary, maps].map(locator => locator.elementHandle()));
      if (width === 1280) await page.screenshot({ path: info.outputPath("personal-stats-pending.png") });
      release();
      await expect(filter.locator("..")).toHaveAttribute("aria-busy", "false");
      await expect(summary).toContainText("100.0%");
      unchanged(before, await boxes([filter, banner, summary, maps]));
      for (const node of nodes) expect(await node!.evaluate(element => element.isConnected)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    fail = true;
    gate = Promise.resolve();
    await page.reload();
    const filter = page.getByRole("region", { name: "개인 기록 기간", exact: true });
    const summary = page.getByRole("region", { name: "플레이어 요약", exact: true });
    await expect(page.getByRole("alert").filter({ hasText: "통계 기록을 불러오지 못했습니다." })).toBeVisible();
    const failed = await boxes([filter, summary]);
    fail = false;
    gate = new Promise<void>(resolve => { release = resolve; });
    await page.getByRole("button", { name: "다시 불러오기", exact: true }).click();
    unchanged(failed, await boxes([filter, summary]));
    release();
    await expect(summary).toContainText("100.0%");
    unchanged(failed, await boxes([filter, summary]));
  } finally { release(); await f.cleanup(); }
});

test("전략 아이템과 이전 기록 조회는 로딩 전후 창과 목록 높이를 유지한다", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  let hold = false, release = () => {};
  let gate = Promise.resolve();
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.route("**/*", async route => {
      if (hold && route.request().method() === "POST") await gate;
      await route.continue();
    });
    await createAndEnterBalanceRoom(page, f.path);
    await page.getByRole("button", { name: "경기 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "경기 설정", exact: true });
    await settings.getByRole("combobox", { name: "팀원 선발 방식", exact: true }).selectOption("auction");
    hold = true;
    gate = new Promise<void>(resolve => { release = resolve; });
    await settings.getByRole("switch", { name: "전략 아이템 사용", exact: true }).check();
    const items = page.getByTestId("round-auction-items");
    await expect(items.getByRole("status")).toContainText("아이템을 불러오는 중");
    const beforeItems = await boxes([items]);
    hold = false; release();
    await expect(items.getByRole("region", { name: "클랜 기본 아이템 선택", exact: true })).toBeVisible();
    unchanged(beforeItems, await boxes([items]));
    await page.keyboard.press("Escape");
    await page.goto(f.path.replace(/balance$/, "manage?tab=members"));
    hold = true;
    gate = new Promise<void>(resolve => { release = resolve; });
    await page.getByRole("button", { name: `${f.users[1].nickname} 이전 기록 관리`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "이전 내전 기록", exact: true });
    const results = dialog.getByLabel("기존 참가자 검색 결과", { exact: true });
    await expect(results).toHaveAttribute("aria-busy", "true");
    const beforeRecords = await boxes([dialog, results, dialog.getByRole("button", { name: "취소", exact: true })]);
    hold = false; release();
    await expect(results).toHaveAttribute("aria-busy", "false");
    unchanged(beforeRecords, await boxes([dialog, results, dialog.getByRole("button", { name: "취소", exact: true })]));
  } finally { release(); await f.cleanup(); }
});
