import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, createAndEnterBalanceRoom, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import type { Json } from "../src/lib/supabase/database.types";
import { loadClanStatsPageFromRecords } from "../src/lib/clan/stats/load-clan-stats";

// Postgres accepts null RPC arguments; the generated client types omit nullability.
const nullRpcArgument = null as unknown as string;

async function ok<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const result = await query;
  expect(result.error, result.error?.message).toBeNull();
  return result.data;
}

test("guest records accumulate, require staff approval and revert without moving original records or money", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const base = f.path.replace(/\/balance$/, "");
  try {
    const leader = await f.memberClient(0), claimant = await f.memberClient(1), member = await f.memberClient(2);
    const guest = await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nullRpcArgument, p_nickname: "AIMZERO", p_alias: "에임" }));
    expect((await member.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nullRpcArgument, p_nickname: "forged", p_alias: "위조" })).error?.code).toBe("42501");
    expect((await member.from("clan_participants").insert({ clan_id: f.clanId, nickname: "forged", alias: "위조" })).error).not.toBeNull();
    expect((await leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nullRpcArgument, p_nickname: "aimzero", p_alias: "에임" })).error?.code).toBe("23505");
    const second = await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nullRpcArgument, p_nickname: "aimzero", p_alias: "제로" }));
    const pool = await ok(leader.rpc("list_balance_roster_pool", { p_clan_id: f.clanId }));
    expect(pool!.find((p) => p.user_id === guest)?.nickname).toBe("AIMZERO · 에임");
    expect(pool!.find((p) => p.user_id === second)?.nickname).toBe("aimzero · 제로");
    const makeRecord = async (player: string, minute: number) => ok(f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: nullRpcArgument, p_operation: "create", p_revision: nullRpcArgument,
      p_record: { playedAt: `2026-10-01T10:${String(minute).padStart(2, "0")}:00Z`, occurredAt: `2026-10-01T10:${String(minute).padStart(2, "0")}:00Z`, mapLabel: "부산", outcome: "team1", players: [{ userId: player, team: 1, role: "tank" }, { userId: f.users[0].id, team: 2, role: "tank" }] } as Json,
    }));
    const firstRecord = await makeRecord(guest!, 0);
    await makeRecord(guest!, 1);
    await makeRecord(f.users[1].id, 2);
    const summary = async () => (await ok(f.service.rpc("read_clan_stats_summary", { p_clan_id: f.clanId, p_periods: ["all"] }))) as unknown as { periods: { all: { players: { userId: string; played: number }[] } } };
    const played = async (id: string) => (await summary()).periods.all.players.find((p) => p.userId === id)?.played ?? 0;
    expect(await played(guest!)).toBe(2);
    expect(await played(f.users[1].id)).toBe(1);
    const coinsBefore = await ok(f.service.from("users").select("id,coin_balance").in("id", f.users.map((u) => u.id)).order("id"));

    // Website signup and claim do not require joining the clan or granting a role.
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    const token = await ok(leader.rpc("issue_clan_participant_invite", { p_clan_id: f.clanId, p_id: guest! }));
    expect(await ok(claimant.from("clan_participants").select("id").eq("clan_id", f.clanId))).toEqual([]);
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(`/participant-link/${token}`);
    await expect(page.getByText("AIMZERO · 에임", { exact: true })).toBeVisible();
    await expect(page.getByText(f.users[1].id.slice(0, 8), { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "내 참가자 기록 연결 요청", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "운영진 확인" })).toBeVisible();
    const requests = await ok(claimant.from("clan_participant_links").select("*").eq("participant_id", guest!));
    expect(requests).toHaveLength(1);
    const request = requests![0];
    expect((await claimant.rpc("review_clan_participant_link", { p_request_id: request.id, p_action: "approve", p_note: "본인 주장" })).error?.code).toBe("42501");
    expect(await played(guest!)).toBe(2);

    await page.context().clearCookies(); await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(`${base}/manage?tab=members`);
    // Old invitation links remain compatible; new approvals are covered below.
    await ok(leader.rpc("review_clan_participant_link", { p_request_id: request.id, p_action: "approve", p_note: "음성 채널에서 본인 확인" }));
    expect(await played(guest!)).toBe(0);
    expect(await played(f.users[1].id)).toBe(3);
    expect(await ok(claimant.rpc("read_clan_participant_invite", { p_token: token! }))).toBeNull();
    expect((await leader.rpc("review_clan_participant_link", { p_request_id: request.id, p_action: "approve", p_note: "중복 처리" })).error?.code).toBe("PT409");
    expect(await ok(f.service.from("clan_members").select("id").eq("clan_id", f.clanId).eq("user_id", f.users[1].id))).toEqual([]);
    await ok(f.service.from("clan_members").insert({ clan_id: f.clanId, user_id: f.users[1].id, role: "member", status: "active" }));
    const linkedPool = await ok(leader.rpc("list_balance_roster_pool", { p_clan_id: f.clanId }));
    expect(linkedPool!.some((p) => p.user_id === guest)).toBe(false);
    expect(linkedPool!.some((p) => p.user_id === f.users[1].id)).toBe(true);
    await makeRecord(f.users[1].id, 3);
    const projected = (await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[1].id })))!;
    expect(projected).toHaveLength(4);
    const first = projected.find((r) => (r.payload as { id: string }).id === firstRecord)!.payload as { _revision: string; match_players: { user_id: string }[] };
    expect(first.match_players[0].user_id).toBe(f.users[1].id);
    // Correcting a linked record must retain its original guest provenance.
    await ok(f.service.rpc("edit_clan_match_record", { p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: firstRecord!, p_operation: "update", p_revision: first._revision,
      p_record: { playedAt: "2026-10-01T10:00:00Z", occurredAt: "2026-10-01T10:00:00Z", mapLabel: "일리오스", outcome: "team1", players: [{ userId: f.users[1].id, team: 1, role: "tank" }, { userId: f.users[0].id, team: 2, role: "tank" }] } as Json }));
    await page.reload();
    await page.getByRole("button", { name: `${f.users[1].nickname} 이전 기록 관리`, exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "이전 내전 기록", exact: true });
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await page.getByRole("dialog", { name: "이전 기록 연결을 해제할까요?", exact: true }).getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await played(guest!)).toBe(2);
    expect(await played(f.users[1].id)).toBe(2);
    expect(await ok(f.service.from("users").select("id,coin_balance").in("id", f.users.map((u) => u.id)).order("id"))).toEqual(coinsBefore);
    const audit = (await ok(leader.from("clan_participant_links").select("*").eq("id", request.id).single()))!;
    expect(audit.reviewed_by).toBe(f.users[0].id); expect(audit.revoked_by).toBe(f.users[0].id);
    expect(audit.review_note).toBe("음성 채널에서 본인 확인"); expect(audit.revoke_note).toContain("기록 연결을 해제");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("region", { name: "내전 참가자 명부", exact: true }).screenshot({ path: testInfo.outputPath("participants-mobile.png") });
  } finally { await f.cleanup(); }
});

test("guest registration is reusable in the live roster and conflicting identities cannot be linked", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(9);
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await createAndEnterBalanceRoom(page, f.path);
    await page.getByRole("button", { name: "미가입 참가자 추가", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "미가입 참가자 추가", exact: true });
    await dialog.getByLabel("인게임 닉네임").fill("AIMZERO");
    await expect(dialog.getByRole("textbox")).toHaveCount(1);
    await dialog.getByRole("button", { name: "참가자 추가", exact: true }).click(); await expect(dialog).toBeHidden();
    const guest = (await ok(f.service.from("clan_participants").select("id").eq("clan_id", f.clanId).eq("nickname", "AIMZERO").single()))!;
    const leader = await f.memberClient(0), member = await f.memberClient(1);
    const currentRound = await f.activeRound();
    await ok(leader.rpc("read_balance_prediction_pool", { p_session_id: currentRound.id }));
    const panel = page.getByTestId("clan-balance-session-panel");
    await panel.getByRole("button", { name: "AIMZERO 출전 명단에 추가", exact: true }).click();
    for (const user of f.users) await panel.getByRole("button", { name: `${user.nickname} 출전 명단에 추가`, exact: true }).click();
    await expect.poll(async () => JSON.stringify((await f.activeRound()).roster)).toContain(guest.id);
    const round = await f.activeRound();
    const roster = round.roster as Json;
    const token = await ok(leader.rpc("issue_clan_participant_invite", { p_clan_id: f.clanId, p_id: guest.id }));
    const request = await ok(member.rpc("request_clan_participant_link", { p_token: token! }));
    expect((await leader.rpc("review_clan_participant_link", { p_request_id: request!, p_action: "approve", p_note: "진행 중 확인" })).error?.message).toContain("진행 중인 내전");
    // Staff can start a full 5v5 with a guest; no auth user or game profile is fabricated.
    await ok(f.service.from("balance_sessions").update({ map_ban_enabled: false, hero_ban_enabled: false }).eq("id", round.id));
    await ok(f.service.from("balance_sessions").update({ resolved_map_label: "부산", map_ban_deadline_at: null }).eq("id", round.id));
    await ok(f.service.from("balance_sessions").update({ phase: "match_live" }).eq("id", round.id));
    await ok(f.service.from("balance_sessions").update({ match_outcome: "team1", closed_at: new Date().toISOString(), predictions_settled_at: new Date().toISOString() }).eq("id", round.id));
    await ok(f.service.from("balance_session_series").update({ closed_at: new Date().toISOString() }).eq("id", round.series_id!));
    expect((await leader.rpc("review_clan_participant_link", { p_request_id: request!, p_action: "approve", p_note: "같은 경기의 동명이인" })).error?.message).toContain("같은 경기");
    const after = await ok(f.service.from("balance_sessions").select("roster").eq("id", round.id).single());
    expect(after!.roster).toEqual(roster);
    expect(await ok(f.service.from("users").select("id").eq("id", guest.id))).toEqual([]);
    expect(await ok(f.service.from("user_game_profiles").select("user_id").eq("user_id", guest.id))).toEqual([]);
    const nextPool = await ok(leader.rpc("list_balance_roster_pool", { p_clan_id: f.clanId }));
    expect(nextPool!.some((p) => p.user_id === guest.id)).toBe(true);
  } finally { await f.cleanup(); }
});

test("completed guest rounds preserve scores, history identity and next-session evaluation across linking and undo", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  try {
    const leader = await f.memberClient(0), claimant = await f.memberClient(1);
    const guest = (await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nullRpcArgument, p_nickname: "ZERO", p_alias: "제로" })))!;
    const series = randomUUID(), id = randomUUID();
    const roster = { team1: { tank: guest, dmg: [null, null], sup: [null, null] }, team2: { tank: f.users[0].id, dmg: [null, null], sup: [null, null] } };
    const scores = { [guest]: { m: 4.5, a: -0.8 }, [f.users[0].id]: { m: 0, a: 0 } };
    await ok(f.service.from("balance_session_series").insert({ id: series, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, opened_at: "2026-10-01T10:00:00Z", closed_at: "2026-10-01T11:00:00Z" }));
    await ok(f.service.from("balance_rooms").update({ status: "closed", kind: "regular" }).eq("series_id", series));
    await ok(f.service.from("balance_sessions").insert({ id, series_id: series, clan_id: f.clanId, game_id: f.gameId, host_user_id: f.users[0].id, round_number: 1, opened_at: "2026-10-01T10:00:00Z", closed_at: "2026-10-01T11:00:00Z", match_outcome: "team1", predictions_settled_at: "2026-10-01T11:00:00Z", roster: roster as Json, ma_snapshot: scores as Json, resolved_map_label: "부산" }));
    const token = (await ok(leader.rpc("issue_clan_participant_invite", { p_clan_id: f.clanId, p_id: guest })))!;
    const request = (await ok(claimant.rpc("request_clan_participant_link", { p_token: token })))!;
    await ok(leader.rpc("review_clan_participant_link", { p_request_id: request, p_action: "approve", p_note: "게임 계정과 음성으로 본인 확인" }));
    const record = (await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: f.users[1].id })))![0].payload as { roster: { team1: { tank: string } }; ma_snapshot: Record<string, { m: number; a: number }> };
    expect(record.roster.team1.tank).toBe(f.users[1].id); expect(record.ma_snapshot[f.users[1].id]).toEqual(scores[guest]);
    const reference = await loadClanStatsPageFromRecords(leader, f.users[0].id, f.clanId);
    expect(reference!.hof.periods.all.cumulative.find((p) => p.userId === f.users[1].id)?.played).toBe(1);
    expect(await ok(claimant.rpc("balance_roster_contains_user", { p_roster: roster as Json, p_uid: f.users[1].id }))).toBe(true);
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(f.path);
    await page.getByRole("button", { name: "내전 기록", exact: true }).click();
    const history = page.getByRole("dialog", { name: "내전 기록", exact: true });
    await expect(history.getByTestId("balance-history-stats-table")).toContainText(f.users[1].nickname);
    await expect(history.getByTestId("balance-history-stats-table")).not.toContainText("ZERO");
    await page.keyboard.press("Escape"); await expect(history).toBeHidden();
    await createAndEnterBalanceRoom(page, f.path);
    const panel = page.getByTestId("clan-balance-session-panel");
    await panel.getByRole("button", { name: `${f.users[1].nickname} 출전 명단에 추가`, exact: true }).click();
    const slot = panel.locator("[data-roster-slot]").filter({ hasText: f.users[1].nickname });
    await expect(slot.getByText("+4.5", { exact: true })).toBeVisible();
    await expect.poll(async () => JSON.stringify((await f.activeRound()).roster)).toContain(f.users[1].id);
    // End the unstarted session before undoing; live actor identities stay fixed.
    const current = await f.activeRound();
    await ok(f.service.from("balance_sessions").update({ match_outcome: "void", closed_at: new Date().toISOString() }).eq("id", current.id));
    await ok(f.service.from("balance_session_series").update({ closed_at: new Date().toISOString() }).eq("id", current.series_id!));
    await ok(leader.rpc("review_clan_participant_link", { p_request_id: request, p_action: "revoke", p_note: "연결 취소 검증" }));
    const original = (await ok(f.service.from("balance_sessions").select("roster,ma_snapshot").eq("id", id).single()))!;
    expect(original.roster).toEqual(roster); expect(original.ma_snapshot).toEqual(scores);
    const restored = (await ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: guest })))![0].payload as { ma_snapshot: Record<string, { m: number; a: number }> };
    expect(restored.ma_snapshot[guest]).toEqual(scores[guest]);
  } finally { await f.cleanup(); }
});
