import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

function faultFile() {
  const file = process.env.CLANSYNC_E2E_DB_FAULT_FILE;
  if (!file || !resolve(file).startsWith(resolve(".local-tests", "runs") + sep) || basename(file) !== "db-fault.json")
    throw new Error("Run through npm run test:e2e for the isolated DB fault fixture");
  return file;
}
function state() { return JSON.parse(readFileSync(faultFile(), "utf8")); }
function setFault(clanId: string, remaining: number, mode = "fail", target = "select_my_clan_membership") {
  writeFileSync(faultFile(), JSON.stringify({ clanId, remaining, mode, target, armed: false, writes: 0, mutationRequests: 0, failures: 0 }));
}
function changeFault(change: Record<string, unknown>) { writeFileSync(faultFile(), JSON.stringify({ ...state(), ...change })); }
function clearFault() { try { unlinkSync(faultFile()); } catch {} }
async function editor(page: Page, fixture: Awaited<ReturnType<typeof createIsolatedBalanceFixture>>) {
  await loginIsolatedBalanceUser(page, fixture.users[0]);
  await page.goto(fixture.path.replace(/balance$/, "stats"));
  await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
  await page.getByRole("button", { name: "기록 추가", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "경기 기록 추가", exact: true });
  await dialog.getByLabel("내전 날짜", { exact: true }).fill("2026-01-10");
  await dialog.getByLabel("경기 시간 (한국 시간)", { exact: true }).fill("2026-01-10T20:00");
  await dialog.getByLabel("경기 맵", { exact: true }).fill("부산");
  await dialog.getByLabel("1팀 1번 출전자", { exact: true }).selectOption(fixture.users[0].id);
  await dialog.getByLabel("2팀 1번 출전자", { exact: true }).selectOption(fixture.users[1].id);
  return dialog;
}

test("committed record survives a transient membership 502 and refreshes without a second write", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(2);
  try {
    const dialog = await editor(page, f);
    setFault(f.clanId, 1);
    await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(state()).toMatchObject({ failures: 1, writes: 1, mutationRequests: 1 });
    const records = await f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_day: "2026-01-10" });
    expect(records.error).toBeNull(); expect(records.data).toHaveLength(1);
    await expect(page.getByRole("region", { name: "경기 상세", exact: true })).toContainText("부산");
  } finally { clearFault(); await f.cleanup(); }
});

for (const target of ["select_my_clan_membership", "read_clan_stats_records"]) {
  test(`committed record recovers from persistent ${target} failure with read-only retry`, async ({ page }) => {
    const f = await createIsolatedBalanceFixture(2);
    try {
      const dialog = await editor(page, f);
      setFault(f.clanId, 100, "fail", target);
      await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText("기록은 저장되었습니다. 최신 목록을 불러오지 못했습니다.");
      await expect(dialog.getByLabel("경기 맵", { exact: true })).toBeDisabled();
      await expect(dialog.getByRole("button", { name: "기록 저장", exact: true })).toHaveCount(0);
      expect(state()).toMatchObject({ failures: 2, writes: 1, mutationRequests: 1 });
      changeFault({ remaining: 0 });
      await dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true }).click();
      await expect(dialog).toBeHidden();
      expect(state()).toMatchObject({ writes: 1, mutationRequests: 1 });
      const records = await f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_day: "2026-01-10" });
      expect(records.error).toBeNull(); expect(records.data).toHaveLength(1);
      await expect(page.getByRole("region", { name: "경기 상세", exact: true })).toContainText("부산");
    } finally { clearFault(); await f.cleanup(); }
  });
}

test("read-only recovery respects permission revocation after commit and restoration", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(2);
  try {
    const dialog = await editor(page, f);
    const settings = await f.service.from("clan_settings").select("permissions").eq("clan_id", f.clanId).single();
    expect(settings.error).toBeNull();
    setFault(f.clanId, 0, "pause");
    await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect.poll(() => state().armed).toBe(true);
    const revoked = await f.service.from("clan_settings").update({ permissions: { view_match_records: [] } }).eq("clan_id", f.clanId);
    expect(revoked.error).toBeNull();
    changeFault({ resume: true });
    await expect(dialog.getByRole("alert")).toHaveText("기록은 저장됐지만 현재 조회 권한이 없습니다.");
    const [denied] = await Promise.all([
      page.waitForResponse(response => response.request().method() === "POST" && !!response.request().headers()["next-action"]),
      dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true }).click(),
    ]);
    await expect(dialog.getByRole("alert")).toHaveText("기록은 저장됐지만 현재 조회 권한이 없습니다.");
    const deniedBody = await denied.text();
    expect(deniedBody).toContain('"ok":false');
    expect(deniedBody).not.toContain("sampleByDate");
    await expect(dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true })).toBeEnabled();
    const restored = await f.service.from("clan_settings").update({ permissions: settings.data!.permissions }).eq("clan_id", f.clanId);
    expect(restored.error).toBeNull();
    await dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(state()).toMatchObject({ writes: 1, mutationRequests: 1, failures: 0 });
    await expect(page.getByRole("region", { name: "경기 상세", exact: true })).toContainText("부산");
  } finally { clearFault(); await f.cleanup(); }
});

test("a committed deletion retries only its read and keeps the day summary empty", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(2);
  try {
    const creation = await editor(page, f);
    await creation.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(creation).toBeHidden();
    const detail = page.getByRole("region", { name: "경기 상세", exact: true });
    await detail.getByRole("button", { name: "기록 제거", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "경기 기록 제거", exact: true });
    setFault(f.clanId, 100);
    await dialog.getByRole("button", { name: "기록 제거", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("기록은 저장되었습니다.");
    await expect(dialog.getByRole("button", { name: "기록 제거", exact: true })).toHaveCount(0);
    changeFault({ remaining: 0 });
    await dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(state()).toMatchObject({ writes: 1, mutationRequests: 1, failures: 2 });
    const records = await f.service.rpc("read_clan_stats_records", { p_clan_id: f.clanId, p_day: "2026-01-10" });
    expect(records.error).toBeNull(); expect(records.data).toHaveLength(0);
    await expect(detail).toContainText("이 날짜에는 기록된 경기가 없습니다.");
  } finally { clearFault(); await f.cleanup(); }
});

test("read-only recovery refuses an expired login without repeating the committed write", async ({ page }) => {
  const f = await createIsolatedBalanceFixture(2);
  try {
    const dialog = await editor(page, f);
    setFault(f.clanId, 100);
    await dialog.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("기록은 저장되었습니다.");
    changeFault({ remaining: 0 });
    await page.context().clearCookies();
    await dialog.getByRole("button", { name: "기록 다시 불러오기", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("기록을 조회하려면 다시 로그인하십시오.");
    expect(state()).toMatchObject({ writes: 1, mutationRequests: 1, failures: 2 });
  } finally { clearFault(); await f.cleanup(); }
});
