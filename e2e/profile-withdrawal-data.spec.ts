import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

async function ok<T extends { data: unknown; error: unknown }>(query: PromiseLike<T>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T["data"]>;
}

test("실제 클랜·계정 탈퇴는 개인 데이터 삭제와 공동 기록 보존 안내에 일치한다", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(3);
  const [keeper, subject, observer] = f.users;
  let otherClanId: string | undefined;
  try {
    const client = await f.memberClient(1);
    const ordinary = await f.memberClient(2);
    const hostName = "WithdrawalHost#4321";
    await ok(f.service.from("user_game_profiles").update({ battle_tag: hostName }).eq("user_id", subject.id).eq("game_id", f.gameId));
    const baseline = await ok(f.service.from("users").select("*").like("email", "qa_%@clansync-qa.local").order("id"));
    expect(baseline.length).toBeGreaterThan(0);
    const peerBefore = await ok(f.service.from("users").select("*").eq("id", keeper.id).single());
    await ok(f.service.from("clans").update({ rules: "탈퇴와 별도로 보존되는 클랜 규칙" }).eq("id", f.clanId));
    const clan = await ok(f.service.from("clans").select("id,name,coin_balance,rules").eq("id", f.clanId).single());
    const other = await ok(f.service.from("clans").insert({ game_id: f.gameId, name: `Withdrawal-${subject.id.slice(0, 8)}` }).select("id").single());
    otherClanId = other.id;
    await ok(f.service.from("clan_members").insert({ clan_id: other.id, user_id: subject.id, role: "member", status: "active" }));
    await ok(f.service.from("users").update({ coin_balance: 321, gender: "female", birth_year: 1998 }).eq("id", subject.id));
    await ok(f.service.auth.admin.updateUserById(subject.id, { user_metadata: { profile_intro: "탈퇴 검증 임시 소개" } }));
    await ok(f.service.from("user_alt_accounts").insert({ user_id: subject.id, game_id: f.gameId, alt_nick: "WithdrawalAlt#1234", note: "owner-only" }));
    await ok(f.service.from("profile_role_preferences").insert({ user_id: subject.id, game_id: f.gameId, ranking: ["tank", "dmg", "sup"] }));
    const option = await ok(f.service.from("nameplate_options").select("id,category").eq("is_active", true).eq("price_coins", 0).limit(1).single());
    await ok(f.service.from("user_nameplate_inventory").insert({ user_id: subject.id, option_id: option.id }));
    await ok(client.from("user_namecard_selections").insert({ user_id: subject.id, option_id: option.id, category: option.category }));
    await ok(f.service.from("user_housing_rooms").upsert({ user_id: subject.id }));
    const furniture = await ok(f.service.from("housing_catalog").select("id").eq("is_active", true).limit(1).single());
    await ok(f.service.from("user_housing_inventory").insert({ user_id: subject.id, catalog_id: furniture.id, acquired_price: 0 }));
    await ok(f.service.from("coin_transactions").insert({ user_id: subject.id, pool_type: "personal", amount: 321, reason: "withdrawal fixture", reference_type: "test", reference_id: randomUUID(), balance_after: 321 }));
    const item = await ok(f.service.from("store_items").select("id").limit(1).single());
    const purchaseLedger = await ok(f.service.from("coin_transactions").insert({ user_id: subject.id, pool_type: "personal", amount: -10, reason: "withdrawal purchase fixture", reference_type: "test", reference_id: randomUUID(), balance_after: 321 }).select("id").single());
    await ok(f.service.from("purchases").insert({ user_id: subject.id, item_id: item.id, pool_source: "personal", price_coins: 10, coin_transaction_id: purchaseLedger.id }));
    await ok(f.service.rpc("finalize_clan_personal_emblem_awards", { p_clan_id: f.clanId, p_period_type: "month", p_period_key: "2025-01", p_awards: [{ user_id: subject.id, family: "victory", rank: 1 }] }));
    const award = await ok(f.service.from("clan_personal_emblem_awards").select("emblem_key").eq("user_id", subject.id).single());
    await ok(f.service.from("account_personal_emblem_picks").insert({ user_id: subject.id, emblem_keys: [`${f.clanId}:${award.emblem_key}`] }));
    const post = await ok(f.service.from("clan_board_posts").insert({ clan_id: f.clanId, author_id: subject.id, kind: "free", title: "탈퇴 후에도 남는 글", content: "기록 속 이름과 본문 보존" }).select("*").single());
    const comment = await ok(f.service.from("clan_board_comments").insert({ post_id: post.id, author_id: subject.id, content: "보존할 댓글" }).select("*").single());
    const notice = await ok(f.service.from("clan_notices").insert({ clan_id: f.clanId, created_by: subject.id, updated_by: subject.id, title: "보존할 공지", content: "공지 본문" }).select("*").single());
    const hof = await ok(f.service.from("clan_hof_comments").insert({ clan_id: f.clanId, author_id: subject.id, ranking: "rate", period_key: "all", content: "보존할 명예의 전당 댓글" }).select("*").single());
    const match = await ok(f.service.from("matches").insert({ clan_id: f.clanId, game_id: f.gameId, created_by: subject.id, map_label: "부산" }).select("*").single());
    await ok(f.service.from("match_players").insert([{ match_id: match.id, user_id: subject.id, team: 1 }, { match_id: match.id, user_id: keeper.id, team: 2 }]));
    await ok(f.service.from("match_results").insert({ match_id: match.id, winner_team: 1 }));
    const correctedId = await ok(f.service.rpc("edit_clan_match_record", { p_clan_id: f.clanId, p_actor_id: keeper.id, p_operation: "create", p_id: null as unknown as string, p_revision: null as unknown as string, p_record: { playedAt: "2026-10-01T10:00:00Z", occurredAt: "2026-10-01T10:00:00Z", mapLabel: "부산", outcome: "team1", players: [{ userId: subject.id, team: 1, role: "tank" }, { userId: keeper.id, team: 2, role: "tank" }] } }));
    const readRecords = () => ok(f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_user_id: keeper.id }));
    const recordsBefore = await readRecords();
    const personalTables = ["user_game_profiles", "user_alt_accounts", "profile_role_preferences", "user_nameplate_inventory", "user_namecard_selections", "user_housing_rooms", "user_housing_inventory", "purchases", "coin_transactions", "clan_personal_emblem_awards", "account_personal_emblem_picks"] as const;
    const readPersonal = async () => Object.fromEntries(await Promise.all(personalTables.map(async table => [table, await ok(f.service.from(table).select("*").eq("user_id", subject.id))] as const)));
    const personalBefore = await readPersonal();
    for (const rows of Object.values(personalBefore)) expect(rows.length).toBeGreaterThan(0);
    const memberBefore = await ok(f.service.from("clan_members").select("*").eq("clan_id", f.clanId).eq("user_id", subject.id).single());

    await loginIsolatedBalanceUser(page, subject);
    await page.goto("/profile");
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "오버워치 게임 정보", exact: true }).click();
    await page.getByRole("button", { name: `${clan.name} 클랜 탈퇴`, exact: true }).click();
    const leave = page.getByRole("dialog", { name: "클랜을 탈퇴할까요?", exact: true });
    await leave.getByRole("button", { name: "클랜 탈퇴", exact: true }).click();
    await expect(leave).toBeHidden();
    const former = await ok(f.service.from("clan_members").select("*").eq("id", memberBefore.id).single());
    expect(former.status).toBe("left");
    expect(former.id).toBe(memberBefore.id);
    expect((await ok(f.service.from("clan_members").select("status").eq("clan_id", other.id).eq("user_id", subject.id).single())).status).toBe("active");
    expect(await readPersonal()).toEqual(personalBefore);
    expect(await readRecords()).toEqual(recordsBefore);
    expect(await ok(client.from("clan_board_posts").select("id").eq("id", post.id))).toEqual([]);
    expect((await ok(f.service.auth.admin.getUserById(subject.id))).user!.id).toBe(subject.id);
    expect((await ok(f.service.from("users").select("coin_balance").eq("id", subject.id).single())).coin_balance).toBe(321);
    for (const [table, row] of [["clan_board_posts", post], ["clan_board_comments", comment], ["clan_notices", notice], ["clan_hof_comments", hof], ["matches", match]] as const)
      expect(await ok(f.service.from(table).select("*").eq("id", row.id).single())).toEqual(row);

    // Every former restrictive operational reference stays present during UI deletion.
    // Restore the temporary membership for a separate, active-host account deletion.
    await ok(f.service.from("clan_members").update({ status: "active", role: "officer" }).eq("id", memberBefore.id));
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const event = await ok(f.service.from("clan_events").insert({ clan_id: other.id, created_by: subject.id, title: "보존할 일정", start_at: future }).select("*").single());
    const poll = await ok(f.service.from("clan_polls").insert({ clan_id: f.clanId, created_by: subject.id, title: "보존할 투표", deadline_at: future }).select("*").single());
    const bracket = await ok(f.service.from("bracket_tournaments").insert({ host_clan_id: f.clanId, created_by: subject.id, title: "보존할 대진표", team_count: 2 }).select("*").single());
    const promotion = await ok(f.service.from("board_posts").insert({ clan_id: f.clanId, game_id: f.gameId, created_by: subject.id, title: "보존할 모집글", content: "본문" }).select("*").single());
    const scrim = await ok(f.service.from("scrim_rooms").insert({ clan_a_id: f.clanId, clan_b_id: other.id, status: "matched", created_by: subject.id, scheduled_at: future }).select("*").single());
    const confirmation = await ok(f.service.from("scrim_room_confirmations").insert({ scrim_room_id: scrim.id, side: "host", confirmed_by: subject.id }).select("*").single());
    const schedule = await ok(f.service.from("balance_room_schedules").insert({ clan_id: f.clanId, created_by: subject.id, title: "보존할 반복 내전", interval_days: 7, next_run_at: future }).select("*").single());
    const reservation = await ok(f.service.from("balance_rooms").insert({ clan_id: f.clanId, game_id: f.gameId, created_by: subject.id, delegated_to: subject.id, title: "보존할 예약", kind: "regular", schedule_id: schedule.id, scheduled_at: future }).select("*").single());
    const series = await ok(f.service.from("balance_session_series").insert({ clan_id: f.clanId, game_id: f.gameId, host_user_id: subject.id, opened_at: "2026-10-02T10:00:00Z", closed_at: "2026-10-02T11:00:00Z" }).select("*").single());
    const round = await ok(f.service.from("balance_sessions").insert({ clan_id: f.clanId, game_id: f.gameId, host_user_id: subject.id, series_id: series.id, round_number: 1, opened_at: "2026-10-02T10:00:00Z", closed_at: "2026-10-02T11:00:00Z", predictions_settled_at: "2026-10-02T11:00:00Z", match_outcome: "team1", resolved_map_label: "네팔", roster: { team1: { tank: keeper.id, dmg: [], sup: [] }, team2: { tank: subject.id, dmg: [], sup: [] } } }).select("*").single());
    const operationRows = [
      ["clan_events", event, "created_by"], ["clan_polls", poll, "created_by"], ["bracket_tournaments", bracket, "created_by"],
      ["board_posts", promotion, "created_by"], ["scrim_rooms", scrim, "created_by"], ["scrim_room_confirmations", confirmation, "confirmed_by"],
      ["balance_room_schedules", schedule, "created_by"], ["balance_rooms", reservation, "created_by"],
      ["balance_session_series", series, "host_user_id"], ["balance_sessions", round, "host_user_id"],
    ] as const;
    for (const [, row] of operationRows) expect(row.operator_name).toBe(hostName);
    await ok(f.service.from("clan_events").update({ operator_name: "forged" }).eq("id", event.id));
    expect((await ok(f.service.from("clan_events").select("operator_name").eq("id", event.id).single())).operator_name).toBe(hostName);
    await page.reload();
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await page.getByRole("button", { name: "클랜싱크 탈퇴", exact: true }).click();
    const deletion = page.getByRole("dialog", { name: "클랜싱크를 탈퇴할까요?", exact: true });
    await deletion.getByRole("button", { name: "클랜싱크 탈퇴하기", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    f.users.splice(1, 1); // Successful UI deletion already removed this fixture user.
    expect((await f.service.auth.admin.getUserById(subject.id)).data.user).toBeNull();
    expect(await ok(f.service.from("users").select("id").eq("id", subject.id))).toEqual([]);
    expect(await ok(f.service.from("clan_members").select("id").eq("user_id", subject.id))).toEqual([]);
    for (const rows of Object.values(await readPersonal())) expect(rows).toEqual([]);
    for (const [table, row] of [["clan_board_posts", post], ["clan_board_comments", comment], ["clan_hof_comments", hof]] as const)
      expect(await ok(f.service.from(table).select("*").eq("id", row.id).single())).toEqual({ ...row, author_id: null, ...("updated_at" in row ? { updated_at: expect.any(String) } : {}) });
    expect(await ok(f.service.from("clan_notices").select("id,title,content,created_by,updated_by").eq("id", notice.id).single())).toEqual({ id: notice.id, title: notice.title, content: notice.content, created_by: null, updated_by: null });
    expect(await ok(f.service.from("matches").select("*").eq("id", match.id).single())).toEqual({ ...match, created_by: null });
    expect(await ok(f.service.from("match_results").select("winner_team").eq("match_id", match.id).single())).toEqual({ winner_team: 1 });
    expect(await ok(f.service.from("match_players").select("user_id").eq("match_id", match.id))).toEqual([{ user_id: keeper.id }]);
    expect((await readRecords()).find(row => (row.payload as { id: string }).id === correctedId)).toEqual(recordsBefore.find(row => (row.payload as { id: string }).id === correctedId));
    expect(await ok(f.service.from("clans").select("id,name,coin_balance,rules").eq("id", f.clanId).single())).toEqual(clan);
    expect(await ok(f.service.from("users").select("*").eq("id", keeper.id).single())).toEqual(peerBefore);
    expect(await ok(f.service.from("users").select("*").like("email", "qa_%@clansync-qa.local").order("id"))).toEqual(baseline);
    for (const [table, row, actor] of operationRows) {
      const preserved = await ok(f.service.from(table).select("*").eq("id", row.id).single());
      expect(preserved).toMatchObject({ ...row, [actor]: null, ...("updated_at" in row ? { updated_at: expect.any(String) } : {}), ...(table === "balance_rooms" ? { delegated_to: null } : {}) });
      expect(preserved.operator_name).toBe(hostName);
    }
    expect((await ok(f.service.from("balance_rooms").select("delegate_name").eq("id", reservation.id).single())).delegate_name).toBe(hostName);
    expect((await ordinary.rpc("open_balance_room", { p_clan_id: f.clanId, p_room_id: reservation.id })).error).not.toBeNull();
    expect((await ordinary.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_day: "2026-10-02" })).error).not.toBeNull();
    const operatorRecord = (await readRecords()).find(row => (row.payload as { id: string }).id === round.id);
    expect((operatorRecord?.payload as { operator_name: string }).operator_name).toBe(hostName);
    const login = await client.auth.signInWithPassword({ email: subject.email, password: subject.password });
    expect(login.error).not.toBeNull();
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/sign-in/);
    await loginIsolatedBalanceUser(page, keeper);
    await page.goto(f.path.replace(/balance$/, "stats"));
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    await expect(page.getByText("· 운영 " + hostName, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: hostName, exact: true })).toHaveCount(0);
    await info.attach("withdrawal-result", { body: JSON.stringify({ clanWithdrawal: "membership ended; personal assets, records and posts preserved; member-only access denied", operationalRecords: "all former blocking references retained with null account IDs and stable operator text", accountDeletion: "auth, public user, memberships and populated personal tables removed; shared records retained and authors nulled", existingQaAccounts: baseline.length, cleanup: "temporary fixture only" }, null, 2), contentType: "application/json" });
  } finally {
    if (otherClanId) await ok(f.service.from("clans").delete().eq("id", otherClanId));
    await f.cleanup();
  }
  expect(await ok(f.service.from("users").select("id").in("id", [keeper.id, subject.id, observer.id]))).toEqual([]);
  expect(await ok(f.service.from("clans").select("id").in("id", [f.clanId, otherClanId!]))).toEqual([]);
  for (const user of [keeper, subject, observer]) expect((await f.service.auth.admin.getUserById(user.id)).data.user).toBeNull();
});
