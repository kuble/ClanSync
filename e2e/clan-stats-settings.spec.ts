import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadClanStatsDetail, loadClanStatsPage, loadClanStatsPeriod } from "../src/lib/clan/stats/load-clan-stats";
import { resolveClanPermission } from "../src/lib/clan/clan-access-snapshot";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Json } from "../src/lib/supabase/database.types";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("stats settings: tab scopes, granular record grants and private payloads", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const f = await createIsolatedBalanceFixture(3);
  const memberContext = await browser.newContext();
  const officerContext = await browser.newContext();
  try {
    const leader = await f.memberClient(0), member = await f.memberClient(1), officer = await f.memberClient(2);
    const current = await ok(f.service.from("clan_settings").select("hof_config,permissions,expose_hof").eq("clan_id", f.clanId).single());
    const save = (actor: string, scope: string, patch: Json) => f.service.rpc("save_clan_stats_settings", {
      p_actor_id: actor, p_clan_id: f.clanId, p_scope: scope, p_patch: patch,
    });
    const env = loadTestEnv(), anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    for (const client of [anon, leader, member]) {
      expect((await client.rpc("save_clan_stats_settings", { p_actor_id: f.users[0].id, p_clan_id: f.clanId, p_scope: "personal", p_patch: { member_personal_records: true } })).error).not.toBeNull();
    }
    expect((await save(f.users[1].id, "records", { view_match_records: ["leader", "member"] })).error?.code).toBe("42501");
    expect((await save(f.users[0].id, "personal", { view_match_records: ["member"] })).error).not.toBeNull();
    expect((await save(f.users[0].id, "records", { view_match_records: ["leader", "outsider"] })).error).not.toBeNull();
    for (const value of ["outsider", null, ["member"]]) {
      expect((await save(f.users[0].id, "personal", { personal_record_min_role: value })).error).not.toBeNull();
    }
    await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    await ok(f.service.from("clan_settings").update({ permissions: { ...current.permissions as Record<string, Json>, set_hof_rules: ["leader", "officer"] } }).eq("clan_id", f.clanId));
    expect((await save(f.users[2].id, "records", { view_match_records: ["leader", "member"] })).error?.code).toBe("42501");
    expect((await save(f.users[2].id, "hof", { expose_hof: true })).error?.code).toBe("42501");
    await ok(save(f.users[2].id, "personal", { member_personal_records: true, member_personal_sections: ["evaluation"] }));
    await ok(save(f.users[0].id, "hof", { win_rate_visible_top: 3, expose_hof: true }));
    // Independent scopes merge under a lock; neither response may erase the other tab.
    await Promise.all([
      ok(save(f.users[0].id, "personal", { member_personal_audience: "own" })),
      ok(save(f.users[0].id, "hof", { prediction_visible_top: 5 })),
    ]);
    let stored = await ok(f.service.from("clan_settings").select("hof_config,expose_hof").eq("clan_id", f.clanId).single());
    expect(stored).toMatchObject({ expose_hof: true, hof_config: { member_personal_records: true, member_personal_sections: ["evaluation"], win_rate_visible_top: 3, prediction_visible_top: 5, member_personal_audience: "own" } });
    const series = randomUUID(), matchId = randomUUID();
    await ok(f.service.from("balance_session_series").insert({ id: series, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: "2025-08-02T10:00:00Z", closed_at: "2025-08-02T12:00:00Z" }));
    await ok(f.service.from("balance_rooms").update({ kind: "regular", status: "closed" }).eq("id", series));
    await ok(f.service.from("balance_sessions").insert({ id: matchId, series_id: series, round_number: 1, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id,
      opened_at: "2025-08-02T10:00:00Z", phase: "map_ban", match_outcome: "pending", prediction_pool_enabled: false, hero_ban_enabled: true, map_ban_enabled: true,
      map_ban_deadline_at: new Date(Date.now() + 60_000).toISOString(), map_candidates: ["부산", "네팔", "오아시스"],
      roster: { team1: { tank: f.users[0].id, dmg: [null, null], sup: [null, null] }, team2: { tank: null, dmg: [null, null], sup: [f.users[1].id, null] } },
      ma_snapshot: { [f.users[0].id]: { m: 1.25, a: 2.75 }, [f.users[1].id]: { m: -0.5, a: 3.5 } },
    }));
    await ok(f.service.from("balance_sessions").update({ phase: "match_live", map_ban_deadline_at: null, match_outcome: "team1", resolved_map_label: "부산", closed_at: "2025-08-02T11:30:00Z", predictions_settled_at: "2025-08-02T11:20:00Z", banned_heroes: ["ana"] }).eq("id", matchId));
    let detail = await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[1].id);
    expect(detail?.kind === "personal" && detail.person).toMatchObject({
      matches: [], predictions: [], predictionPoints: [], emblems: [], lastPlayedAt: null,
      scores: [{ evaluation: -0.5, analysis: null }], visibleSections: ["evaluation"],
    });
    expect(await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[0].id)).toBeNull();
    const full = await loadClanStatsPage(member, f.users[1].id, f.clanId);
    expect(full?.personal.people[0]).toEqual(detail?.kind === "personal" ? detail.person : null);
    await ok(save(f.users[0].id, "personal", { member_personal_audience: "clan", member_personal_sections: ["records", "prediction_points"] }));
    detail = await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[0].id);
    expect(detail?.kind === "personal" && detail.person).toMatchObject({ scores: [], predictionPoints: [], visibleSections: ["records"] });
    expect(detail?.kind === "personal" && detail.person.matches[0]).toMatchObject({ evaluation: null, analysis: null, peers: [], map: "부산" });
    await ok(save(f.users[0].id, "personal", { member_personal_audience: "own", member_personal_sections: ["evaluation"] }));
    // Compatibility grants survive until an individual operation gets an explicit value.
    expect(resolveClanPermission("member", "create_match_records", { correct_match_records: ["member"] })).toBe(true);
    expect(resolveClanPermission("member", "edit_match_records", { correct_match_records: ["member"], edit_match_records: [] })).toBe(false);
    await loginIsolatedBalanceUser(page, f.users[0]);
    const path = f.path.replace(/balance$/, "stats");
    await page.goto(path);
    const hofFilters = page.getByRole("region", { name: "명예의 전당 필터", exact: true });
    await expect(hofFilters.getByRole("button", { name: "명예의 전당 설정", exact: true })).toHaveText("");
    await expect(hofFilters.getByText("부문", { exact: true })).toHaveCount(0);
    await expect(hofFilters.getByText("기간", { exact: true })).toHaveCount(0);
    await hofFilters.getByRole("button", { name: "명예의 전당 설정", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "명예의 전당 설정", exact: true });
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    stored = await ok(f.service.from("clan_settings").select("hof_config,expose_hof").eq("clan_id", f.clanId).single());
    expect(stored.hof_config).toMatchObject({ member_personal_records: true, member_personal_sections: ["evaluation"], member_personal_audience: "own" });
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    await page.getByRole("button", { name: "경기 기록 설정", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "경기 기록 설정", exact: true });
    await dialog.getByLabel("경기 열람 멤버", { exact: true }).check();
    await dialog.getByLabel("경기 추가 멤버", { exact: true }).check();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    const memberPage = await memberContext.newPage();
    await loginIsolatedBalanceUser(memberPage, f.users[1]);
    await memberPage.goto(path);
    await memberPage.getByRole("tab", { name: "경기 기록", exact: true }).click();
    await expect(memberPage.getByRole("button", { name: "기록 추가", exact: true })).toBeVisible();
    await expect(memberPage.getByRole("button", { name: "기록 수정", exact: true })).toHaveCount(0);
    await expect(memberPage.getByRole("button", { name: "기록 제거", exact: true })).toHaveCount(0);
    await expect(memberPage.getByRole("button", { name: "경기 기록 설정", exact: true })).toHaveCount(0);
    const record = { playedAt: "2025-08-02T10:00:00Z", occurredAt: "2025-08-02T11:00:00Z", mapLabel: "네팔", outcome: "team1", players: [{ userId: f.users[0].id, team: 1, role: "tank" }, { userId: f.users[1].id, team: 2, role: "sup" }] };
    const manual = randomUUID();
    const edit = (operation: string, revision?: string) => f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[1].id, p_id: manual, p_operation: operation, p_revision: revision ?? null!, p_record: record,
    });
    await ok(edit("create"));
    const created = await loadClanStatsDetail(member, f.users[1].id, f.clanId);
    expect(created?.kind).toBe("archive");
    const dayResponse = await memberPage.request.get(`/api/clans/${f.clanId}/stats?section=archive&day=2025-08-02`);
    const day = await dayResponse.json();
    const revision = day.archive.sampleByDate["2025-08-02"].find((row: { id: string }) => row.id === manual).revision;
    expect((await edit("update", revision)).error?.code).toBe("42501");
    expect((await edit("delete", revision)).error?.code).toBe("42501");
    await ok(save(f.users[0].id, "records", { create_match_records: ["leader"], edit_match_records: ["leader", "member"] }));
    expect((await edit("create")).error?.code).toBe("42501");
    await ok(edit("update", revision));
    expect((await edit("delete", revision)).error?.code).toBe("42501");
    await ok(save(f.users[0].id, "records", { edit_match_records: ["leader"], delete_match_records: ["leader", "member"] }));
    expect((await edit("update", revision)).error?.code).toBe("42501");
    await ok(edit("delete", revision));
    await ok(save(f.users[0].id, "records", { view_match_records: ["leader"], create_match_records: ["leader", "member"] }));
    expect((await edit("create")).error?.code).toBe("42501");
    expect(await loadClanStatsDetail(member, f.users[1].id, f.clanId)).toBeNull();
    await memberPage.getByRole("tab", { name: "개인 기록", exact: true }).click();
    await memberPage.getByRole("button", { name: `${f.users[1].nickname} 개인 기록 열기`, exact: true }).click();
    await expect(memberPage.getByText("점수 변동 이력", { exact: true })).toBeVisible();
    await expect(memberPage.getByRole("radio", { name: "평가 점수", exact: true })).toBeVisible();
    await expect(memberPage.getByRole("radio", { name: "분석 점수", exact: true })).toHaveCount(0);
    await expect(memberPage.getByRole("region", { name: "플레이어 요약", exact: true })).toHaveCount(0);
    await expect(memberPage.getByText("승부예측 기록", { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
    await page.getByRole("button", { name: "개인 기록 설정", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "개인 기록 설정", exact: true });
    await dialog.getByRole("radio", { name: "멤버", exact: true }).click();
    await dialog.getByRole("checkbox", { name: "분석 점수", exact: false }).check();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    stored = await ok(f.service.from("clan_settings").select("hof_config,expose_hof").eq("clan_id", f.clanId).single());
    expect(stored.hof_config).toMatchObject({ personal_record_min_role: "member", member_personal_records: true, member_personal_audience: "clan", member_personal_sections: ["evaluation", "analysis"], win_rate_visible_top: 3 });
    expect(stored.expose_hof).toBe(true);
    const officerPage = await officerContext.newPage();
    await loginIsolatedBalanceUser(officerPage, f.users[2]);
    await officerPage.goto(path);
    // The saved minimum applies to staff too; higher roles are included automatically.
    for (const [label, minimum, allowed] of [
      ["서버장", "leader", [true, false, false]],
      ["운영진", "officer", [true, true, false]],
      ["멤버", "member", [true, true, true]],
    ] as const) {
      await page.getByRole("button", { name: "개인 기록 설정", exact: true }).click();
      dialog = page.getByRole("dialog", { name: "개인 기록 설정", exact: true });
      await dialog.getByRole("radio", { name: label, exact: true }).click();
      await dialog.getByRole("button", { name: "저장", exact: true }).click();
      await expect(dialog).toBeHidden();
      for (const [index, client] of [leader, officer, member].entries()) {
        const viewerId = f.users[index === 1 ? 2 : index === 2 ? 1 : 0].id;
        const personal = await loadClanStatsDetail(client, viewerId, f.clanId, f.users[0].id);
        expect(personal !== null, `${minimum}: viewer ${index}`).toBe(allowed[index]);
        const overview = await loadClanStatsPage(client, viewerId, f.clanId, { deferDetails: true });
        expect(overview?.permissions.viewPersonalRecords).toBe(allowed[index]);
        if (!allowed[index]) {
          expect(overview?.personal.people).toEqual([]);
          expect((await loadClanStatsPage(client, viewerId, f.clanId))?.personal.people).toEqual([]);
        }
      }
      await memberPage.reload();
      await expect(memberPage.getByRole("tab", { name: "개인 기록", exact: true })).toHaveCount(minimum === "member" ? 1 : 0);
      const response = await memberPage.request.get(`/api/clans/${f.clanId}/stats?section=personal&userId=${f.users[0].id}`);
      expect(response.status()).toBe(minimum === "member" ? 200 : 403);
      await officerPage.reload();
      await officerPage.getByRole("tab", { name: "개인 기록", exact: true }).click();
      expect((await officerPage.request.get(`/api/clans/${f.clanId}/stats?section=personal&userId=${f.users[0].id}`)).status()).toBe(minimum === "leader" ? 403 : 200);
      if (minimum === "leader") {
        await expect(officerPage.getByText("개인 기록 열람이 제한되어 있습니다.", { exact: true })).toBeVisible();
        await expect(officerPage.getByRole("button", { name: `${f.users[0].nickname} 개인 기록 열기`, exact: true })).toHaveCount(0);
        await officerPage.getByRole("button", { name: "개인 기록 설정", exact: true }).click();
        const officerDialog = officerPage.getByRole("dialog", { name: "개인 기록 설정", exact: true });
        await expect(officerDialog.getByRole("radio", { name: "서버장", exact: true })).toBeChecked();
        await officerDialog.getByRole("button", { name: "취소", exact: true }).click();
      }
      stored = await ok(f.service.from("clan_settings").select("hof_config,expose_hof").eq("clan_id", f.clanId).single());
      expect(stored.hof_config).toMatchObject({ personal_record_min_role: minimum, member_personal_sections: ["evaluation", "analysis"], win_rate_visible_top: 3 });
      await page.getByRole("button", { name: "개인 기록 설정", exact: true }).click();
      dialog = page.getByRole("dialog", { name: "개인 기록 설정", exact: true });
      await expect(dialog.getByRole("radio", { name: label, exact: true })).toBeChecked();
      await dialog.getByRole("button", { name: "취소", exact: true }).click();
    }
    await page.getByRole("tab", { name: "내전 통계", exact: true }).click();
    await page.getByRole("button", { name: "내전 통계 설정", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "내전 통계 설정", exact: true });
    await dialog.getByLabel("통계 열람 멤버", { exact: true }).uncheck();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    const period = await loadClanStatsPeriod(member, f.clanId, "2025-08");
    expect(period?.kind === "period" && period.intra.completed).toBe(0);
    await memberPage.reload();
    await expect(memberPage.getByRole("tab", { name: "내전 통계", exact: true })).toHaveCount(0);
    await ok(save(f.users[0].id, "personal", { member_personal_sections: [] }));
    expect(await loadClanStatsDetail(member, f.users[1].id, f.clanId, f.users[1].id)).toBeNull();
  } finally { await officerContext.close(); await memberContext.close(); await f.cleanup(); }
});
