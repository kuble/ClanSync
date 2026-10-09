import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { parseRoster, rosterAssignedUserIds } from "../src/lib/balance/roster-schema";

test.use({ actionTimeout: 20_000 });

test("맵 팝업·배너와 클랜원 목록 네 방향 부착·드래그·되돌리기·자동 저장", async ({ page }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(11);
  try {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await createAndEnterBalanceRoom(page, fixture.path, "목록 배치 검증");
    const initial = await fixture.activeRound();
    expect((await fixture.service.from("balance_sessions").update({ map_ban_enabled: false }).eq("id", initial.id)).error).toBeNull();
    await page.reload();
    const panel = page.getByTestId("clan-balance-session-panel");
    const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "쟁탈", exact: true }).click();
    await picker.getByRole("button", { name: "리장 타워 선택", exact: true }).click();
    await expect(picker).toBeHidden();
    const sidebar = panel.locator("[data-roster-sidebar]");
    const banner = sidebar.getByTestId("balance-editor-map");
    await expect(banner).toContainText("리장 타워");
    await expect(banner.locator("img")).toBeVisible();
    await expect.poll(async () => (await fixture.activeRound()).resolved_map_label).toBe("리장 타워");
    const candidates = panel.getByRole("region", { name: "참가 가능 클랜원", exact: true });
    const board = panel.locator('[aria-label="출전 명단 편집"]');
    const layout = panel.locator("[data-member-position]");
    const handle = candidates.getByRole("button", { name: "클랜원 목록 이동", exact: true });
    const slot = (key: string) => panel.locator(`[data-roster-slot="${key}"]`);
    const member = (index: number) => candidates.getByRole("button", { name: `${fixture.users[index].nickname} 출전 명단에 추가`, exact: true });
    await expect(layout).toHaveAttribute("data-member-position", "left");
    await expect(candidates.getByRole("combobox", { name: "클랜원 목록 위치", exact: true })).toHaveCount(0);
    const gripBox = await handle.boundingBox(), headingBox = await candidates.getByRole("heading", { name: /^클랜원/ }).boundingBox();
    expect(gripBox!.x + gripBox!.width).toBeLessThanOrEqual(headingBox!.x);
    const before = await fixture.activeRound();

    const checkPosition = async (value: string) => {
      await expect(layout).toHaveAttribute("data-member-position", value);
      const listBox = await sidebar.boundingBox(), boardBox = await board.boundingBox();
      if (value === "left") expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(boardBox!.x);
      if (value === "right") expect(boardBox!.x + boardBox!.width).toBeLessThanOrEqual(listBox!.x);
      if (value === "top") expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(boardBox!.y);
      if (value === "bottom") expect(boardBox!.y + boardBox!.height).toBeLessThanOrEqual(listBox!.y);
      if (value === "left" || value === "right") expect(Math.abs(listBox!.height - boardBox!.height)).toBeLessThan(1);
    };
    await checkPosition("left");
    for (const value of ["right", "top", "bottom", "left"]) {
      await handle.scrollIntoViewIfNeeded();
      const grip = await handle.boundingBox();
      await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
      await page.mouse.down();
      await page.mouse.move(grip!.x + grip!.width / 2 + 20, grip!.y + grip!.height / 2 + 20, { steps: 5 });
      const target = panel.locator(`[data-dock-target="${value}"]`);
      await expect(target).toBeVisible();
      await target.scrollIntoViewIfNeeded();
      const drop = await target.boundingBox();
      await page.mouse.move(drop!.x + drop!.width / 2, drop!.y + drop!.height / 2, { steps: 5 });
      await page.mouse.move(drop!.x + drop!.width / 2 + 1, drop!.y + drop!.height / 2 + 1);
      await page.mouse.up();
      await checkPosition(value);
      await expect(panel.locator("[data-dock-target]")).toHaveCount(0);
    }
    expect((await fixture.activeRound()).formation_revision).toBe(before.formation_revision);
    await member(1).dragTo(slot("team2:s1"));
    // Changing a map also flushes any pending roster edit before refreshing.
    await banner.click();
    await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect.poll(async () => (await fixture.activeRound()).resolved_map_label).toBe("부산");
    await expect(slot("team2:s1")).toContainText(fixture.users[1].nickname);
    await expect(member(1)).toHaveCount(0);
    await member(2).dragTo(slot("team2:s1"));
    await expect(slot("team2:s1")).toContainText(fixture.users[2].nickname);
    await expect(member(1)).toBeVisible();
    await panel.getByRole("button", { name: "명단 변경 되돌리기", exact: true }).click();
    await expect(slot("team2:s1")).toContainText(fixture.users[1].nickname);
    await expect(member(2)).toBeVisible();
    await member(2).dragTo(slot("team1:d0"));
    await expect(slot("team1:d0")).toContainText(fixture.users[2].nickname);
    await slot("team1:d0").dragTo(slot("team2:s1"));
    await expect(slot("team2:s1")).toContainText(fixture.users[2].nickname);
    await expect(slot("team1:d0")).toContainText(fixture.users[1].nickname);
    await panel.getByRole("button", { name: "명단 변경 되돌리기", exact: true }).click();
    await expect(slot("team2:s1")).toContainText(fixture.users[1].nickname);
    await slot("team1:d0").press("Delete");
    await expect(member(2)).toBeVisible();
    await panel.getByRole("button", { name: "명단 변경 되돌리기", exact: true }).click();
    await member(3).click();
    await expect(slot("team1:d1")).toContainText(fixture.users[3].nickname);
    await expect.poll(async () => parseRoster((await fixture.activeRound()).roster)).toMatchObject({
      team1: { dmg: [fixture.users[2].id, fixture.users[3].id] },
      team2: { sup: [null, fixture.users[1].id] },
    });
    await page.reload();
    await expect(picker).toBeHidden();
    await expect(banner).toContainText("부산");
    await expect(slot("team2:s1")).toContainText(fixture.users[1].nickname);
    await panel.screenshot({ path: test.info().outputPath("roster-left.png") });
    await handle.press("ArrowRight");
    await checkPosition("right");
    await panel.screenshot({ path: test.info().outputPath("roster-right.png") });
    await handle.press("ArrowDown");
    await checkPosition("bottom");
    await page.setViewportSize({ width: 390, height: 844 });
    await handle.click();
    await panel.getByRole("button", { name: "클랜원 목록 왼쪽에 부착", exact: true }).click();
    const search = candidates.getByRole("textbox", { name: "참가자 닉네임 검색", exact: true });
    await search.fill(fixture.users[0].nickname);
    await expect(member(0)).toBeVisible();
    await member(0).click();
    await expect(slot("team1:tank")).toContainText(fixture.users[0].nickname);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await panel.screenshot({ path: test.info().outputPath("roster-mobile.png") });
    await expect.poll(async () => parseRoster((await fixture.activeRound()).roster).team1.tank).toBe(fixture.users[0].id);
    await page.setViewportSize({ width: 1440, height: 1200 });
    await search.fill("");
    for (let index = 4; index < 10; index++) await member(index).click();
    await member(10).dragTo(slot("team2:s1"));
    await expect(slot("team2:s1")).toContainText(fixture.users[10].nickname);
    await expect(member(1)).toBeVisible();
    await member(1).click();
    await slot("team1:tank").click();
    await expect(slot("team1:tank")).toContainText(fixture.users[1].nickname);
    await expect(member(0)).toBeVisible();
    await panel.getByRole("button", { name: "명단 변경 되돌리기", exact: true }).click();
    await expect.poll(async () => {
      const saved = parseRoster((await fixture.activeRound()).roster);
      return { ids: rosterAssignedUserIds(saved).sort(), replacement: saved.team2.sup[1] };
    }).toEqual({ ids: fixture.users.filter((_, index) => index !== 1).map((user) => user.id).sort(), replacement: fixture.users[10].id });
    await checkPosition("left");
    // No available members: the side panel still matches the participant list.
    expect((await fixture.service.from("clan_members").delete().eq("clan_id", fixture.clanId).eq("user_id", fixture.users[1].id)).error).toBeNull();
    await page.reload();
    await expect(candidates).toContainText("출전 명단에 추가할 클랜원이 없습니다.");
    await checkPosition("left");
  } finally { await fixture.cleanup(); }
});
