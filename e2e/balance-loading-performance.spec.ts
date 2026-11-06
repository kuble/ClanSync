import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { expect, test } from "@playwright/test";
import { createFormation, parseFormationSettings } from "../src/lib/balance/formation";
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
    expect((await fixture.service.from("balance_sessions").update({ roster: roster as unknown as Json,
      formation_state: null, formation_settings: parseFormationSettings({ roles: "manual", teams: "keep" }), formation_revision: round.formation_revision + 1, map_ban_enabled: true,
      ma_snapshot: Object.fromEntries(ids.map(id => [id, { m: 1, a: null }])) }).eq("id", round.id)).error).toBeNull();
    writeFileSync(file, JSON.stringify({ clanId: fixture.clanId, target: "read_balance_analysis_model", mode: "delay", armed: true, remaining: 100, failures: 0, writes: 0 }));
    await page.goto(page.url(), { waitUntil: "commit" });
    await expect.poll(() => state().waiting).toBe(true);
    const panel = page.getByTestId("clan-balance-session-panel");
    const picker = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
    await page.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(picker).toBeVisible();
    await expect(panel).toHaveAttribute("data-score-state", "loading");
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(picker).toBeHidden();
    await page.getByRole("button", { name: "다음 단계", exact: true }).click();
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

test("유형 창은 확정 없이 열고 닫은 뒤 명단을 수정하고 완료할 때 확정한다", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const f = await createIsolatedBalanceFixture(10);
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const member = await context.newPage();
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    const room = await createAndEnterBalanceRoom(page, f.path, "유형 완료 때 확정");
    const round = await f.activeRound(room.roomId);
    const ids = f.users.map(user => user.id);
    const roster: BalanceRoster = { team1: { tank: ids[0], dmg: [ids[1], ids[2]], sup: [ids[3], ids[4]] }, team2: { tank: ids[5], dmg: [ids[6], ids[7]], sup: [ids[8], ids[9]] } };
    const legacy = createFormation(roster, { roles: "manual", teams: "keep" }, max => max - 1,
      { id: ids[0], startedAt: Date.now(), durationMs: 0, roleMode: "manual" });
    delete legacy.settings;
    expect((await f.service.from("balance_sessions").update({ roster: roster as unknown as Json, map_ban_enabled: true,
      formation_state: legacy as unknown as Json,
      map_ban_seconds: 30, hero_ban_enabled: false, formation_settings: parseFormationSettings({ roles: "manual", teams: "keep" }) }).eq("id", round.id)).error).toBeNull();
    await page.goto(room.url);
    const panel = page.locator("#main-content").getByTestId("clan-balance-session-panel");
    await expect(panel.getByTestId("balance-realtime")).toHaveAttribute("data-connection-status", "READY");
    const picker = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "닫기", exact: true }).click();
    await expect.poll(async () => (await f.activeRound(room.roomId)).formation_state).toBeNull();
    await expect(panel.locator('[data-roster-slot="team1:d0"]')).toBeEnabled();
    await loginIsolatedBalanceUser(member, f.users[1]);
    await member.goto(room.url);
    const before = await f.activeRound(room.roomId);
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(picker).toBeVisible();
    expect((await f.activeRound(room.roomId)).formation_state).toBeNull();
    expect((await f.activeRound(room.roomId)).formation_revision).toBe(before.formation_revision);
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "닫기", exact: true }).click();
    const blue = panel.locator('[data-roster-slot="team1:d0"]');
    const red = panel.locator('[data-roster-slot="team2:d0"]');
    await expect(blue).toBeEnabled();
    await blue.click(); await red.click();
    const swapped = structuredClone(roster);
    [swapped.team1.dmg[0], swapped.team2.dmg[0]] = [swapped.team2.dmg[0], swapped.team1.dmg[0]];
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(picker.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await f.activeRound(room.roomId)).formation_state).toBeNull();
    await picker.evaluate(element => element.setAttribute("data-continuous-map-dialog", "true"));
    await picker.getByRole("button", { name: "유형 선택 완료", exact: true }).click();
    const vote = page.getByRole("dialog", { name: "맵 투표", exact: true });
    await expect(vote).toBeVisible({ timeout: 20_000 });
    await expect(vote).toHaveAttribute("data-continuous-map-dialog", "true");
    const saved = await f.activeRound(room.roomId);
    expect(saved.roster).toEqual(swapped);
    expect(saved.formation_state).toMatchObject({ stage: "complete", appliedAt: expect.any(Number), roster: swapped });
    expect(saved.phase).toBe("map_ban");
    await expect(member.getByRole("dialog", { name: "맵 투표", exact: true })).toBeVisible();
  } finally { await context.close(); await f.cleanup(); }
});
