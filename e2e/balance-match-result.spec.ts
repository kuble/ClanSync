import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("경기 결과: 팀 영역 왕관·선택 변경·명시적 확정·무승부·무효·멤버 권한", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "결과 선택 검증");
    const ids = fixture.users.map((user) => user.id);
    const roster = { team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) }, team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const member = await memberContext.newPage();
    await loginIsolatedBalanceUser(member, fixture.users[1]);
    const panel = page.getByTestId("clan-balance-session-panel");
    for (const outcome of ["team1", "team2", "draw", "void"] as const) {
      const active = await fixture.activeRound(room.roomId);
      expect((await fixture.service.from("balance_sessions").update({ roster, map_ban_enabled: false, hero_ban_enabled: false, formation_settings: { roles: "manual", teams: "keep" } }).eq("id", active.id)).error).toBeNull();
      await page.reload();
      const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
      await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
      await expect(picker).toBeHidden();
      await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
      await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 20_000 });
      const result = panel.getByTestId("balance-match-result");
      const confirm = result.getByRole("button", { name: "결과 확정", exact: true });
      await expect(confirm).toBeDisabled();
      await result.locator('[data-board-slot="team1:d0"]').click();
      await expect(result.getByRole("button", { name: "블루 승", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(result.locator("svg.lucide-crown")).toHaveCount(1);
      expect((await fixture.activeRound(room.roomId)).match_outcome).toBe("pending");
      await result.locator('[data-board-slot="team2:d0"]').click();
      await expect(result.getByRole("button", { name: "블루 승", exact: true })).toHaveAttribute("aria-pressed", "false");
      await expect(result.getByRole("button", { name: "레드 승", exact: true })).toHaveAttribute("aria-pressed", "true");
      if (outcome === "team1") await result.getByRole("button", { name: "블루 승", exact: true }).click();
      if (outcome === "draw" || outcome === "void") {
        await result.getByRole("button", { name: outcome === "draw" ? "무승부" : "무효 · 재경기", exact: true }).click();
        await expect(result.locator("svg.lucide-crown")).toHaveCount(0);
        await expect(result.locator(outcome === "draw" ? "svg.lucide-equal" : "svg.lucide-rotate-ccw")).toHaveCount(2);
      }
      await member.goto(room.url);
      const memberPanel = member.getByTestId("clan-balance-session-panel");
      await expect(memberPanel.getByTestId("balance-match-result")).toHaveCount(0);
      await expect(memberPanel.getByRole("button", { name: "결과 확정", exact: true })).toHaveCount(0);
      if (outcome === "void") {
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      if (outcome === "team1") {
        const actionPath = "**/balance?room=*";
        await page.route(actionPath, async (route) => {
          if (route.request().method() === "POST" && route.request().postData()?.includes(active.id) && route.request().postData()?.includes('"team1"')) await route.abort("failed");
          else await route.continue();
        });
        await confirm.click();
        await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText("결과를 저장하지 못했습니다");
        expect((await fixture.activeRound(room.roomId)).match_outcome).toBe("pending");
        await expect(result.locator("svg.lucide-crown")).toHaveCount(1);
        await page.unroute(actionPath);
      }
      await confirm.click();
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).match_outcome).toBe(outcome);
      await expect(panel.getByTestId("balance-match-result")).toHaveCount(0);
      if (outcome === "team1" || outcome === "team2") await expect(panel.getByLabel(outcome === "team1" ? "1팀 승리" : "2팀 승리", { exact: true })).toBeVisible();
      if (outcome === "void") {
        await panel.screenshot({ path: test.info().outputPath("match-result-void-mobile.png") });
        await panel.getByRole("button", { name: "내전 기록", exact: true }).click();
        const history = page.getByRole("dialog", { name: "내전 기록", exact: true });
        await expect(history.locator("tbody tr").filter({ hasText: fixture.users[0].nickname })).toContainText("1/1/1");
        await page.keyboard.press("Escape");
      } else {
        await panel.getByRole("button", { name: "다음 경기", exact: true }).click();
        await expect(panel).toHaveAttribute("data-balance-phase", "editing");
      }
    }
  } finally { await memberContext.close(); await fixture.cleanup(); }
});
