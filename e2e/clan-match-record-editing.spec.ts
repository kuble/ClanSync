import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanStatsArchive, loadClanStatsPeriod, loadClanStatsPage } from "../src/lib/clan/stats/load-clan-stats";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Json } from "../src/lib/supabase/database.types";

test.use({ actionTimeout: 20_000 });

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("match record corrections: atomic summaries, permissions, conflicts, original round preservation and CRUD UI", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(1);
    const series = randomUUID(), round = randomUUID();
    await ok(f.service.from("balance_session_series").insert({ id: series, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: "2025-07-01T10:00:00Z", closed_at: "2025-07-01T12:00:00Z" }));
    await ok(f.service.from("balance_rooms").update({ kind: "regular", status: "closed" }).eq("id", series));
    await ok(f.service.from("balance_sessions").insert({ id: round, series_id: series, round_number: 1, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id,
      opened_at: "2025-07-01T10:00:00Z", phase: "map_ban", match_outcome: "pending", prediction_pool_enabled: false,
      hero_ban_enabled: true, map_ban_enabled: true, map_ban_deadline_at: new Date(Date.now() + 60_000).toISOString(), map_candidates: ["부산", "네팔", "오아시스"],
      roster: { team1: { tank: f.users[0].id, dmg: [null, null], sup: [null, null] }, team2: { tank: null, dmg: [null, null], sup: [f.users[1].id, null] } },
      ma_snapshot: { [f.users[0].id]: { m: 1.2, a: 2.3 }, [f.users[1].id]: { m: -0.5, a: null } },
    }));
    await ok(f.service.from("balance_session_map_votes").insert({ session_id: round, user_id: f.users[0].id, choice_idx: 1 }));
    await ok(f.service.from("balance_session_predictions").insert({ session_id: round, user_id: f.users[2].id, pick_team: 1 }));
    await ok(f.service.from("balance_sessions").update({ phase: "match_live", map_ban_deadline_at: null, match_outcome: "team1", resolved_map_label: "부산", closed_at: "2025-07-01T11:30:00Z", predictions_settled_at: "2025-07-01T11:20:00Z", banned_heroes: ["ana"] }).eq("id", round));
    const original = await ok(f.service.from("balance_sessions").select("match_outcome,roster,ma_snapshot,predictions_settled_at").eq("id", round).single());
    const record = { playedAt: "2025-08-02T10:00:00Z", occurredAt: "2025-08-02T11:20:00Z", mapLabel: "오아시스", outcome: "team2",
      players: [{ userId: f.users[0].id, team: 1, role: "tank" }, { userId: f.users[1].id, team: 2, role: "sup" }] };
    async function archive(day: string) {
      const detail = await loadClanStatsArchive(leader, f.clanId, day);
      expect(detail?.kind).toBe("archive");
      return detail!.kind === "archive" ? detail!.archive.sampleByDate[day] ?? [] : [];
    }
    const first = (await archive("2025-07-01"))[0];
    const edit = (actor: string, operation: string, revision: string | null, body: unknown, id: string | null = round) => f.service.rpc("edit_clan_match_record", {
      // Supabase-generated RPC args omit nullable scalar types; SQL accepts null.
      p_clan_id: f.clanId, p_actor_id: actor, p_id: id!, p_operation: operation, p_revision: revision!, p_record: body as Json,
    });
    const env = loadTestEnv(), anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    for (const client of [leader, member, anon]) expect((await client.rpc("edit_clan_match_record", { p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: round, p_operation: "delete", p_revision: first.revision!, p_record: null })).error).not.toBeNull();
    expect((await edit(f.users[1].id, "update", first.revision!, record)).error?.code).toBe("42501");
    // A configured read-only member still cannot correct records.
    const settings = await ok(f.service.from("clan_settings").select("permissions").eq("clan_id", f.clanId).single());
    await ok(f.service.from("clan_settings").update({ permissions: { ...settings.permissions as Record<string, Json>, view_match_records: ["leader", "officer", "member"] } }).eq("clan_id", f.clanId));
    expect((await edit(f.users[1].id, "update", first.revision!, record)).error?.code).toBe("42501");
    await ok(f.service.from("clan_settings").update({ permissions: settings.permissions }).eq("clan_id", f.clanId));
    const conflict = await edit(f.users[0].id, "update", "stale", record);
    expect(conflict.error?.code, JSON.stringify(conflict)).toBe("PT409");
    expect((await edit(f.users[0].id, "update", first.revision!, { ...record, players: [record.players[0], { ...record.players[0], team: 2 }] })).error).not.toBeNull();
    // A source id from another clan never becomes editable through this clan.
    const foreignClan = await ok(f.service.from("clans").insert({ game_id: f.gameId, name: `foreign-${randomUUID().slice(0, 8)}` }).select("id").single());
    try {
      const foreign = await ok(f.service.from("matches").insert({ clan_id: foreignClan.id, game_id: f.gameId, status: "finished" }).select("id").single());
      expect((await edit(f.users[0].id, "update", first.revision!, record, foreign.id)).error?.code).toBe("P0002");
      expect((await f.service.rpc("edit_clan_match_record", { p_clan_id: foreignClan.id, p_actor_id: f.users[0].id, p_id: foreign.id, p_operation: "delete", p_revision: first.revision!, p_record: null })).error?.code).toBe("42501");
    } finally { await ok(f.service.from("clans").delete().eq("id", foreignClan.id)); }
    await ok(edit(f.users[0].id, "update", first.revision!, record));
    expect(await archive("2025-07-01")).toEqual([]);
    let corrected = (await archive("2025-08-02"))[0];
    expect(corrected).toMatchObject({ id: round, outcome: "team2", mapLabel: "오아시스" });
    const originalPlayer = first.players.find((p) => p.userId === f.users[0].id)!;
    // Entering match_live may recalculate A; preserve the actual saved snapshot.
    expect(corrected.players.find((p) => p.userId === f.users[0].id)).toMatchObject({ role: originalPlayer.role, m: originalPlayer.m, a: originalPlayer.a });
    expect(await ok(f.service.from("balance_sessions").select("match_outcome,roster,ma_snapshot,predictions_settled_at").eq("id", round).single())).toEqual(original);
    const moved = await loadClanStatsPeriod(leader, f.clanId, "2025-08");
    expect(moved?.kind === "period" && moved.intra).toMatchObject({ completed: 1, bans: [{ id: "ana", value: 1 }], mapVotes: [{ name: "네팔", value: 1 }] });
    const reference = await loadClanStatsPage(leader, f.users[0].id, f.clanId);
    expect(reference?.intraPeriods["2025-08"].completed).toBe(1);
    expect(reference?.archive.sampleByDate["2025-08-02"][0].mapLabel).toBe("오아시스");
    // A later source update must not resurrect the wrong map or overwritten result.
    await ok(f.service.from("balance_sessions").update({ resolved_map_label: "네팔" }).eq("id", round));
    corrected = (await archive("2025-08-02"))[0];
    expect(corrected.mapLabel).toBe("오아시스");
    await ok(edit(f.users[0].id, "delete", corrected.revision!, null));
    expect(await archive("2025-08-02")).toEqual([]);
    const creationId = randomUUID();
    await ok(edit(f.users[0].id, "create", null, record, creationId));
    expect((await edit(f.users[0].id, "create", null, record, creationId)).error?.code).toBe("PT409");
    const manual = (await archive("2025-08-02"))[0];
    await ok(edit(f.users[0].id, "delete", manual.revision!, null, manual.id));
    expect((await loadClanStatsPeriod(leader, f.clanId, "all"))?.kind).toBe("period");
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path.replace(/balance$/, "stats"));
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    const detail = page.getByRole("region", { name: "경기 상세", exact: true });
    const daily = page.getByRole("complementary", { name: "선택한 날짜 내전 기록" });
    await expect(detail.getByRole("button", { name: "기록 추가", exact: true })).toBeEnabled();
    const detailNode = await detail.elementHandle(), dailyNode = await daily.elementHandle();
    await detail.getByRole("button", { name: "기록 추가", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "경기 기록 추가", exact: true });
    await dialog.getByLabel("내전 날짜", { exact: true }).fill("2025-08-02");
    await dialog.getByLabel("경기 시간 (한국 시간)", { exact: true }).fill("2025-08-02T20:30");
    await dialog.getByLabel("경기 맵", { exact: true }).fill("부산");
    await dialog.getByLabel("1팀 1번 출전자", { exact: true }).selectOption(f.users[0].id);
    await dialog.getByLabel("2팀 1번 출전자", { exact: true }).selectOption(f.users[1].id);
    const memberWidth = (await dialog.getByLabel("1팀 1번 출전자", { exact: true }).boundingBox())!.width;
    const roleWidth = (await dialog.getByLabel("1팀 1번 역할", { exact: true }).boundingBox())!.width;
    expect(memberWidth).toBeGreaterThan(roleWidth);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(detail).toContainText("부산");
    await expect(daily.getByRole("cell", { name: "1/0/0", exact: true })).toBeVisible();
    expect(await detailNode!.evaluate((node) => node.isConnected)).toBe(true);
    expect(await dailyNode!.evaluate((node) => node.isConnected)).toBe(true);
    await detail.getByRole("button", { name: "기록 수정", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "경기 기록 수정", exact: true });
    await dialog.getByLabel("경기 맵", { exact: true }).fill("오아시스");
    await dialog.getByRole("combobox", { name: "경기 결과", exact: true }).selectOption("draw");
    await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(detail).toContainText("오아시스");
    await expect(daily.getByRole("cell", { name: "0/1/0", exact: true })).toHaveCount(2);
    await detail.getByRole("button", { name: "기록 제거", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "경기 기록 제거", exact: true });
    await dialog.getByRole("button", { name: "기록 제거", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(detail).toContainText("이 날짜에는 기록된 경기가 없습니다.");
    await expect(daily).toContainText("집계할 내전 결과가 없습니다.");
    expect((await detail.boundingBox())!.height).toBe((await daily.boundingBox())!.height);
    expect(await detailNode!.evaluate((node) => node.isConnected)).toBe(true);
    const all = await loadClanStatsPeriod(leader, f.clanId, "all");
    expect(all?.kind === "period" && all.intra.completed).toBe(0);
    expect((await loadClanStatsPage(leader, f.users[0].id, f.clanId))?.summary.intraCount).toBe(0);
    // Default read-only members cannot expose the editor roster or record tab.
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(f.path.replace(/balance$/, "stats"));
    await expect(page.getByRole("tab", { name: "내전 통계", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "경기 기록", exact: true })).toHaveCount(0);
  } finally { await f.cleanup(); }
});
