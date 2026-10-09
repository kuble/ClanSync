import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanStatsArchive } from "../src/lib/clan/stats/load-clan-stats";
import { archiveSessionSummary, sessionDurationLabel } from "../src/lib/clan/stats/archive-session-summary";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("stats: session summary, visual eligibility and settings tabs preserve saved fields", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    const prior = randomUUID(), flash = randomUUID(), series = randomUUID();
    await ok(f.service.from("balance_session_series").insert([
      { id: prior, opened_at: "2025-08-01T10:00:00Z" },
      { id: flash, opened_at: "2025-07-01T10:00:00Z" },
      { id: series, opened_at: "2025-09-30T14:30:00Z" },
    ].map((row) => ({ ...row, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, closed_at: "2025-10-01T00:00:00Z" }))));
    await ok(f.service.from("balance_rooms").update({ kind: "regular", status: "closed" }).in("id", [prior, series]));
    await ok(f.service.from("balance_rooms").update({ kind: "flash", status: "closed" }).eq("id", flash));
    for (let i = 0; i < 2; i++) {
      const id = randomUUID();
      await ok(f.service.from("balance_sessions").insert({ id, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, series_id: series, round_number: i + 1,
        opened_at: "2025-09-30T14:30:00Z", phase: "map_ban", prediction_pool_enabled: false,
        map_ban_enabled: true, map_candidates: ["네팔", "부산", "오아시스"], map_ban_deadline_at: new Date(Date.now() + 60_000).toISOString(),
        roster: { team1: { tank: f.users[0].id, dmg: [null, null], sup: [null, null] }, team2: { tank: f.users[1].id, dmg: [null, null], sup: [null, null] } },
      }));
      await ok(f.service.from("balance_sessions").update({ phase: "match_live", map_ban_deadline_at: null, match_outcome: "team1", resolved_map_label: i ? "부산" : "네팔", closed_at: i ? "2025-09-30T17:00:00Z" : "2025-09-30T15:00:00Z", predictions_settled_at: i ? "2025-09-30T17:00:00Z" : "2025-09-30T15:00:00Z" }).eq("id", id));
    }
    await ok(f.service.from("clan_settings").upsert({ clan_id: f.clanId, hof_config: { wins_visible_top: 3, streak_visible_top: 5 } }));
    const leader = await f.memberClient(0);
    const detail = await loadClanStatsArchive(leader, f.clanId, "2025-09-30");
    expect(detail?.kind).toBe("archive");
    const records = detail!.kind === "archive" ? detail!.archive.sampleByDate["2025-09-30"] : [];
    expect(records).toHaveLength(2);
    expect(records.every((row) => row.sessionNumber === 2)).toBe(true);
    expect(archiveSessionSummary(records, records[1])).toEqual({ number: 2, participants: 2, activeMinutes: 150 });
    expect(sessionDurationLabel(150)).toBe("2시간 30분");
    const unavailable = await loadClanStatsArchive(await f.memberClient(1), f.clanId, "2025-09-30");
    expect(unavailable).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "stats"));
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    const summary = page.getByLabel("내전 요약", { exact: true });
    await expect(summary).toContainText("2회");
    await expect(summary).toContainText("2명");
    await expect(summary).toContainText("2시간 30분");
    await expect(page.getByRole("button", { name: "경기 기록 도움말", exact: true })).toHaveCount(0);
    await expect(page.getByText(/^무승부는 승률에서 제외하며/)).toHaveCount(0);
    await page.getByLabel("기록 맵", { exact: true }).selectOption("네팔");
    await expect(page.getByLabel("경기 기록 이동")).toContainText("1 / 1");
    await expect(summary).toContainText("2시간 30분");
    const outer = await page.getByRole("region", { name: "경기 상세", exact: true }).boundingBox();
    const table = await page.getByRole("complementary", { name: "선택한 날짜 내전 기록", exact: true }).boundingBox();
    expect(Math.abs(outer!.height - table!.height)).toBeLessThan(2);
    await page.getByRole("tab", { name: "명예의 전당", exact: true }).click();
    await page.getByRole("button", { name: "설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "통계 공개 설정", exact: true });
    await settings.getByRole("checkbox", { name: /멤버의 본인 개인 기록 열람 허용/ }).check();
    await settings.getByRole("tab", { name: "순위 공개", exact: true }).click();
    await settings.getByLabel("승률 순위 공개(구성원)", { exact: true }).selectOption("5");
    await settings.getByRole("tab", { name: "등재 기준", exact: true }).click();
    await settings.getByLabel("기준 전환점", { exact: true }).fill("10");
    await settings.getByLabel("전체 경기의", { exact: true }).fill("50");
    await settings.getByLabel("출전 횟수", { exact: true }).fill("7");
    await settings.getByRole("button", { name: "10경기", exact: true }).click();
    const preview = settings.getByLabel("승률 등재 미리보기", { exact: true });
    await expect(preview.getByRole("status").first()).toContainText("5경기");
    await settings.getByRole("button", { name: "11경기", exact: true }).click();
    await expect(preview.getByRole("status").first()).toContainText("7경기");
    await settings.getByLabel("멤버 출전", { exact: true }).press("End");
    await expect(settings.getByRole("status", { name: "출전 기준 확인", exact: true })).toContainText("등재 가능");
    await settings.getByRole("tab", { name: "열람·공개", exact: true }).click();
    await settings.getByRole("button", { name: "저장", exact: true }).click();
    await expect(settings).toBeHidden();
    const saved = await ok(f.service.from("clan_settings").select("hof_config").eq("clan_id", f.clanId).single());
    expect(saved.hof_config).toMatchObject({ member_personal_records: true, win_rate_visible_top: 5, wins_visible_top: 3, streak_visible_top: 5, eligibility_game_threshold: 10, eligibility_below_pct: 50, eligibility_above_min_games: 7 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "설정", exact: true }).click();
    await page.getByRole("dialog", { name: "통계 공개 설정", exact: true }).getByRole("tab", { name: "등재 기준", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await f.cleanup(); }
});
