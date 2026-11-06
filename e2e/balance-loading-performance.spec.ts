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
