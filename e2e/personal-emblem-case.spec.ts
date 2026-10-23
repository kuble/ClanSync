import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanPersonalEmblemCollection } from "../src/lib/clan/stats/load-clan-stats";

test("공통 엠블럼 케이스: 공개 권한·계열 성장·대표 저장·프로필/개인기록 공유", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
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
    expect(own?.emblems.find((emblem) => emblem.key === "milestone-streak-4")).toMatchObject({ earned: true, progress: 20, date: null });
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

    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    const trigger = page.getByRole("button", { name: f.users[0].nickname + " 엠블럼 케이스 열기", exact: true });
    await trigger.click();
    const collection = page.getByRole("dialog", { name: "엠블럼 케이스", exact: true });
    await expect(collection).toBeVisible();
    const filter = collection.getByRole("radiogroup", { name: "엠블럼 분류", exact: true });
    await filter.getByRole("radio", { name: "달성", exact: true }).click();
    await expect(collection.locator('[data-emblem-key="milestone-streak-4"]')).toHaveCount(1);
    await expect(collection.locator('[data-emblem-key="milestone-streak-1"]')).toHaveCount(0);
    await collection.locator('[data-emblem-key="milestone-wins-1"]').click();
    await expect(collection.getByRole("group", { name: "승리의 결정 단계별 엠블럼", exact: true }).getByRole("button")).toHaveCount(4);
    await collection.getByRole("button", { name: "대표 엠블럼 지정", exact: true }).click();
    await expect(collection.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeVisible();
    expect((await f.service.from("clan_personal_emblem_picks").select("emblem_keys").eq("clan_id", f.clanId).eq("user_id", f.users[0].id).single()).data?.emblem_keys)
      .toEqual(["milestone-wins-1"]);
    await collection.locator('[data-emblem-key="milestone-sessions-1"]').first().click();
    await expect(collection.getByText("미획득 · 미리보기", { exact: true })).toBeVisible();
    await expect(collection.getByRole("button", { name: "대표 엠블럼 지정", exact: true })).toHaveCount(0);
    await collection.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(trigger).toBeFocused();

    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const banner = page.getByRole("region", { name: "플레이어 배너", exact: true });
    await banner.getByRole("button", { name: f.users[0].nickname + " 엠블럼 케이스 열기", exact: true }).click();
    await expect(collection).toBeVisible();
    await collection.getByRole("radio", { name: "달성", exact: true }).click();
    await collection.locator('[data-emblem-key="milestone-wins-1"]').first().click();
    await expect(collection.getByRole("button", { name: "대표 엠블럼 해제", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1304, height: 1100 });
    await collection.screenshot({ path: info.outputPath("personal-emblem-case-desktop.png") });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(collection.getByRole("button", { name: "닫기", exact: true })).toBeVisible();
    }
    await collection.screenshot({ path: info.outputPath("personal-emblem-case-mobile.png") });
    await page.keyboard.press("Escape");
    await expect(collection).toBeHidden();
    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[1].id);
    await page.getByRole("region", { name: "플레이어 배너", exact: true }).getByRole("button", { name: f.users[1].nickname + " 엠블럼 케이스 열기", exact: true }).click();
    await expect(collection).toBeVisible();
    await collection.getByRole("radio", { name: "월간", exact: true }).click();
    await collection.locator("[data-emblem-key]").first().click();
    await expect(collection.getByRole("button", { name: /대표 엠블럼 (지정|해제)/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const memberTrigger = page.getByRole("region", { name: "플레이어 배너", exact: true }).getByRole("button", { name: f.users[0].nickname + " 엠블럼 케이스 열기", exact: true });
    await memberTrigger.click();
    await expect(collection.locator("[data-emblem-key]").first()).toBeVisible();
    await page.keyboard.press("Escape");
    expect((await f.service.from("clan_settings").update({ hof_config: { ...config, member_personal_sections: [] } }).eq("clan_id", f.clanId)).error).toBeNull();
    await memberTrigger.click();
    await expect(collection.getByRole("alert")).toContainText("이 멤버의 엠블럼을 볼 수 없습니다.");
    await expect(collection.locator("[data-emblem-key]")).toHaveCount(0);
    await expect(page.locator("[data-personal-emblem-launcher] [data-emblem-artwork]")).toHaveCount(0);
    await collection.getByRole("button", { name: "다시 불러오기", exact: true }).click();
    await expect(collection.getByRole("alert")).toContainText("이 멤버의 엠블럼을 볼 수 없습니다.");
    await expect(collection.locator("[data-emblem-key]")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goto("/games");
  } finally { await f.cleanup(); }
});
