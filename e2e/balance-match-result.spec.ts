import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

test("경기 결과: 팀 전체 강조·확인 팝업·직접 점수 편집·무승부·무효·멤버 권한", async ({ page, browser }) => {
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
      await expect(result.getByRole("button", { name: "결과 확정", exact: true })).toHaveCount(0);
      const dialog = page.getByRole("dialog", { name: /로 확정할까요\?/ });
      const confirm = dialog.getByRole("button", { name: "확정", exact: true });
      const blue = result.getByRole("button", { name: "1팀 승리 선택", exact: true });
      await blue.hover();
      await expect(result.getByTestId("balance-team-team1")).not.toHaveCSS("box-shadow", "none");
      await expect(result.locator('[data-board-slot="team1:d0"]')).toHaveCSS("box-shadow", "none");
      if (outcome === "team1") {
        await expect(panel.getByRole("button", { name: "점수 조정", exact: true })).toHaveCount(0);
        const scoreButton = result.getByRole("button", { name: `${fixture.users[1].nickname} 평가 점수 수정`, exact: true });
        await expect(scoreButton).not.toContainText("점");
        await scoreButton.click();
        await expect(dialog).toHaveCount(0);
        const input = result.getByRole("textbox", { name: `${fixture.users[1].nickname} 평가 점수`, exact: true });
        await expect(input).toHaveAttribute("type", "text");
        await expect(input).toHaveAttribute("inputmode", "decimal");
        await expect(result.getByTestId("balance-team-team1")).not.toHaveCSS("box-shadow", / 2px(?:,|$)/);
        const beforeOutside = (await fixture.activeRound(room.roomId)).ma_snapshot;
        await input.fill("4");
        await input.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await expect(input).toBeFocused();
        for (const target of ["2팀 승리 선택", `${fixture.users[6].nickname} 평가 점수 수정`, "무승부", "내전 기록 열기", "승부예측"]) {
          const outside = page.getByRole("button", { name: target, exact: true, includeHidden: true });
          const bounds = (await outside.boundingBox())!;
          await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          await expect(page.getByRole("dialog", { name: "내전 기록", exact: true })).toHaveCount(0);
          await expect(page.getByRole("dialog", { name: "승부예측", exact: true })).toHaveCount(0);
          await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          await expect(input).toBeHidden();
          await expect(scoreButton).toBeFocused();
          await expect(result.getByRole("textbox")).toHaveCount(0);
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole("dialog", { name: "내전 기록", exact: true })).toHaveCount(0);
          await expect(page.getByRole("dialog", { name: "승부예측", exact: true })).toHaveCount(0);
          expect((await fixture.activeRound(room.roomId)).ma_snapshot).toEqual(beforeOutside);
          expect((await fixture.activeRound(room.roomId)).match_outcome).toBe("pending");
          await scoreButton.click();
          await expect(input).toBeVisible();
        }
        await input.fill("10.1");
        await result.getByRole("button", { name: `${fixture.users[1].nickname} 점수 저장`, exact: true }).click();
        await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText("-10부터 10");
        await input.fill("-10");
        await input.press("Enter");
        await expect.poll(async () => (await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({ [ids[1]]: { m: -10 } });
        await expect(scoreButton).toHaveText("-10");
        await scoreButton.click();
        await input.fill("4");
        await input.press("Escape");
        await expect(scoreButton).toHaveText("-10");
        const nextScore = result.getByRole("button", { name: `${fixture.users[6].nickname} 평가 점수 수정`, exact: true });
        await nextScore.click();
        await result.getByRole("textbox", { name: `${fixture.users[6].nickname} 평가 점수`, exact: true }).fill("10");
        await result.getByRole("button", { name: `${fixture.users[6].nickname} 점수 저장`, exact: true }).click();
        await expect.poll(async () => (await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({ [ids[1]]: { m: -10 }, [ids[6]]: { m: 10 } });
        const bannerBounds = (await panel.getByTestId("balance-match-map").boundingBox())!;
        const predictionBounds = (await panel.getByRole("button", { name: "승부예측", exact: true }).boundingBox())!;
        const historyBounds = (await panel.getByRole("button", { name: "내전 기록 열기", exact: true }).boundingBox())!;
        expect(bannerBounds.x).toBeLessThan(predictionBounds.x);
        expect(predictionBounds.y).toBeGreaterThan(historyBounds.y + historyBounds.height);
        expect(Math.abs(predictionBounds.x - historyBounds.x)).toBeLessThan(2);
        const end = result.getByRole("button", { name: "세션 종료", exact: true });
        await expect(end).toBeDisabled();
        const endBounds = (await end.boundingBox())!;
        const drawBounds = (await result.getByRole("button", { name: "무승부", exact: true }).boundingBox())!;
        expect(Math.abs((endBounds.y + endBounds.height / 2) - (drawBounds.y + drawBounds.height / 2))).toBeLessThan(3);
        await page.setViewportSize({ width: 390, height: 844 });
        await scoreButton.click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await result.getByRole("button", { name: `${fixture.users[1].nickname} 점수 취소`, exact: true }).click();
        await page.setViewportSize({ width: 1211, height: 1272 });
      }
      await blue.click();
      await expect(dialog).toBeVisible();
      await expect(result.locator('[aria-label="블루 승"]')).toHaveAttribute("aria-pressed", "true");
      await expect(result.locator("svg.lucide-crown")).toHaveCount(1);
      expect((await fixture.activeRound(room.roomId)).match_outcome).toBe("pending");
      await dialog.getByRole("button", { name: "취소", exact: true }).click();
      await expect(result.locator("svg.lucide-crown")).toHaveCount(0);
      await result.getByRole("button", { name: "2팀 승리 선택", exact: true }).click();
      await expect(result.locator('[aria-label="블루 승"]')).toHaveAttribute("aria-pressed", "false");
      await expect(result.locator('[aria-label="레드 승"]')).toHaveAttribute("aria-pressed", "true");
      if (outcome !== "team2") await dialog.getByRole("button", { name: "취소", exact: true }).click();
      if (outcome === "team1") await blue.click();
      if (outcome === "draw" || outcome === "void") {
        await result.getByRole("button", { name: outcome === "draw" ? "무승부" : "무효 · 재경기", exact: true }).click();
        await expect(result.locator("svg.lucide-crown")).toHaveCount(0);
        await expect(result.locator(outcome === "draw" ? "svg.lucide-equal" : "svg.lucide-rotate-ccw")).toHaveCount(2);
      }
      await member.goto(room.url);
      const memberPanel = member.getByTestId("clan-balance-session-panel");
      await expect(memberPanel.getByTestId("balance-match-result")).toHaveCount(0);
      await expect(memberPanel.getByRole("button", { name: "결과 확정", exact: true })).toHaveCount(0);
      await expect(memberPanel.getByRole("button", { name: /평가 점수 수정/ })).toHaveCount(0);
      await expect(memberPanel.getByRole("button", { name: /팀 승리 선택/ })).toHaveCount(0);
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
        await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: "결과를 저장하지 못했습니다" })).toBeVisible();
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
        await panel.getByRole("button", { name: "세션 종료", exact: true }).click();
        const closeSession = page.getByRole("dialog", { name: "내전을 종료할까요?", exact: true });
        await expect(closeSession).toBeVisible();
        await closeSession.getByRole("button", { name: "돌아가기", exact: true }).click();
        await page.getByRole("button", { name: "내전 기록 열기", exact: true }).click();
        const history = page.getByRole("dialog", { name: "내전 기록", exact: true });
        await expect(history.locator("tbody tr").filter({ hasText: fixture.users[0].nickname })).toContainText("1/1/1");
        await page.keyboard.press("Escape");
      } else {
        await panel.getByRole("button", { name: "다음 경기", exact: true }).click();
        await expect(panel).toHaveAttribute("data-balance-phase", "editing");
      }
    }
  } catch (error) {
    await page.screenshot({ path: test.info().outputPath("before-fixture-cleanup.png") });
    await test.info().attach("before-fixture-cleanup", { body: await page.locator("body").innerText(), contentType: "text/plain" });
    throw error;
  } finally { await memberContext.close(); await fixture.cleanup(); }
});
