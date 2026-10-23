import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanPersonalEmblemCollection } from "../src/lib/clan/stats/load-clan-stats";

test("공통 엠블럼 케이스: 공개 권한·계열 성장·대표 저장·프로필/개인기록 공유", async ({ page }, info) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  const f = await createIsolatedBalanceFixture(3);
  let foreignClanId: string | undefined;
  const config = { personal_record_min_role: "member", member_personal_sections: ["emblems", "records"], streak_visible_top: 10 };
  try {
    expect((await f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId)).error).toBeNull();
    const { data: matches, error } = await f.service.from("matches").insert(Array.from({ length: 20 }, (_, index) => ({
      clan_id: f.clanId, game_id: f.gameId, match_type: "intra" as const, status: "finished" as const,
      played_at: index < 10 ? "2025-07-01T10:00:00Z" : "2025-08-02T10:00:00Z", map_label: "네팔", created_by: f.users[0].id,
    }))).select("id");
    expect(error).toBeNull();
    expect((await f.service.from("match_players").insert(matches!.flatMap((match) => [
      { match_id: match.id, user_id: f.users[0].id, team: 1 }, { match_id: match.id, user_id: f.users[1].id, team: 2 },
    ]))).error).toBeNull();
    expect((await f.service.from("match_results").insert(matches!.map((match) => ({ match_id: match.id, winner_team: 1 })))).error).toBeNull();
    const [leader, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
    const own = await loadClanPersonalEmblemCollection(leader, f.users[0].id, f.clanId);
    expect(own?.canFeature).toBe(true);
    expect(own?.emblems.filter((emblem) => emblem.kind === "milestone")).toHaveLength(20);
    expect(own?.emblems.find((emblem) => emblem.key === "milestone-streak-4")).toMatchObject({ earned: true, progress: 20, date: expect.stringMatching(/^2025-07-01T10:00:00/) });
    expect(own?.emblems.find((emblem) => emblem.key === "milestone-sessions-1")).toMatchObject({ earned: false, progress: 0 });
    expect(own?.emblems.some((emblem) => emblem.kind === "award" && emblem.period === "year" && emblem.date === "2025")).toBe(true);
    expect(own?.emblems.some((emblem) => emblem.kind === "award" && emblem.period === "month" && emblem.date === "2025-07")).toBe(true);
    expect((await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId, f.users[0].id))?.canFeature).toBe(false);
    expect((await f.service.from("clan_settings").update({ hof_config: { ...config, member_personal_sections: ["emblems"] } }).eq("clan_id", f.clanId)).error).toBeNull();
    const emblemsOnly = await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId, f.users[0].id);
    expect(emblemsOnly?.emblems.some((emblem) => emblem.kind === "award")).toBe(true);
    expect(emblemsOnly?.emblems.filter((emblem) => emblem.kind === "milestone")).toEqual([]);
    expect((await f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId)).error).toBeNull();
    const recordsVisible = await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId, f.users[0].id);
    expect(recordsVisible?.emblems.filter((emblem) => emblem.kind === "milestone")).toHaveLength(16);
    expect(recordsVisible?.emblems.some((emblem) => emblem.kind === "milestone" && emblem.family === "prediction")).toBe(false);
    expect((await f.service.from("clan_settings").update({ hof_config: { ...config, member_personal_sections: ["records"] } }).eq("clan_id", f.clanId)).error).toBeNull();
    expect(await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId)).toBeNull();
    expect(await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId, f.users[0].id)).toBeNull();
    expect((await f.service.from("clan_settings").update({ hof_config: { ...config, personal_record_min_role: "leader" } }).eq("clan_id", f.clanId)).error).toBeNull();
    expect(await loadClanPersonalEmblemCollection(member, f.users[1].id, f.clanId)).toBeNull();
    expect((await f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId)).error).toBeNull();
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    expect(await loadClanPersonalEmblemCollection(outsider, f.users[2].id, f.clanId)).toBeNull();
    expect(await loadClanPersonalEmblemCollection(leader, f.users[0].id, f.clanId, f.users[2].id)).toBeNull();
    expect((await f.service.from("clan_personal_emblem_picks").upsert({ clan_id: f.clanId, user_id: f.users[0].id, emblem_keys: [] })).error).toBeNull();

    const apiPath = `/api/clans/${f.clanId}/personal-emblems`;
    expect((await page.request.get(apiPath)).status()).toBe(401);
    await loginIsolatedBalanceUser(page, f.users[0]);
    expect((await page.request.get(apiPath + "?player=not-a-uuid")).status()).toBe(400);
    expect((await page.request.get(apiPath + "?player=" + f.users[2].id)).status()).toBe(403);
    await page.goto("/profile");
    const casePath = f.path.replace(/balance$/, "emblems");
    const ownCaseUrl = casePath + "?player=" + f.users[0].id;
    const trigger = page.getByRole("region", { name: "플레이어 소개", exact: true }).getByRole("link", { name: "플레이어 엠블럼 케이스 열기", exact: true });
    await expect(trigger).toHaveAttribute("href", ownCaseUrl);
    await trigger.click();
    await expect(page).toHaveURL(new RegExp(`/emblems\\?player=${f.users[0].id}$`));
    await expect(page.getByRole("heading", { name: "개인 엠블럼 케이스", level: 2, exact: true })).toBeVisible();
    const collection = page.getByRole("region", { name: "개인 엠블럼", exact: true });
    await expect(collection).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const filter = collection.getByRole("radiogroup", { name: "엠블럼 분류", exact: true });
    await filter.getByRole("radio", { name: "달성", exact: true }).click();
    await expect(collection.locator('[data-emblem-key="milestone-streak-4"]')).toHaveCount(1);
    await expect(collection.locator('[data-emblem-key="milestone-streak-1"]')).toHaveCount(0);
    await page.setViewportSize({ width: 1304, height: 1100 });
    await expect(collection.locator('[aria-busy="true"]')).toHaveCount(0);
    await collection.screenshot({ animations: "disabled", path: info.outputPath("personal-emblem-case-desktop.png") });
    const winsPin = collection.locator('[data-emblem-key="milestone-wins-1"]');
    await winsPin.click();
    const details = page.getByRole("dialog");
    await expect(page.getByRole("dialog", { name: "10승 달성", exact: true })).toBeVisible();
    const stages = details.getByRole("group", { name: "단계별 엠블럼", exact: true });
    await expect(stages.getByRole("button")).toHaveCount(4);
    await expect(details.getByText("승리의 결정", { exact: true })).toHaveCount(0);
    await expect(details.getByText("2025-07-01", { exact: true })).toBeVisible();
    await details.getByRole("button", { name: "대표 엠블럼 지정", exact: true }).click();
    await expect(details.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeVisible();
    expect((await f.service.from("clan_personal_emblem_picks").select("emblem_keys").eq("clan_id", f.clanId).eq("user_id", f.users[0].id).single()).data?.emblem_keys)
      .toEqual(["milestone-wins-1"]);
    await stages.locator('[data-emblem-key="milestone-wins-2"]').click();
    await expect(page.getByRole("dialog", { name: "50승 달성", exact: true })).toBeVisible();
    await expect(details.getByText("미획득 · 미리보기", { exact: true })).toBeVisible();
    await expect(details.getByRole("button", { name: /대표 엠블럼 (지정|해제)/ })).toHaveCount(0);
    await stages.locator('[data-emblem-key="milestone-wins-1"]').click();
    await expect(page.getByRole("dialog", { name: "10승 달성", exact: true })).toBeVisible();
    await details.screenshot({ path: info.outputPath("personal-emblem-detail-desktop.png") });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await details.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await expect(details.getByRole("button", { name: "닫기", exact: true })).toBeVisible();
      await details.screenshot({ path: info.outputPath(`personal-emblem-detail-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(details).toHaveCount(0);
      await expect(winsPin).toBeFocused();
      await collection.screenshot({ path: info.outputPath(`personal-emblem-case-${width}.png`) });
      await winsPin.click();
      await expect(page.getByRole("dialog", { name: "10승 달성", exact: true })).toBeVisible();
    }
    await details.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(winsPin).toBeFocused();
    await collection.locator('[data-emblem-key="milestone-sessions-1"]').click();
    await expect(page.getByRole("dialog", { name: "10회 참여 달성", exact: true })).toBeVisible();
    await expect(details.getByText("미획득 · 미리보기", { exact: true })).toBeVisible();
    await expect(details.getByRole("button", { name: /대표 엠블럼 (지정|해제)/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    await expect(banner.locator("[data-emblem-artwork]")).toHaveCount(1);
    await banner.getByRole("link", { name: f.users[0].nickname + " 엠블럼 케이스 열기", exact: true }).click();
    await expect(collection).toBeVisible();
    await collection.getByRole("radio", { name: "달성", exact: true }).click();
    await winsPin.click();
    await expect(details.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(winsPin).toBeFocused();
    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[1].id);
    await page.getByRole("region", { name: "플레이어 배너", exact: true }).getByRole("link", { name: f.users[1].nickname + " 엠블럼 케이스 열기", exact: true }).click();
    await expect(collection).toBeVisible();
    await collection.getByRole("radio", { name: "수상", exact: true }).click();
    await collection.locator("[data-emblem-key]").first().click();
    await expect(details).toBeVisible();
    await expect(details.getByRole("button", { name: /대표 엠블럼 (지정|해제)/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const memberTrigger = page.getByRole("region", { name: "플레이어 배너", exact: true }).getByRole("link", { name: f.users[0].nickname + " 엠블럼 케이스 열기", exact: true });
    await memberTrigger.click();
    await expect(collection.locator("[data-emblem-key]").first()).toBeVisible();
    expect((await f.service.from("clan_settings").update({ hof_config: { ...config, member_personal_sections: [] } }).eq("clan_id", f.clanId)).error).toBeNull();
    await collection.locator("[data-emblem-key]").first().click();
    await expect(collection.getByRole("alert")).toContainText("이 멤버의 엠블럼을 볼 수 없습니다.");
    await expect(collection.locator("[data-emblem-key]")).toHaveCount(0);
    await expect(page.getByRole("dialog").locator("[data-emblem-artwork]")).toHaveCount(0);
    await collection.getByRole("button", { name: "다시 불러오기", exact: true }).click();
    await expect(collection.getByRole("alert")).toContainText("이 멤버의 엠블럼을 볼 수 없습니다.");
    await expect(collection.locator("[data-emblem-key]")).toHaveCount(0);
    await expect(page.getByRole("dialog").locator("[data-emblem-artwork]")).toHaveCount(0);
    expect((await f.service.from("clan_settings").update({ hof_config: config }).eq("clan_id", f.clanId)).error).toBeNull();
    await page.goto(ownCaseUrl);
    await expect(collection.locator("[data-emblem-key]").first()).toBeVisible();
    const foreignClan = await f.service.from("clans").insert({
      game_id: f.gameId, name: `엠블럼접근거부-${f.clanId.slice(0, 6)}`, subscription_tier: "premium",
    }).select("id").single();
    expect(foreignClan.error).toBeNull();
    foreignClanId = foreignClan.data!.id;
    for (const deniedUrl of [casePath + "?player=not-a-uuid", casePath + "?player=" + f.users[2].id]) {
      const response = await page.goto(deniedUrl);
      // A streamed App Router response can already have sent HTTP 200 before forbidden().
      expect([200, 403]).toContain(response?.status());
      await expect(page.getByRole("heading", { name: "접근 권한이 없습니다", exact: true })).toBeVisible();
      await expect(page.locator("[data-emblem-key]")).toHaveCount(0);
      await expect(page.locator("[data-personal-emblem-case] [data-emblem-artwork]")).toHaveCount(0);
    }
    const foreignResponse = await page.goto(`/games/overwatch/clan/${foreignClanId}/emblems?player=${f.users[0].id}`);
    const finalPath = new URL(page.url()).pathname.replace(/\/$/, "");
    if (finalPath !== "/games/overwatch/clan" && finalPath !== `/games/overwatch/clan/${f.clanId}`) {
      expect([200, 403]).toContain(foreignResponse?.status());
      await expect(page.getByRole("heading", { name: "접근 권한이 없습니다", exact: true })).toBeVisible();
    }
    expect((await page.request.get(`/api/clans/${foreignClanId}/personal-emblems`)).status()).toBe(403);
    await expect(page.locator("[data-emblem-key]")).toHaveCount(0);
    await expect(page.locator("[data-personal-emblem-case] [data-emblem-artwork]")).toHaveCount(0);
    await page.goto("/games");
  } finally {
    try { if (foreignClanId) expect((await f.service.from("clans").delete().eq("id", foreignClanId)).error).toBeNull(); }
    finally { await f.cleanup(); }
  }
});
