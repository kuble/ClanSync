import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { expect, test } from "@playwright/test";
import { createFormation, advanceFormation } from "../src/lib/balance/formation";
import type { BalanceRoster } from "../src/lib/balance/roster-schema";
import type { Json } from "../src/lib/supabase/database.types";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("점수 조회가 대기 중이어도 맵 유형 창은 열고 선택·재열기를 유지한다", async ({ page }) => {
  test.setTimeout(90_000);
  const file = process.env.CLANSYNC_E2E_DB_FAULT_FILE;
  if (!file || !resolve(file).startsWith(resolve(".local-tests", "runs") + sep) || basename(file) !== "db-fault.json") throw new Error("전용 로컬 검사 실행기가 필요합니다.");
  const fixture = await createIsolatedBalanceFixture(10);
  const state = () => JSON.parse(readFileSync(file, "utf8"));
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "느린 점수 조회 확인");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.map(user => user.id);
    const roster: BalanceRoster = { team1: { tank: ids[0], dmg: [ids[1], ids[2]], sup: [ids[3], ids[4]] }, team2: { tank: ids[5], dmg: [ids[6], ids[7]], sup: [ids[8], ids[9]] } };
    const keep = (max: number) => max - 1;
    const formation = advanceFormation(createFormation(roster, { roles: "manual", teams: "keep" }, keep), { type: "apply" }, { id: ids[0], manager: true }, Date.now(), keep);
    expect((await fixture.service.from("balance_sessions").update({ roster: roster as unknown as Json,
      formation_state: formation as unknown as Json, formation_revision: round.formation_revision + 1, map_ban_enabled: true,
      ma_snapshot: Object.fromEntries(ids.map(id => [id, { m: 1, a: null }])) }).eq("id", round.id)).error).toBeNull();
    writeFileSync(file, JSON.stringify({ clanId: fixture.clanId, target: "read_balance_analysis_model", mode: "delay", armed: true, remaining: 100, failures: 0, writes: 0 }));
    await page.goto(page.url(), { waitUntil: "commit" });
    await expect.poll(() => state().waiting).toBe(true);
    const panel = page.getByTestId("clan-balance-session-panel");
    const picker = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
    await expect(picker).toBeVisible();
    await expect(panel).toHaveAttribute("data-score-state", "loading");
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(picker).toBeHidden();
    await page.getByRole("button", { name: "맵 유형 선택", exact: true }).click();
    await expect(picker.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(state().resume).toBeUndefined();
    writeFileSync(file, JSON.stringify({ ...state(), resume: true }));
    await expect(panel).toHaveAttribute("data-score-state", "ready");
    await expect(picker.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await fixture.activeRound(room.roomId)).formation_revision).toBe(round.formation_revision + 1);
  } finally {
    try { unlinkSync(file); } catch {}
    await fixture.cleanup();
  }
});

test("편성 저장 응답으로 창을 열고 늦은 재조회·멤버 요청에도 확정 상태를 유지한다", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const member = await memberContext.newPage();
  let releaseRefresh: () => void = () => {};
  const heldRefresh = new Promise<void>(resolve => { releaseRefresh = resolve; });
  let oldResponseBuffered = false;
  let holding = true;
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "저장 응답으로 편성 확정");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.map(user => user.id);
    const roster: BalanceRoster = { team1: { tank: ids[0], dmg: [ids[1], ids[2]], sup: [ids[3], ids[4]] }, team2: { tank: ids[5], dmg: [ids[6], ids[7]], sup: [ids[8], ids[9]] } };
    expect((await fixture.service.from("balance_sessions").update({ roster: roster as unknown as Json,
      map_ban_enabled: true, hero_ban_enabled: false, formation_settings: { roles: "manual", teams: "keep" },
      ma_snapshot: Object.fromEntries(ids.map(id => [id, { m: 1, a: null }])) }).eq("id", round.id)).error).toBeNull();
    await page.goto(room.url);
    const panel = page.locator("#main-content").getByTestId("clan-balance-session-panel");
    await expect(panel).toHaveAttribute("data-score-state", "ready");
    await expect(panel.getByTestId("balance-realtime")).toHaveAttribute("data-connection-status", "READY");
    await loginIsolatedBalanceUser(member, fixture.users[1]);
    await member.goto(room.url);
    const memberPanel = member.locator("#main-content").getByTestId("clan-balance-session-panel");
    await expect(memberPanel.getByTestId("balance-realtime")).toHaveAttribute("data-connection-status", "READY");
    await page.route("**/balance?*", async route => {
      if (!holding || route.request().method() !== "GET") return route.continue();
      if (!oldResponseBuffered) {
        const response = await route.fetch();
        oldResponseBuffered = true;
        await heldRefresh;
        await route.fulfill({ response });
      } else {
        await heldRefresh;
        await route.continue();
      }
    });
    expect((await fixture.service.from("balance_rooms").update({ title: "이전 화면 응답 보류" }).eq("id", room.roomId)).error).toBeNull();
    await expect.poll(() => oldResponseBuffered, { timeout: 20_000 }).toBe(true);
    const actionRequest = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === new URL(room.url).pathname);
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
    await expect(picker).toBeVisible();
    const request = await actionRequest;
    const response = await request.response();
    if (!response) throw new Error("편성 저장 응답이 없습니다.");
    expect(response.headers()["x-action-revalidated"]).toBeUndefined();
    const saved = await fixture.activeRound(room.roomId);
    expect(await response.text()).toContain(`"revision":${saved.formation_revision}`);
    expect(saved.formation_state).toMatchObject({ stage: "complete", appliedAt: expect.any(Number), roster });
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    holding = false;
    releaseRefresh();
    await expect(panel.getByTestId("balance-room-title").locator("h2")).toHaveText("이전 화면 응답 보류");
    await expect(picker.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(memberPanel.getByRole("region", { name: "경기 준비", exact: true })).toBeVisible();
    await expect(member.getByRole("dialog", { name: "맵 유형 선택", exact: true })).toHaveCount(0);
    const rejected = await member.evaluate(async ({ url, body, action }) => {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", "Next-Action": action }, body });
      return response.text();
    }, { url: room.url, body: request.postData()!, action: request.headers()["next-action"] });
    expect(rejected).toContain("운영진만");
    expect(rejected).not.toContain('"confirmedFormation"');
    expect((await fixture.activeRound(room.roomId)).formation_revision).toBe(saved.formation_revision);
  } finally {
    holding = false;
    releaseRefresh();
    await memberContext.close();
    await fixture.cleanup();
  }
});
