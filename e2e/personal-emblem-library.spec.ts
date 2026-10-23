import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import type { PersonalEmblemCollection } from "../src/lib/personal-emblems/types";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const result = await query;
  expect(result.error, JSON.stringify(result.error)).toBeNull();
  return result.data as NonNullable<T>;
}

test("게임 아이콘 필터와 월간·연간 진열은 키보드·모바일·상세 이력을 유지한다", async ({ page }, info) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(1);
  let valClan: string | undefined;
  try {
    const valorant = await ok(f.service.from("games").select("id,name_ko").eq("slug", "valorant").single());
    const clan = await ok(f.service.from("clans").insert({ game_id: valorant.id, name: `Filter-${f.users[0].id.slice(0, 8)}` }).select("id").single());
    valClan = clan.id;
    await ok(f.service.from("clan_members").insert({ clan_id: valClan, user_id: f.users[0].id, role: "leader", status: "active" }));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile/emblems");
    await expect(page.locator("[data-unearned-award]")).toHaveCount(10);
    await expect(page.getByText("아직 획득한 엠블럼이 없습니다.", { exact: true })).toHaveCount(0);
    for (const [index, clanId] of [f.clanId, valClan].entries()) await ok(f.service.rpc("finalize_clan_personal_emblem_awards", {
      p_clan_id: clanId, p_period_type: "month", p_period_key: "2024-02", p_awards: [{ user_id: f.users[0].id, family: "victory", rank: index + 1 }],
    }));
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", {
      p_clan_id: valClan, p_period_type: "year", p_period_key: "2024", p_awards: [{ user_id: f.users[0].id, family: "victory", rank: 1 }],
    }));
    await page.reload();
    const view = page.locator("[data-personal-emblem-case]");
    const game = view.getByRole("radiogroup", { name: "엠블럼 게임", exact: true });
    const category = view.getByRole("radiogroup", { name: "엠블럼 분류", exact: true });
    await expect(view.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(game.getByRole("radio")).toHaveCount(3);
    expect(await game.getByRole("radio").allTextContents()).toEqual(["", "", ""]);
    await expect(view.getByRole("combobox", { name: "엠블럼 게임", exact: true })).toHaveCount(0);
    await expect(view.getByText("수상과 성장 기록", { exact: true })).toHaveCount(0);
    await expect(view.getByRole("heading", { name: /^(수상|개인의 성장)$/ })).toHaveCount(0);
    const [a, b] = await Promise.all([category.boundingBox(), game.boundingBox()]);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(b!.x - a!.x - a!.width).toBeLessThanOrEqual(16);
    await category.getByRole("radio", { name: "수상", exact: true }).click();
    await game.getByRole("radio", { name: "전체 게임", exact: true }).focus();
    await page.keyboard.press("End");
    await expect(game.getByRole("radio", { name: valorant.name_ko, exact: true })).toBeChecked();
    const monthly = view.getByRole("region", { name: "월간 수상 엠블럼", exact: true });
    const annual = view.getByRole("region", { name: "연간 수상 엠블럼", exact: true });
    await expect(monthly.locator("[data-emblem-entry]")).toHaveAttribute("data-emblem-clan", valClan);
    await expect(annual.locator("[data-emblem-entry]")).toHaveAttribute("data-emblem-clan", valClan);
    for (const row of [monthly, annual]) {
      await expect(row.locator("[data-unearned-award]")).toHaveCount(4);
      await expect(row.locator("[data-unearned-award] img, [data-unearned-award] button")).toHaveCount(0);
      await expect(row.locator("[data-unearned-award]").first()).toBeEnabled();
    }
    const missingPrediction = annual.getByRole("button", { name: "연간 예측 적중 미획득", exact: true });
    await expect(missingPrediction).toHaveAttribute("style", /year%2Fprediction-gold\.png/);
    await expect(view.getByRole("status")).toHaveText("3개의 획득 기록");
    await expect(view.getByText("아직 획득한 엠블럼이 없습니다.", { exact: true })).toHaveCount(0);
    await missingPrediction.focus();
    await page.keyboard.press("Enter");
    const preview = page.getByRole("dialog", { name: "연간 예측 적중", exact: true });
    await expect(preview).toBeVisible();
    await expect(preview.getByText("미획득 · 미리보기", { exact: true })).toBeVisible();
    await expect(preview.getByText("연간 명예의 전당에서 승부예측 적중 횟수 상위 3위 안에 들면 획득합니다.", { exact: true })).toBeVisible();
    await expect(preview.locator("[data-emblem-artwork] img")).toHaveAttribute("src", /prediction-gold/);
    await expect(preview.locator("[data-emblem-feature-key]")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(missingPrediction).toBeFocused();
    await monthly.locator("[data-emblem-key]").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("radiogroup", { name: "엠블럼 게임", exact: true })).toHaveCount(0);
    await expect(dialog.locator("[data-emblem-entry]")).toHaveCount(1);
    await expect(dialog.locator("[data-emblem-key]")).toHaveAttribute("data-emblem-key", "month-2024-02-승률");
    await expect(dialog.getByRole("region", { name: "엠블럼 상세", exact: true }).getByText("발로란트", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await annual.locator("[data-emblem-key]").click();
    await expect(dialog.getByRole("heading", { name: "연간 승률 1위", exact: true })).toBeVisible();
    await expect(dialog.locator("[data-emblem-entry]")).toHaveCount(1);
    await expect(dialog.locator("[data-emblem-key]")).toHaveAttribute("data-emblem-key", "year-2024-승률");
    await page.keyboard.press("Escape");
    await game.getByRole("radio", { name: "오버워치", exact: true }).focus();
    await page.keyboard.press("Home");
    await expect(game.getByRole("radio", { name: "전체 게임", exact: true })).toBeChecked();
    await game.getByRole("radio", { name: "오버워치", exact: true }).click();
    await expect(annual.locator("[data-unearned-award]")).toHaveCount(5);
    await expect(annual.locator("[data-emblem-entry]")).toHaveCount(0);
    await expect(monthly.locator("[data-unearned-award]")).toHaveCount(4);
    await category.getByRole("radio", { name: "달성", exact: true }).click();
    const milestoneBounds = await view.getByRole("region", { name: "누적 달성 엠블럼", exact: true }).boundingBox();
    const frameBounds = await view.locator('[aria-busy]').last().boundingBox();
    expect(frameBounds!.y + frameBounds!.height - milestoneBounds!.y - milestoneBounds!.height).toBeLessThanOrEqual(36);
    await category.getByRole("radio", { name: "수상", exact: true }).click();
    for (const width of [1023, 390, 320]) {
      await page.setViewportSize({ width, height: 884 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(game.getByRole("radio", { name: valorant.name_ko, exact: true })).toBeVisible();
    }
    await missingPrediction.click();
    await expect(preview).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.keyboard.press("Escape");
    await view.screenshot({ path: info.outputPath("emblem-icon-filters-mobile.png") });
  } finally {
    if (valClan) await ok(f.service.from("clans").delete().eq("id", valClan));
    await f.cleanup();
  }
});

test("one personal case keeps cross-game clan records after leaving, with source details and history stars", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(3);
  const owner = f.users[1];
  const extraClans: string[] = [];
  const period = "2024-02";
  const key = `month-${period}-승률`;
  try {
    const valorant = await ok(f.service.from("games").select("id,name_ko").eq("slug", "valorant").single());
    for (const [gameId, name, status] of [[valorant.id, "QA 다른 게임", "active"], [f.gameId, "QA 이전 클랜", "left"]] as const) {
      const clan = await ok(f.service.from("clans").insert({ game_id: gameId, name, subscription_tier: "premium" }).select("id").single());
      extraClans.push(clan.id);
      await ok(f.service.from("clan_members").insert({ clan_id: clan.id, user_id: owner.id, role: "member", status }));
    }
    const [valClan, oldClan] = extraClans;
    for (const [index, clanId] of [f.clanId, valClan, oldClan].entries()) {
      await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: clanId, p_period_type: "month", p_period_key: period,
        p_awards: [{ user_id: owner.id, family: "victory", rank: index + 1 }] }));
      await ok(f.service.from("clan_personal_emblem_picks").upsert({ clan_id: clanId, user_id: owner.id, emblem_keys: [] }));
    }
    const matches = await ok(f.service.from("matches").insert(Array.from({ length: 10 }, () => ({
      clan_id: f.clanId, game_id: f.gameId, created_by: f.users[0].id, match_type: "intra" as const,
      status: "finished" as const, played_at: "2024-02-12T10:00:00Z", map_label: "네팔",
    }))).select("id"));
    await ok(f.service.from("match_players").insert(matches.flatMap(match => [
      { match_id: match.id, user_id: owner.id, team: 1 }, { match_id: match.id, user_id: f.users[0].id, team: 2 },
    ])));
    await ok(f.service.from("match_results").insert(matches.map(match => ({ match_id: match.id, winner_team: 1 }))));
    expect((await page.request.get("/api/personal-emblems")).status()).toBe(401);
    await loginIsolatedBalanceUser(page, owner);
    const read = async () => {
      const response = await page.request.get("/api/personal-emblems");
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      return (await response.json()).collection as PersonalEmblemCollection;
    };
    const original = await read();
    expect(original.sources).toHaveLength(3);
    expect(original.sources?.every(source => source.userId === owner.id)).toBe(true);
    const originalKeys = original.sources?.flatMap(source => source.emblems.filter(emblem => emblem.earned).map(emblem => source.clanId + ":" + emblem.key)).sort();
    const originalWin = original.sources?.find(source => source.clanId === f.clanId)?.emblems.find(emblem => emblem.key === "milestone-wins-1");
    expect(originalWin).toMatchObject({ earned: true, date: expect.stringMatching(/^2024-02-12/) });
    const otherContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const outsider = await otherContext.newPage();
      await loginIsolatedBalanceUser(outsider, f.users[2]);
      const otherRead = await outsider.request.get("/api/personal-emblems?player=" + owner.id);
      const ownOnly = (await otherRead.json()).collection as PersonalEmblemCollection;
      expect(ownOnly.userId).toBe(f.users[2].id);
      expect(ownOnly.sources?.every(source => source.userId === f.users[2].id && source.clanId === f.clanId)).toBe(true);
      expect((await outsider.request.get("/api/personal-emblems?clan=" + valClan)).status()).toBe(403);
    } finally { await otherContext.close(); }

    await page.goto("/profile");
    await page.getByRole("region", { name: "대표 엠블럼", exact: true }).getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true }).click();
    const caseView = page.locator("[data-personal-emblem-case]");
    await expect(caseView).toBeVisible();
    const game = caseView.getByRole("radiogroup", { name: "엠블럼 게임", exact: true });
    await expect(game.getByRole("radio")).toHaveCount(3);
    await caseView.getByRole("radio", { name: "수상", exact: true }).click();
    await caseView.locator('[data-emblem-key$="-승률"]').first().click();
    const details = page.getByRole("dialog");
    const facts = details.getByRole("region", { name: "엠블럼 상세", exact: true });
    const history = details.getByRole("group", { name: "같은 종류의 수상 이력", exact: true });
    await expect(history.locator(`[data-emblem-key="${key}"]`)).toHaveCount(3);
    await expect(details.getByText("순위", { exact: true })).toHaveCount(0);
    await expect(details.getByText(/^[금은동] · [123]위$/)).toHaveCount(0);
    await expect(details.getByText("별을 눌러 대표로 진열", { exact: true })).toHaveCount(0);
    await expect(facts.getByText("오버워치", { exact: true })).toBeVisible();
    const valEntry = history.locator(`[data-emblem-clan="${valClan}"]`);
    await valEntry.locator("[data-emblem-key]").click();
    await expect(facts.getByText(valorant.name_ko, { exact: true })).toBeVisible();
    await expect(facts.getByText("QA 다른 게임", { exact: true })).toBeVisible();
    await valEntry.locator("[data-emblem-feature-key]").hover();
    await valEntry.locator("[data-emblem-feature-key]").click();
    await expect(valEntry.locator("[data-emblem-feature-key]")).toHaveAttribute("aria-pressed", "true");
    expect((await ok(f.service.from("account_personal_emblem_picks").select("emblem_keys").eq("user_id", owner.id).single())).emblem_keys).toEqual([valClan + ":" + key]);
    expect((await ok(f.service.from("clan_personal_emblem_picks").select("emblem_keys").eq("clan_id", f.clanId).eq("user_id", owner.id).single())).emblem_keys).toEqual([]);
    await expect(details.getByRole("radiogroup", { name: "엠블럼 게임", exact: true })).toHaveCount(0);
    const grades = details.getByRole("radiogroup", { name: "수상 등급", exact: true });
    await grades.getByRole("radio", { name: "동", exact: true }).click();
    await expect(history.locator("[data-emblem-key]")).toHaveCount(1);
    await expect(facts.getByText("QA 이전 클랜", { exact: true })).toBeVisible();
    await grades.getByRole("radio", { name: "전체", exact: true }).click();
    await expect(history.locator(`[data-emblem-key="${key}"]`)).toHaveCount(3);
    await expect(page.getByText("대표 엠블럼을 저장했습니다.", { exact: true })).toHaveCount(0, { timeout: 8000 });
    await details.screenshot({ path: info.outputPath("personal-emblem-library-detail.png") });
    await page.keyboard.press("Escape");
    await game.getByRole("radio", { name: "발로란트", exact: true }).click();
    await expect(caseView.locator("[data-emblem-entry]")).toHaveCount(1);
    await game.getByRole("radio", { name: "전체 게임", exact: true }).click();

    const member = await f.memberClient(1);
    await ok(member.rpc("change_clan_membership", { p_clan_id: f.clanId, p_action: "leave" }));
    const afterLeave = await read();
    expect(afterLeave.sources?.flatMap(source => source.emblems.filter(emblem => emblem.earned).map(emblem => source.clanId + ":" + emblem.key)).sort()).toEqual(originalKeys);
    expect(afterLeave.sources?.find(source => source.clanId === f.clanId)?.emblems.find(emblem => emblem.key === "milestone-wins-1")).toMatchObject({ earned: true, date: originalWin?.date });
    expect(afterLeave.sources?.find(source => source.clanId === f.clanId)?.emblems.every(emblem => emblem.earned)).toBe(true);
    await page.goto(f.path.replace(/balance$/, "emblems") + "?player=" + owner.id);
    await expect(page).toHaveURL(new RegExp(`/profile/emblems\\?clan=${f.clanId}$`));
    await expect(caseView).toBeVisible();
    await caseView.getByRole("radio", { name: "달성", exact: true }).click();
    await caseView.locator('[data-emblem-key="milestone-wins-1"]').click();
    const winStar = details.locator(`[data-emblem-clan="${f.clanId}"] [data-emblem-feature-key="milestone-wins-1"]`);
    await winStar.locator("..").hover();
    await expect(winStar).toBeEnabled();
    await winStar.click();
    await expect(winStar).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(caseView.locator('[aria-busy="true"]')).toHaveCount(0);
    await caseView.screenshot({ path: info.outputPath("personal-emblem-library-mobile.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/profile");
    await page.getByRole("region", { name: "대표 엠블럼", exact: true }).getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true }).click();
    await expect(caseView).toBeVisible();
    await ok(f.service.from("clan_members").update({ status: "active" }).eq("clan_id", f.clanId).eq("user_id", owner.id));
    const rejoined = await read();
    expect(rejoined.accountFeaturedKeys).toEqual([valClan + ":" + key, f.clanId + ":milestone-wins-1"]);
    expect(rejoined.sources?.flatMap(source => source.emblems.filter(emblem => emblem.earned).map(emblem => source.clanId + ":" + emblem.key)).sort()).toEqual(originalKeys);
    expect((await page.request.get("/api/personal-emblems?clan=invalid")).status()).toBe(400);
  } finally {
    for (const clanId of extraClans) await f.service.from("clans").delete().eq("id", clanId);
    await f.cleanup();
  }
});
