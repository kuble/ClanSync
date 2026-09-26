import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { loadOpenLfgPosts, loadScrimRoomsForGame } from "../src/lib/main-game/load-main-game-hub";
import { loadClanDashboard } from "../src/lib/clan/load-clan-dashboard";
import { loadClanManagementStats, loadClanStatsPage } from "../src/lib/clan/stats/load-clan-stats";

type Fixture = Awaited<ReturnType<typeof createIsolatedBalanceFixture>>;
type Client = Awaited<ReturnType<Fixture["memberClient"]>>;
let f: Fixture, leader: Client, member: Client, spectator: Client;
const otherClans: string[] = [];
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}
const future = () => new Date(Date.now() + 86_400_000).toISOString();

test.beforeAll(async () => {
  test.setTimeout(180_000);
  f = await createIsolatedBalanceFixture();
  [leader, member, spectator] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(11)]);
  await ok(f.service.from("clans").update({ subscription_tier: "premium", coin_balance: 1000 }).eq("id", f.clanId));
});
test.afterAll(async () => {
  if (!f) return;
  const ids = f.users.map(u => u.id);
  await ok(f.service.from("coin_transactions").delete().in("created_by", ids));
  await ok(f.service.from("lfg_posts").delete().in("creator_user_id", ids));
  await ok(f.service.from("scrim_rooms").delete().in("created_by", ids));
  if (otherClans.length) await ok(f.service.from("clans").delete().in("id", otherClans));
  await f.cleanup();
});
test.setTimeout(90_000);

async function round(kind: "regular" | "flash" = "regular", owner = leader) {
  const room = await ok(owner.rpc("create_balance_room", { p_clan_id: f.clanId, p_kind: kind, p_title: "review isolated" }));
  const id = (room as { series_id: string }).series_id;
  const row = await ok(f.service.from("balance_sessions").select("*").eq("series_id", id).is("closed_at", null).single());
  const ids = f.users.slice(0, 10).map(u => u.id);
  const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
  await ok(f.service.from("balance_sessions").update({ roster }).eq("id", row.id));
  return { ...row, roster };
}
async function live(row: Awaited<ReturnType<typeof round>>) {
  await ok(f.service.from("balance_sessions").update({ resolved_map_label: "리장 타워" }).eq("id", row.id));
  await ok(f.service.from("balance_sessions").update({ phase: "match_live", prediction_deadline_at: future() }).eq("id", row.id));
}

test("webhook secrets stay private, leader can save/preserve/disable and cannot inject URLs", async () => {
  const args = { p_clan_id: f.clanId, p_enabled: true, p_kakao: false, p_url: "https://discord.com/api/webhooks/123/isolated_test" };
  expect((await member.rpc("set_clan_notification_settings", args)).error).not.toBeNull();
  await ok(leader.rpc("set_clan_notification_settings", args));
  await ok(leader.rpc("set_clan_notification_settings", { ...args, p_url: undefined }));
  expect((await member.from("clan_notification_secrets").select("*").eq("clan_id", f.clanId)).error).not.toBeNull();
  expect((await leader.from("clan_notification_secrets").select("*").eq("clan_id", f.clanId)).error).not.toBeNull();
  const settings = await ok(member.from("clan_settings").select("event_notify").eq("clan_id", f.clanId).single());
  expect(JSON.stringify(settings)).not.toContain("isolated_test");
  expect(JSON.stringify(settings)).not.toContain("discord_webhook_url");
  for (const url of ["http://127.0.0.1/private", "https://discord.com.evil.test/api/webhooks/123/t", args.p_url + "?wait=true"]) {
    expect((await leader.rpc("set_clan_notification_settings", { ...args, p_url: url })).error).not.toBeNull();
    expect((await leader.from("clan_settings").update({ event_notify: { discord_webhook_url: url } }).eq("clan_id", f.clanId)).error).not.toBeNull();
  }
  await ok(leader.rpc("set_clan_notification_settings", { ...args, p_enabled: false, p_url: undefined }));
  expect(await ok(f.service.from("clan_notification_secrets").select("clan_id").eq("clan_id", f.clanId))).toHaveLength(0);
});

test("alternate accounts require a shared clan for the same game; owners retain access", async () => {
  const other = await ok(f.service.from("games").select("id").neq("id", f.gameId).limit(1).single());
  await ok(f.service.from("user_alt_accounts").insert([
    { user_id: f.users[1].id, game_id: f.gameId, alt_nick: "visible", note: "same game" },
    { user_id: f.users[1].id, game_id: other.id, alt_nick: "private", note: "different game" },
  ]));
  const own = await ok(member.from("user_alt_accounts").select("alt_nick").eq("user_id", f.users[1].id));
  expect(own).toHaveLength(2);
  const peer = await ok(leader.from("user_alt_accounts").select("alt_nick").eq("user_id", f.users[1].id));
  expect(peer.map(x => x.alt_nick)).toEqual(["visible"]);
});

test("single-choice concurrent first votes replace atomically; multiple choice remains supported", async () => {
  const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, title: "isolated", created_by: f.users[0].id, deadline_at: future() }).select("id").single());
  const opts = await ok(f.service.from("poll_options").insert([0, 1].map(i => ({ poll_id: poll.id, label: String(i), sort_order: i }))).select("id"));
  const vote = (ids: string[]) => member.rpc("submit_clan_poll_vote", { p_clan_id: f.clanId, p_poll_id: poll.id, p_option_ids: ids });
  for (let i = 0; i < 6; i++) {
    await ok(f.service.from("poll_votes").delete().eq("poll_id", poll.id));
    await Promise.all(opts.map(o => ok(vote([o.id]))));
    expect(await ok(f.service.from("poll_votes").select("option_id").eq("poll_id", poll.id))).toHaveLength(1);
  }
  expect((await vote(opts.map(o => o.id))).error).not.toBeNull();
  expect((await vote([randomUUID()])).error).not.toBeNull();
  await ok(f.service.from("clan_polls").update({ multiple_choice: true }).eq("id", poll.id));
  await ok(vote(opts.map(o => o.id)));
  expect(await ok(f.service.from("poll_votes").select("option_id").eq("poll_id", poll.id))).toHaveLength(2);
  await ok(f.service.from("clan_polls").update({ closed_at: new Date().toISOString() }).eq("id", poll.id));
  expect((await vote([opts[0].id])).error).not.toBeNull();
});

test("history RLS preserves live access and staff/own-open-flash history only", async () => {
  const r = await round();
  expect(await ok(member.from("balance_sessions").select("id").eq("id", r.id))).toHaveLength(1);
  await ok(leader.rpc("close_balance_session_series", { p_clan_id: f.clanId, p_round_id: r.id }));
  expect(await ok(member.from("balance_sessions").select("id,ma_snapshot").eq("id", r.id))).toHaveLength(0);
  expect(await ok(member.from("balance_session_series").select("id").eq("id", r.series_id))).toHaveLength(0);
  expect(await ok(leader.from("balance_sessions").select("id").eq("id", r.id))).toHaveLength(1);
  const flash = await round("flash", member);
  await live(flash);
  await ok(member.rpc("set_balance_match_outcome", { p_session_id: flash.id, p_outcome: "void" }));
  await ok(member.rpc("next_balance_round", { p_clan_id: f.clanId, p_round_id: flash.id }));
  expect(await ok(member.from("balance_sessions").select("id").eq("id", flash.id))).toHaveLength(1);
  expect(await ok(spectator.from("balance_sessions").select("id").eq("id", flash.id))).toHaveLength(0);
});

test("delegated score editors persist only allowed fields and cannot modify other round state", async () => {
  const r = await round(); await live(r);
  const args = { p_round_id: r.id, p_clan_id: f.clanId, p_snapshot: { [f.users[1].id]: { m: -10, a: 10 } } };
  expect((await member.rpc("set_balance_scores", args)).error).not.toBeNull();
  await ok(leader.from("clan_settings").update({ permissions: { edit_mscore: ["leader", "member"] } }).eq("clan_id", f.clanId));
  await ok(member.rpc("set_balance_scores", args));
  expect((await ok(f.service.from("balance_sessions").select("ma_snapshot").eq("id", r.id).single())).ma_snapshot).toEqual(args.p_snapshot);
  expect((await member.rpc("set_balance_scores", { ...args, p_snapshot: { [f.users[1].id]: { m: 11, a: 0 } } })).error).not.toBeNull();
  expect((await member.rpc("set_balance_scores", { ...args, p_snapshot: { [f.users[11].id]: { m: 0, a: 0 } } })).error).not.toBeNull();
  expect((await member.from("balance_sessions").update({ match_outcome: "team1" }).eq("id", r.id)).error).not.toBeNull();
  await ok(leader.from("clan_settings").update({ permissions: {} }).eq("clan_id", f.clanId));
  expect((await member.rpc("set_balance_scores", args)).error).not.toBeNull();
});

test("prediction changes racing settlement conserve clan/personal coins and cannot change afterward", async () => {
  for (let i = 0; i < 5; i++) {
    const r = await round(); await live(r);
    // A pre-existing winner is required to exercise the debit/payout race.
    await ok(f.service.from("balance_session_predictions").insert({ session_id: r.id, user_id: f.users[10].id, pick_team: 1 }));
    await ok(spectator.from("balance_session_predictions").insert({ session_id: r.id, user_id: f.users[11].id, pick_team: 2 }));
    const [outcome] = await Promise.all([
      leader.rpc("set_balance_match_outcome", { p_session_id: r.id, p_outcome: "team1" }),
      spectator.from("balance_session_predictions").update({ pick_team: 1 }).eq("session_id", r.id),
    ]);
    expect(outcome.error).toBeNull(); expect(outcome.data).toMatchObject({ ok: true });
    const ledger = await ok(f.service.from("coin_transactions").select("amount").eq("reference_id", r.id));
    expect(ledger.length).toBeGreaterThanOrEqual(2);
    expect(ledger.reduce((total, row) => total + row.amount, 0)).toBe(0);
    const before = await ok(f.service.from("balance_session_predictions").select("pick_team").eq("session_id", r.id).eq("user_id", f.users[11].id).single());
    await spectator.from("balance_session_predictions").update({ pick_team: before.pick_team === 1 ? 2 : 1 }).eq("session_id", r.id);
    expect(await ok(f.service.from("balance_session_predictions").select("pick_team").eq("session_id", r.id).eq("user_id", f.users[11].id).single())).toEqual(before);
    expect((await spectator.from("balance_session_predictions").update({ session_id: randomUUID() }).eq("session_id", r.id)).error).not.toBeNull();
  }
});

test("closed map/hero ballot snapshots include accepted votes and reject stale identities", async () => {
  const r = await round();
  await ok(f.service.from("balance_sessions").update({ map_ban_enabled: true, hero_ban_enabled: true }).eq("id", r.id));
  await ok(f.service.from("balance_sessions").update({ phase: "map_ban", map_candidates: ["네팔", "부산", "일리오스"] }).eq("id", r.id));
  const current = await ok(f.service.from("balance_sessions").select("map_ban_deadline_at").eq("id", r.id).single());
  await ok(member.rpc("submit_balance_ban_vote", { p_round_id: r.id, p_clan_id: f.clanId, p_kind: "map", p_expected_deadline: current.map_ban_deadline_at!, p_choice_idx: 1 }));
  const deadline = new Date(Date.now() - 1000).toISOString();
  await ok(f.service.from("balance_sessions").update({ map_ban_deadline_at: deadline }).eq("id", r.id));
  const args = { p_round_id: r.id, p_clan_id: f.clanId, p_kind: "map", p_expected_deadline: deadline };
  expect(await ok(leader.rpc("read_closed_balance_ballot", args))).toEqual([{ choice_idx: 1 }]);
  expect((await member.rpc("read_closed_balance_ballot", args)).error).not.toBeNull();
  expect((await leader.rpc("read_closed_balance_ballot", { ...args, p_expected_deadline: future() })).error).not.toBeNull();
  expect((await member.rpc("submit_balance_ban_vote", { ...args, p_choice_idx: 2 })).error).not.toBeNull();
  await ok(f.service.from("balance_sessions").update({ resolved_map_label: "부산", map_ban_deadline_at: null }).eq("id", r.id));
  await ok(f.service.from("balance_sessions").update({ phase: "hero_ban" }).eq("id", r.id));
  const hero = await ok(f.service.from("balance_sessions").select("hero_ban_deadline_at").eq("id", r.id).single());
  await ok(member.rpc("submit_balance_ban_vote", { ...args, p_kind: "hero", p_expected_deadline: hero.hero_ban_deadline_at!, p_picks: ["ana"] }));
  await ok(f.service.from("balance_sessions").update({ hero_ban_deadline_at: deadline }).eq("id", r.id));
  expect(await ok(leader.rpc("read_closed_balance_ballot", { ...args, p_kind: "hero" }))).toEqual([{ user_id: f.users[1].id, pick_1: "ana", pick_2: null, pick_3: null }]);
});

test("concurrent scrim confirmations promote once; old schedules cannot hide upcoming rooms", async () => {
  const c = await ok(f.service.from("clans").insert({ game_id: f.gameId, name: `rv-${randomUUID().slice(0, 8)}` }).select("id").single());
  otherClans.push(c.id);
  await ok(f.service.from("clan_members").insert({ clan_id: c.id, user_id: f.users[1].id, role: "leader", status: "active" }));
  for (let i = 0; i < 3; i++) {
    const r = await ok(f.service.from("scrim_rooms").insert({ clan_a_id: f.clanId, clan_b_id: c.id, created_by: f.users[0].id, status: "matched", scheduled_at: future() }).select("id").single());
    await Promise.all([
      ok(leader.from("scrim_room_confirmations").insert({ scrim_room_id: r.id, side: "host", confirmed_by: f.users[0].id })),
      ok(member.from("scrim_room_confirmations").insert({ scrim_room_id: r.id, side: "guest", confirmed_by: f.users[1].id })),
    ]);
    expect((await ok(f.service.from("scrim_rooms").select("status").eq("id", r.id).single())).status).toBe("confirmed");
    expect(await ok(f.service.from("clan_events").select("id").eq("scrim_id", r.id))).toHaveLength(2);
  }
  await ok(f.service.from("scrim_rooms").insert(Array.from({ length: 49 }, (_, i) => ({ clan_a_id: f.clanId, created_by: f.users[0].id, scheduled_at: new Date(Date.now() - (i + 2) * 86_400_000).toISOString() }))));
  const upcoming = await ok(f.service.from("scrim_rooms").insert({ clan_a_id: f.clanId, created_by: f.users[0].id, scheduled_at: new Date(Date.now() + 60_000).toISOString() }).select("id").single());
  expect((await loadScrimRoomsForGame(leader, f.gameId)).some(r => r.id === upcoming.id)).toBe(true);
});

test("LFG counts are consistent for viewers without exposing other applicants", async () => {
  const p = await ok(leader.from("lfg_posts").insert({ game_id: f.gameId, creator_user_id: f.users[0].id, mode: "review", format: "5vs5", slots: 4, start_time_hour: 20, expires_at: future(), mic_required: false }).select("id").single());
  await ok(member.rpc("apply_lfg_post", { p_post_id: p.id }));
  await ok(spectator.rpc("apply_lfg_post", { p_post_id: p.id }));
  for (const [client, user] of [[leader, f.users[0]], [member, f.users[1]], [spectator, f.users[11]]] as const) {
    const result = await loadOpenLfgPosts(client, f.gameId, user.id);
    expect(result.posts.find(post => post.id === p.id)?.applied_count).toBe(2);
  }
  expect(await ok(member.from("lfg_applications").select("id").eq("post_id", p.id))).toHaveLength(1);
});

test("member management request renders access denied instead of E488", async ({ page }) => {
  await loginIsolatedBalanceUser(page, f.users[11]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/manage`);
  await expect(page.getByText("접근 권한이 없습니다", { exact: false })).toBeVisible();
  await expect(page.getByText("E488", { exact: false })).toBeHidden();
});

test("member dashboard and statistics retain aggregate totals without historical raw records", async () => {
  const r = await round(); await live(r);
  await ok(leader.rpc("set_balance_match_outcome", { p_session_id: r.id, p_outcome: "team1" }));
  await ok(leader.rpc("close_balance_session_series", { p_clan_id: f.clanId, p_round_id: r.id }));
  const [leaderDashboard, memberDashboard, stats] = await Promise.all([
    loadClanDashboard(leader, f.clanId, "premium"), loadClanDashboard(member, f.clanId, "premium"),
    loadClanStatsPage(member, f.users[1].id, f.clanId),
  ]);
  expect(memberDashboard?.completedIntraCount).toBeGreaterThan(0);
  expect(memberDashboard?.completedIntraCount).toBe(leaderDashboard?.completedIntraCount);
  expect(stats?.summary.intraCount).toBe(memberDashboard?.completedIntraCount);
  expect(stats?.intra.completed).toBeGreaterThan(0);
  expect(stats?.intra.recent).toEqual([]);
  expect(stats?.intra.scoreGaps).toEqual([]);
  expect(stats?.personal.people).toEqual([]);
  expect(stats?.permissions.viewPersonalRecords).toBe(false);
  expect(stats?.archive.datesKst).toEqual([]);
  expect(stats?.archive.sampleByDate).toEqual({});
  expect(await ok(member.from("balance_sessions").select("*").eq("id", r.id))).toHaveLength(0);
});

test("site-usage source rows are visible to staff but hidden from members", async () => {
  const date = new Date().toISOString().slice(0, 10);
  await ok(f.service.from("clan_daily_member_activity").upsert({
    clan_id: f.clanId, user_id: f.users[1].id, activity_date: date,
  }));
  const fromStaff = await ok(leader.from("clan_daily_member_activity").select("user_id").eq("clan_id", f.clanId));
  const fromMember = await ok(member.from("clan_daily_member_activity").select("user_id").eq("clan_id", f.clanId));
  expect(fromStaff.some((row) => row.user_id === f.users[1].id)).toBe(true);
  expect(fromMember).toEqual([]);
});

test("settled prediction picks are private while live vote totals remain shared", async ({ page }) => {
  const r = await round();
  await live(r);
  await ok(f.service.from("balance_session_predictions").insert([
    { session_id: r.id, user_id: f.users[1].id, pick_team: 1 },
    { session_id: r.id, user_id: f.users[2].id, pick_team: 2 },
  ]));
  const before = await ok(member.from("balance_session_predictions").select("user_id").eq("session_id", r.id));
  expect(before).toHaveLength(2);
  await ok(leader.rpc("set_balance_match_outcome", { p_session_id: r.id, p_outcome: "team1" }));
  const mine = await ok(member.from("balance_session_predictions").select("user_id").eq("session_id", r.id));
  const staff = await ok(leader.from("balance_session_predictions").select("user_id").eq("session_id", r.id));
  expect(mine.map((row) => row.user_id)).toEqual([f.users[1].id]);
  expect(staff).toHaveLength(2);
  const [myStats, staffStats, staffManagement, memberManagement] = await Promise.all([
    loadClanStatsPage(member, f.users[1].id, f.clanId),
    loadClanStatsPage(leader, f.users[0].id, f.clanId),
    loadClanManagementStats(leader, f.clanId),
    loadClanManagementStats(member, f.clanId),
  ]);
  expect(staffStats?.intra.scoreGapSummary.evaluation.count).toBe(0);
  expect(memberManagement).toBeNull();
  expect(staffManagement?.intra.completed).toBe(staffStats?.intra.completed);
  expect(staffManagement?.permissions.viewMscore).toBe(true);
  expect(staffManagement).not.toHaveProperty("hof");
  expect(staffManagement).not.toHaveProperty("personal");
  expect(myStats?.personal.people).toEqual([]);
  expect(myStats?.hof.periods.all.predictionCorrect).toEqual([]);
  expect(staffStats?.hof.periods.all.predictionCorrect.some((row) => row.userId === f.users[1].id)).toBe(true);
  const selected = staffStats?.personal.people.find((person) => person.userId === f.users[1].id);
  expect(selected?.predictions).toMatchObject([{ sessionId: r.id, result: "correct" }]);
  expect(selected?.predictionPoints).toEqual([]);
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("tab", { name: "개인 기록", exact: true }).click();
  await page.getByRole("button", { name: `${f.users[1].nickname} 개인 기록 열기`, exact: true }).click();
  await expect(page.getByLabel("승부예측 요약")).toContainText("적중률100%");
  await expect(page.getByText("포인트 수익·손실은 본인만 볼 수 있습니다.", { exact: true })).toBeVisible();
  await expect(page.getByText("내 승부예측", { exact: true })).toHaveCount(0);
});

test("statistics use four sections and site usage appears in staff management", async ({ page }) => {
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await expect(page.getByRole("tab", { name: "명예의 전당" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "내전 통계" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "부문", exact: true }).getByRole("radio")).toHaveCount(4);
  await expect(page.getByRole("listbox", { name: "명예의 전당 부문" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다승", exact: true })).toHaveCount(0);
  await page.getByRole("radiogroup", { name: "기간", exact: true }).getByRole("radio", { name: "월별", exact: true }).click();
  await expect(page.getByRole("listbox", { name: "월", exact: true })).toBeVisible();
  await page.getByRole("radiogroup", { name: "기간", exact: true }).getByRole("radio", { name: "연도별", exact: true }).click();
  await expect(page.getByRole("listbox", { name: "연도", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "내전 통계" }).click();
  await expect(page.getByRole("searchbox", { name: "경기 참가자 검색" })).toHaveCount(0);
  await page.getByRole("tab", { name: "경기 기록" }).click();
  await expect(page.getByRole("searchbox", { name: "경기 참가자 검색" })).toBeVisible();
  await expect(page.getByText("편성 방식", { exact: true })).toHaveCount(0);
  await expect(page.getByText("최근 경기", { exact: true })).toHaveCount(0);
  await expect(page.getByText("편성 점수 차이", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "개인 기록" }).click();
  await page.getByRole("button", { name: `${f.users[0].nickname} 개인 기록 열기`, exact: true }).click();
  await expect(page.getByText("시너지", { exact: true })).toBeVisible();
  await page.goto(`/games/overwatch/clan/${f.clanId}/manage?tab=overview`);
  await expect(page.getByText("사이트 이용 통계")).toBeVisible();
  await expect(page.getByText("편성 점수 차이", { exact: true })).toBeVisible();
  await page.goto(`/games/overwatch/clan/${f.clanId}/store`);
  await expect(page.getByRole("heading", { name: "클랜 스토어", exact: true })).toBeVisible();
  const clanBalance = await ok(f.service.from("clans").select("coin_balance").eq("id", f.clanId).single());
  const personalBalance = await ok(f.service.from("users").select("coin_balance").eq("id", f.users[0].id).single());
  const coins = page.getByLabel("보유 코인");
  await expect(coins.getByText("클랜 코인", { exact: true }).locator("..").locator("strong")).toHaveText(clanBalance.coin_balance.toLocaleString("ko-KR"));
  await expect(coins.getByText("내 코인", { exact: true }).locator("..").locator("strong")).toHaveText(personalBalance.coin_balance.toLocaleString("ko-KR"));
  await page.getByRole("tab", { name: "개인 꾸미기", exact: true }).click();
  await expect(page.getByRole("tab", { name: "개인 꾸미기", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("personal records are staff-only by default and member self-access follows the saved setting", async ({ page }) => {
  await loginIsolatedBalanceUser(page, f.users[1]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await expect(page.getByRole("tab", { name: "개인 기록" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "설정", exact: true })).toHaveCount(0);
  await page.context().clearCookies();
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /멤버의 본인 개인 기록/ }).check();
  await dialog.getByRole("button", { name: /저장/ }).click();
  await expect(dialog).toBeHidden();
  const enabled = await loadClanStatsPage(member, f.users[1].id, f.clanId);
  expect(enabled?.permissions.viewPersonalRecords).toBe(true);
  expect(enabled?.personal.people.map((person) => person.userId)).toEqual([f.users[1].id]);
  expect(enabled?.personal.canSeePeers).toBe(false);
  await page.context().clearCookies();
  await loginIsolatedBalanceUser(page, f.users[1]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("tab", { name: "개인 기록" }).click();
  await expect(page.getByRole("region", { name: "개인 기록 멤버 목록", exact: true }).getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: `${f.users[1].nickname} 개인 기록 열기`, exact: true }).click();
  await expect(page.getByText("엠블럼 컬렉션", { exact: true })).toBeVisible();
  await expect(page.getByText("선택 기간·역할 조건을 적용한 최근 기록입니다.")).toHaveCount(0);
  await page.getByRole("button", { name: "최근 흐름 도움말" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("현재 연속");
  await page.getByRole("radiogroup", { name: "개인 기록 기간", exact: true }).getByRole("radio", { name: "이번 달", exact: true }).click();
  await expect(page.getByRole("radiogroup", { name: "개인 기록 기간", exact: true }).getByRole("radio", { checked: true })).toHaveText("이번 달");
  await page.context().clearCookies();
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: /멤버의 본인 개인 기록/ }).uncheck();
  await page.getByRole("dialog").getByRole("button", { name: /저장/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const disabled = await loadClanStatsPage(member, f.users[1].id, f.clanId);
  expect(disabled?.personal.people).toEqual([]);
});

test("closed monthly and yearly top-three records appear as emblems", async ({ page, browser }) => {
  const r = await round(); await live(r);
  await ok(leader.rpc("set_balance_match_outcome", { p_session_id: r.id, p_outcome: "team1" }));
  const previousYear = new Date().getUTCFullYear() - 1;
  await ok(f.service.from("balance_session_series").update({ opened_at: `${previousYear}-02-12T10:00:00Z` }).eq("id", r.series_id));
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("tab", { name: "개인 기록" }).click();
  await page.getByRole("button", { name: `${f.users[0].nickname} 개인 기록 열기`, exact: true }).click();
  const board = page.getByLabel("수상 엠블럼");
  await expect(board.getByRole("button", { name: new RegExp(`${previousYear}-02 .*1위 엠블럼`) }).first()).toBeVisible();
  await board.getByRole("button").first().hover();
  await expect(page.getByRole("tooltip")).toContainText("월간");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(board).not.toContainText(`${previousYear}-02`);
  const paths = await board.locator("button > svg > path:first-child").evaluateAll((elements) => elements.map((el) => el.getAttribute("d")));
  expect(new Set(paths).size).toBeGreaterThan(1);
  await page.getByRole("listbox", { name: "수상 기간", exact: true }).press("End");
  await expect(board.getByRole("button", { name: new RegExp(`${previousYear} .*1위 엠블럼`) }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await board.getByRole("button").first().click();
  await expect(page.getByRole("tooltip")).toContainText("연간");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toBeHidden();
  const touchContext = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto(`/games/overwatch/clan/${f.clanId}/stats`);
    await touchPage.getByRole("tab", { name: "개인 기록" }).tap();
    await touchPage.getByRole("button", { name: `${f.users[0].nickname} 개인 기록 열기`, exact: true }).tap();
    await touchPage.getByLabel("수상 엠블럼").getByRole("button").first().tap();
    await expect(touchPage.getByRole("tooltip")).toContainText("월간");
    await touchPage.getByRole("listbox", { name: "수상 기간", exact: true }).tap();
    await expect(touchPage.getByRole("tooltip")).toBeHidden();
    expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await touchContext.close(); }
});

test("personal chart uses dated snapshots, compact wheel and actual private prediction payouts", async ({ page }) => {
  const r = await round();
  await ok(f.service.from("balance_sessions").update({ ma_snapshot: { [f.users[0].id]: { m: 2, a: 1 } } }).eq("id", r.id));
  await live(r);
  await ok(spectator.from("balance_session_predictions").insert({ session_id: r.id, user_id: f.users[11].id, pick_team: 1 }));
  await ok(leader.rpc("set_balance_match_outcome", { p_session_id: r.id, p_outcome: "team1" }));
  const current = await ok(f.service.from("clan_settings").select("hof_config").eq("clan_id", f.clanId).single());
  await ok(f.service.from("clan_settings").update({ hof_config: { ...(current.hof_config as Record<string, unknown>), member_personal_records: true } }).eq("clan_id", f.clanId));
  const own = await loadClanStatsPage(spectator, f.users[11].id, f.clanId);
  const paid = await ok(spectator.from("coin_transactions").select("amount").eq("reference_id", r.id).eq("user_id", f.users[11].id));
  expect(paid.length).toBeGreaterThan(0);
  expect(own?.personal.people[0].predictionPoints.reduce((sum, day) => sum + day.net, 0)).toBe(paid.reduce((sum, row) => sum + row.amount, 0));
  expect(own?.personal.people).toHaveLength(1);
  const staff = await loadClanStatsPage(leader, f.users[0].id, f.clanId);
  expect(staff?.personal.people.find((person) => person.userId === f.users[11].id)?.predictionPoints).toEqual([]);
  await loginIsolatedBalanceUser(page, f.users[0]);
  await page.goto(`/games/overwatch/clan/${f.clanId}/stats`);
  await page.getByRole("tab", { name: "개인 기록" }).click();
  await page.getByRole("button", { name: `${f.users[0].nickname} 개인 기록 열기`, exact: true }).click();
  const chart = page.getByRole("img", { name: /점수 이력 그래프/ });
  await expect(chart).toBeVisible();
  await chart.press("End");
  await expect(page.getByRole("status", { name: "점수 이력 그래프 선택 값" })).toContainText("평가 점수");
  await expect(page.getByRole("status", { name: "점수 이력 그래프 선택 값" })).toContainText("2점");
  await chart.press("Escape");
  await expect(page.getByRole("status", { name: "점수 이력 그래프 선택 값" })).toBeHidden();
  const wheel = page.getByRole("listbox", { name: "점수 종류", exact: true });
  await wheel.hover(); await page.mouse.wheel(0, 100);
  await expect(wheel.getByRole("option", { selected: true })).toHaveText("분석 점수");
  await expect(page.getByRole("button", { name: "점수 종류 다음" })).toHaveCount(0);
  const selectedStyle = await wheel.getByRole("option", { selected: true }).evaluate((el) => getComputedStyle(el).transform);
  expect(selectedStyle).toMatch(/^matrix\(1, 0, 0, 1,/);
  await expect(page.getByText("참여 날짜", { exact: true })).toHaveCount(0);
  const roles = page.getByLabel("역할별 기록 비교");
  await expect(roles.locator(":scope > div")).toHaveCount(4);
  await expect(roles.getByRole("button")).toHaveCount(0);
  const beforeRoles = await roles.innerText();
  await page.getByRole("listbox", { name: "내 역할", exact: true }).press("End");
  await expect(roles).toHaveText(beforeRoles, { useInnerText: true });
  await expect(page.getByRole("region", { name: "맵별 기록 목록", exact: true })).toHaveAttribute("data-more-below", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  const tops = await roles.locator(":scope > div").evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  await page.getByRole("button", { name: "멤버 다시 선택" }).click();
  await expect(page.getByRole("heading", { name: "멤버를 선택하세요" })).toBeVisible();
  await expect(page.getByText("역할별 기록", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "멤버 이름 검색" }).fill("no-such-member");
  await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  await page.getByRole("textbox", { name: "멤버 이름 검색" }).fill(f.users[1].nickname);
  await expect(page.getByRole("region", { name: "개인 기록 멤버 목록", exact: true }).getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: `${f.users[1].nickname} 개인 기록 열기`, exact: true }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`개인 기록 · ${f.users[1].nickname}`) })).toBeVisible();
});

test("UTC calendar can select a month-end Korean occurrence", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "UTC" });
  const page = await context.newPage();
  const now = new Date();
  const instant = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 15, 30));
  const date = instant.toISOString().slice(0, 10);
  const title = `month-boundary-${randomUUID().slice(0, 6)}`;
  await ok(f.service.from("clan_events").insert({ clan_id: f.clanId, title, kind: "event", start_at: instant.toISOString(), created_by: f.users[0].id }));
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(`/games/overwatch/clan/${f.clanId}/events`);
    await page.locator(`[data-date="${date}"]`).click();
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect(page.getByRole("dialog")).toContainText(title);
  } finally { await context.close(); }
});
