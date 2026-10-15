import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { participantRecommendation, participantSearchName } from "../src/lib/clan/participant-records";

const nil = null as unknown as string;
async function ok<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query; expect(error, error?.message).toBeNull(); return data;
}

test("join approval recommends BattleTag candidates, searches old names, links records and can unlink", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(4);
  const base = f.path.replace(/\/balance$/, "");
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  try {
    const leader = await f.memberClient(0);
    await ok(f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    f.users[2].nickname = "AIMZERO";
    await ok(f.service.from("users").update({ birth_year: 1998, gender: "female" }).eq("id", f.users[2].id));
    await ok(f.service.from("users").update({ birth_year: 2001, gender: "undisclosed" }).eq("id", f.users[3].id));
    await ok(f.service.from("user_game_profiles").update({ battle_tag: `AIMZERO#${String(Date.now()).slice(-8)}` }).eq("game_id", f.gameId).eq("user_id", f.users[2].id));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(`${base}/manage?tab=members`);
    for (const [name, title] of [
      [`${f.users[0].nickname} 이전 기록 관리`, "이전 기록 연결"],
      [`${f.users[1].nickname} 멤버로 강등`, "멤버로 강등"],
      [`${f.users[3].nickname} 운영진 승격`, "운영진 승격"],
      [`${f.users[3].nickname} 강퇴`, "강퇴"],
      ["미가입 참가자 추가", "미가입 참가자 추가"],
    ]) {
      const button = page.getByRole("button", { name, exact: true });
      await expect(button).toHaveText("");
      await expect(button.locator("svg")).toHaveCount(1);
      await expect(button).toHaveAttribute("title", title);
    }
    await page.getByRole("button", { name: "미가입 참가자 추가", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "미가입 참가자 추가", exact: true });
    await expect(dialog.getByRole("textbox")).toHaveCount(1);
    await dialog.getByLabel("인게임 닉네임").fill("AIMZERO");
    await dialog.getByRole("button", { name: "참가자 추가", exact: true }).click();
    await expect(dialog).toBeHidden();
    const first = (await ok(f.service.from("clan_participants").select("id,alias").eq("clan_id", f.clanId).eq("nickname", "AIMZERO").single()))!;
    expect(first.alias).toBeNull();
    const edit = page.getByRole("button", { name: "AIMZERO 닉네임 수정", exact: true });
    await expect(edit).toHaveText("");
    await expect(edit.locator("svg")).toHaveCount(1);
    await edit.click();
    const editor = page.getByRole("dialog", { name: "참가자 닉네임 수정", exact: true });
    await expect(editor.getByLabel("인게임 닉네임")).toHaveValue("AIMZERO");
    await editor.getByRole("button", { name: "취소", exact: true }).click();
    const duplicate = (await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nil, p_nickname: "aimzero", p_alias: nil })))!;
    const renamed = (await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nil, p_nickname: "오래전이름", p_alias: nil })))!;
    const record = async (guest: string, day: string, opponent = f.users[0].id) => ok(f.service.rpc("edit_clan_match_record", {
      p_clan_id: f.clanId, p_actor_id: f.users[0].id, p_id: nil, p_operation: "create", p_revision: nil,
      p_record: { playedAt: `${day}T10:00:00Z`, occurredAt: `${day}T10:00:00Z`, mapLabel: "부산", outcome: "team1", players: [{ userId: guest, team: 1, role: "tank" }, { userId: opponent, team: 2, role: "tank" }] },
    }));
    await record(first.id, "2026-09-01");
    await record(duplicate, "2026-09-02");
    await record(duplicate, "2026-09-03");
    await record(renamed, "2026-08-01");
    const coins = await ok(f.service.from("users").select("id,coin_balance").in("id", f.users.map((u) => u.id)).order("id"));
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).in("user_id", [f.users[2].id, f.users[3].id]));
    const requests = (await ok(f.service.from("clan_join_requests").insert([2, 3].map((i) => ({ clan_id: f.clanId, game_id: f.gameId, user_id: f.users[i].id, message: "가입 승인 회귀" }))).select("id,user_id")))!;
    const request = requests.find((r) => r.user_id === f.users[2].id)!;
    const other = requests.find((r) => r.user_id === f.users[3].id)!;
    await page.goto(`${base}/manage?tab=requests`);
    const requestCard = page.getByRole("listitem").filter({ has: page.getByTestId(`manage-join-approve-${request.id}`) });
    await expect(requestCard).toContainText("여성 · 1998년생");
    await page.getByTestId(`manage-join-approve-${request.id}`).click();
    dialog = page.getByRole("dialog", { name: "클랜 가입 승인", exact: true });
    await expect(dialog).toContainText("AIMZERO#");
    await expect(dialog).toContainText("여성 · 1998년생");
    const candidates = dialog.locator("[data-participant-candidate]");
    await expect(candidates).toHaveCount(0);
    await expect(dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "가입 승인", exact: true })).toBeDisabled();
    await expect(dialog.getByText("추천 기록 있음", { exact: true })).toBeVisible();
    await dialog.getByRole("radio", { name: "이전 기록 연결", exact: true }).click();
    await expect(candidates).toHaveCount(3);
    await expect(dialog.getByRole("radio", { name: "연결 없이 가입", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "이전", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toHaveCount(0);
    await expect(candidates.filter({ hasText: "추천" })).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: "연결 후 가입 승인", exact: true })).toBeDisabled();
    await expect(dialog.locator('input[type="radio"]:checked')).toHaveCount(0);
    await dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true }).fill("오래전");
    await expect(candidates).toHaveCount(1);
    await expect(candidates).toContainText("1경기 · 최근 2026-08-01");
    await dialog.getByText("최근 경기 확인", { exact: true }).click();
    await expect(dialog.getByText("2026-08-01 · 부산", { exact: true })).toBeVisible();
    await dialog.getByRole("radio", { name: "오래전이름 기록 선택", exact: true }).check();
    await expect(dialog.getByRole("button", { name: "연결 후 가입 승인", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "이전", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "가입 승인", exact: true })).toBeDisabled();
    await dialog.getByRole("radio", { name: "연결 없이 가입", exact: true }).check();
    await expect(candidates).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "가입 승인", exact: true })).toBeEnabled();
    await dialog.getByRole("radio", { name: "이전 기록 연결", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "연결 후 가입 승인", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true })).toHaveValue("");
    await dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true }).fill("오래전");
    await dialog.getByRole("radio", { name: "오래전이름 기록 선택", exact: true }).check();
    await dialog.screenshot({ path: info.outputPath("join-record-search.png") });
    await dialog.getByRole("button", { name: "연결 후 가입 승인", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect((await ok(f.service.from("clan_members").select("status").eq("clan_id", f.clanId).eq("user_id", f.users[2].id).single()))!.status).toBe("active");
    expect((await ok(f.service.from("clan_participants").select("user_id").eq("id", renamed).single()))!.user_id).toBe(f.users[2].id);
    expect((await ok(leader.rpc("list_clan_guest_records", { p_clan_id: f.clanId })))!.find((r) => r.id === renamed)?.played).toBe(1);
    await page.getByTestId(`manage-join-approve-${other.id}`).click();
    dialog = page.getByRole("dialog", { name: "클랜 가입 승인", exact: true });
    await expect(dialog).toContainText("성별 비공개 · 2001년생");
    await dialog.getByRole("radio", { name: "연결 없이 가입", exact: true }).check();
    await dialog.getByRole("button", { name: "가입 승인", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect((await ok(f.service.from("clan_participants").select("user_id").eq("id", duplicate).single()))!.user_id).toBeNull();
    await record(f.users[2].id, "2026-10-01");
    await page.goto(`${base}/manage?tab=members`);
    const guests = page.getByRole("region", { name: "내전 참가자 명부", exact: true });
    const oldRecord = guests.locator(`[data-guest-record="${renamed}"]`);
    await expect(guests.locator("[data-guest-record]")).toHaveCount(2);
    await expect(oldRecord).toHaveCount(0);
    await guests.getByRole("textbox", { name: "참가자 명부 검색", exact: true }).fill("오래전");
    await expect(guests.getByText("조건에 맞는 참가자가 없습니다.", { exact: true })).toBeVisible();
    await guests.getByRole("textbox", { name: "참가자 명부 검색", exact: true }).fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: `${f.users[2].nickname} 이전 기록 관리`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "이전 내전 기록", exact: true });
    await expect(dialog.getByRole("region", { name: "연결된 이전 기록" })).toContainText("오래전이름");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole("button", { name: "연결 해제", exact: true }).click();
    await page.getByRole("dialog", { name: "이전 기록 연결을 해제할까요?", exact: true }).getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(oldRecord).toContainText("오래전이름");
    await expect(oldRecord.getByRole("button", { name: "오래전이름 닉네임 수정", exact: true })).toBeVisible();
    const summary = (await ok(f.service.rpc("read_clan_stats_summary", { p_clan_id: f.clanId, p_periods: ["all"] }))) as unknown as { periods: { all: { players: { userId: string; played: number }[] } } };
    expect(summary.periods.all.players.find((p) => p.userId === renamed)?.played).toBe(1);
    expect(summary.periods.all.players.find((p) => p.userId === f.users[2].id)?.played).toBe(1);
    await page.getByRole("button", { name: `${f.users[2].nickname} 이전 기록 관리`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "이전 내전 기록", exact: true });
    await dialog.getByRole("textbox", { name: "기존 참가자 검색", exact: true }).fill("오래전");
    await dialog.getByRole("radio", { name: "오래전이름 기록 선택", exact: true }).check();
    await dialog.getByRole("button", { name: "이 기록 연결", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(oldRecord).toHaveCount(0);
    expect(await ok(f.service.from("users").select("id,coin_balance").in("id", f.users.map((u) => u.id)).order("id"))).toEqual(coins);
    await page.goto("/games");
    expect(browserErrors).toEqual([]);
  } finally { await f.cleanup(); }
});

test("join linking is atomic, scoped and staff-only even with stale or simultaneous selections", async () => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(3);
  try {
    expect(participantRecommendation("ＡＩＭＺＥＲＯ", "다른이름", "aimzero#1234")).toBe(2);
    expect(participantRecommendation("옛이름", "새이름", "new#1234")).toBe(0);
    expect(participantSearchName("Aim Zero#5678")).toBe("aimzero");
    const leader = await f.memberClient(0), member = await f.memberClient(1), outsider = await f.memberClient(2);
    const guest = (await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nil, p_nickname: "중복", p_alias: nil })))!;
    await ok(leader.rpc("save_clan_participant", { p_clan_id: f.clanId, p_id: nil, p_nickname: "중복", p_alias: nil }));
    await ok(f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    const request = (await ok(f.service.from("clan_join_requests").insert({ clan_id: f.clanId, game_id: f.gameId, user_id: f.users[2].id }).select("id").single()))!;
    expect((await member.rpc("list_clan_guest_records", { p_clan_id: f.clanId })).error?.code).toBe("42501");
    expect((await outsider.rpc("approve_clan_join_with_participant", { p_clan_id: f.clanId, p_request_id: request.id, p_participant_id: guest })).error?.code).toBe("42501");
    expect((await member.rpc("link_clan_participant", { p_clan_id: f.clanId, p_user_id: f.users[1].id, p_participant_id: guest })).error?.code).toBe("42501");
    expect((await member.rpc("unlink_clan_participant", { p_clan_id: f.clanId, p_participant_id: guest })).error?.code).toBe("42501");
    const invalid = await leader.rpc("approve_clan_join_with_participant", { p_clan_id: f.clanId, p_request_id: request.id, p_participant_id: randomUUID() });
    expect(invalid.error?.code).toBe("PT409");
    expect((await ok(f.service.from("clan_join_requests").select("status").eq("id", request.id).single()))!.status).toBe("pending");
    expect(await ok(f.service.from("clan_members").select("id").eq("clan_id", f.clanId).eq("user_id", f.users[2].id))).toEqual([]);
    const attempts = await Promise.all([1, 2].map(() => leader.rpc("approve_clan_join_with_participant", { p_clan_id: f.clanId, p_request_id: request.id, p_participant_id: guest })));
    expect(attempts.filter((a) => !a.error)).toHaveLength(1);
    expect(attempts.filter((a) => a.error?.code === "PT409")).toHaveLength(1);
    expect((await leader.rpc("link_clan_participant", { p_clan_id: f.clanId, p_user_id: f.users[1].id, p_participant_id: guest })).error?.code).toBe("PT409");
    expect((await leader.rpc("link_clan_participant", { p_clan_id: randomUUID(), p_user_id: f.users[1].id, p_participant_id: guest })).error?.code).toBe("42501");
    await ok(leader.rpc("unlink_clan_participant", { p_clan_id: f.clanId, p_participant_id: guest }));
    const audit = (await ok(leader.from("clan_participant_links").select("status,reviewed_by,revoked_by").eq("participant_id", guest).single()))!;
    expect(audit).toEqual({ status: "revoked", reviewed_by: f.users[0].id, revoked_by: f.users[0].id });
  } finally { await f.cleanup(); }
});
