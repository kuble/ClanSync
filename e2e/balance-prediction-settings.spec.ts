import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createAndEnterBalanceRoom,
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "경기 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "경기 설정", exact: true });
  await expect(settings).toBeVisible();
  await settings.getByRole("tab", { name: "밴픽", exact: true }).click();
  return settings;
}

async function saveSettings(settings: Locator) {
  await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
  await expect(settings).toBeHidden({ timeout: 20_000 });
}

async function expectNoScoreToggle(panel: Locator) {
  await expect(panel.getByRole("button", { name: "평가 점수", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "분석 점수", exact: true })).toHaveCount(0);
}

test("경기 화면 간소화·Premium 승부예측 설정·관전자 드로워·점수 범위", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const fixture = await createIsolatedBalanceFixture(11);
  const spectatorContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  spectatorContext.setDefaultTimeout(20_000);
  const spectator = await spectatorContext.newPage();
  try {
    await Promise.all([
      loginIsolatedBalanceUser(page, fixture.users[0]),
      loginIsolatedBalanceUser(spectator, fixture.users[10]),
    ]);
    const room = await createAndEnterBalanceRoom(page, fixture.path, "승부예측 표시 검증");
    const round = await fixture.activeRound(room.roomId);
    const ids = fixture.users.slice(0, 10).map((user) => user.id);
    const roster = {
      team1: { tank: ids[0], dmg: ids.slice(1, 3), sup: ids.slice(3, 5) },
      team2: { tank: ids[5], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) },
    };
    const seeded = await fixture.service.from("balance_sessions").update({
      roster,
      ma_snapshot: Object.fromEntries(ids.map((id) => [id, { m: 1, a: 2 }])),
    }).eq("id", round.id);
    expect(seeded.error).toBeNull();

    await test.step("Free는 잠금, Premium은 설정 저장", async () => {
      expect((await fixture.service.from("clans").update({ subscription_tier: "free" }).eq("id", fixture.clanId)).error).toBeNull();
      await page.reload();
      let settings = await openSettings(page);
      const freeToggle = settings.getByRole("checkbox", { name: "승부예측 사용", exact: true });
      await expect(freeToggle).toBeDisabled();
      await expect(freeToggle).not.toBeChecked();
      await expect(settings).toContainText("Premium");
      await settings.getByRole("button", { name: "닫기", exact: true }).click();
      expect((await fixture.service.from("clans").update({ subscription_tier: "premium" }).eq("id", fixture.clanId)).error).toBeNull();
      await page.reload();
      settings = await openSettings(page);
      await settings.getByRole("checkbox", { name: "승부예측 사용", exact: true }).uncheck();
      await saveSettings(settings);
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).formation_settings).toMatchObject({ predictionEnabled: false });
      settings = await openSettings(page);
      await expect(settings.getByRole("checkbox", { name: "승부예측 사용", exact: true })).not.toBeChecked();
      await settings.getByRole("checkbox", { name: "승부예측 사용", exact: true }).check();
      await settings.getByRole("checkbox", { name: "맵 투표 사용", exact: true }).check();
      await settings.getByRole("spinbutton", { name: "맵 투표 시간(초)", exact: true }).fill("5");
      await settings.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }).uncheck();
      await saveSettings(settings);
      await expect.poll(async () => (await fixture.activeRound(room.roomId)).formation_settings).toMatchObject({
        predictionEnabled: true, showPlayerCardScore: true, showPlayerCardInfo: true,
        showPlayerSessionSummary: true, showTeamComparisonSummary: true,
      });
    });

    const panel = page.getByTestId("clan-balance-session-panel");
    await test.step("맵 유형 선택과 맵 투표에서 점수 선택 숨김", async () => {
      await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
      await expect(panel.getByRole("button", { name: "유형 선택 완료", exact: true })).toBeVisible();
      await expectNoScoreToggle(panel);
      await panel.getByRole("button", { name: "유형 선택 완료", exact: true }).click();
      await expect(panel).toHaveAttribute("data-balance-phase", "map_ban");
      await expectNoScoreToggle(panel);
      const resolve = panel.getByRole("button", { name: "맵 확정하기", exact: true });
      await expect(resolve).toBeEnabled({ timeout: 15_000 });
      await resolve.click();
      await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 25_000 });
    });

    await test.step("운영진은 점수 직접 편집, 멤버는 이름만 표시", async () => {
      await spectator.goto(room.url);
      for (const view of [page, spectator]) {
        const live = view.getByTestId("clan-balance-session-panel");
        await expectNoScoreToggle(live);
        await expect(live.getByTestId("team1-score-total")).toHaveCount(0);
        await expect(live.getByTestId("team2-score-total")).toHaveCount(0);
        await expect(live.locator('[aria-label="팀 비교 요약 보기"]')).toHaveCount(0);
        const slots = live.locator("[data-board-slot]");
        await expect(slots).toHaveCount(10);
        for (const user of fixture.users.slice(0, 10)) await expect(slots.filter({ hasText: user.nickname })).toHaveCount(1);
        await expect(live.getByRole("button", { name: /평가 점수 수정/ })).toHaveCount(view === page ? 10 : 0);
        await slots.first().hover({ force: true });
        await expect(view.getByRole("tooltip").filter({ hasText: "이번 세션 전적" })).toHaveCount(0);
        await expect(live.getByRole("region", { name: "승부예측", exact: true })).toHaveCount(0);
      }
      await panel.screenshot({ path: test.info().outputPath("match-live-names-only.png") });
      await page.getByRole("button", { name: "승부예측", exact: true }).click();
      const participantPrediction = page.getByRole("dialog", { name: "승부예측", exact: true });
      await expect(participantPrediction).toContainText("이번 경기에 출전 중입니다");
      await expect(participantPrediction.getByRole("button", { name: "블루(팀1) 승", exact: true })).toHaveCount(0);
      await participantPrediction.getByRole("button", { name: "닫기", exact: true }).click();
    });

    await test.step("관전자는 별도 드로워에서 예측하고 변경", async () => {
      await spectator.getByRole("button", { name: "승부예측", exact: true }).click();
      const predictions = spectator.getByRole("dialog", { name: "승부예측", exact: true });
      await expect(predictions).toBeVisible();
      const readPick = async () => {
        const result = await fixture.service.from("balance_session_predictions").select("pick_team")
          .eq("session_id", round.id).eq("user_id", fixture.users[10].id).maybeSingle();
        if (result.error) throw result.error;
        return result.data?.pick_team;
      };
      const blue = predictions.getByRole("button", { name: "블루(팀1) 승", exact: true });
      await blue.click();
      await expect.poll(readPick).toBe(1);
      await expect(blue).toHaveAttribute("aria-pressed", "true");
      const red = predictions.getByRole("button", { name: "레드(팀2) 승", exact: true });
      await red.click();
      await expect.poll(readPick).toBe(2);
      await expect(red).toHaveAttribute("aria-pressed", "true");
      const draw = predictions.getByRole("button", { name: "무승부", exact: true });
      await draw.click();
      await expect.poll(readPick).toBe(3);
      await expect(draw).toHaveAttribute("aria-pressed", "true");
      await spectator.screenshot({ path: test.info().outputPath("prediction-drawer-desktop.png"), fullPage: true });
      await spectator.setViewportSize({ width: 390, height: 844 });
      await expect.poll(async () => {
        const bounds = await predictions.boundingBox();
        return bounds ? Math.abs(bounds.width - 390) : Infinity;
      }).toBeLessThanOrEqual(1);
      expect(await spectator.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await spectator.screenshot({ path: test.info().outputPath("prediction-drawer-mobile.png"), fullPage: true });
      await predictions.getByRole("button", { name: "닫기", exact: true }).click();
      await expect(predictions).toBeHidden();
      await expect(spectator.getByRole("button", { name: "점수 조정", exact: true })).toHaveCount(0);
    });

    await test.step("참여자 점수 클릭으로 -10과 +10 저장", async () => {
      await expect(panel.getByRole("button", { name: "점수 조정", exact: true })).toHaveCount(0);
      const beforeInvalid = (await fixture.activeRound(room.roomId)).ma_snapshot;
      await panel.getByRole("button", { name: `${fixture.users[0].nickname} 평가 점수 수정`, exact: true }).click();
      await panel.getByRole("textbox", { name: `${fixture.users[0].nickname} 평가 점수`, exact: true }).fill("10.1");
      await panel.getByRole("button", { name: `${fixture.users[0].nickname} 점수 저장`, exact: true }).click();
      await expect(page.getByText("평가 점수는 -10부터 10까지 입력해 주세요.", { exact: true })).toBeVisible();
      expect((await fixture.activeRound(room.roomId)).ma_snapshot).toEqual(beforeInvalid);
      for (const [index, score] of [[0, -10], [5, 10]]) {
        const nickname = fixture.users[index].nickname;
        if (index !== 0) await panel.getByRole("button", { name: `${nickname} 평가 점수 수정`, exact: true }).click();
        const input = panel.getByRole("textbox", { name: `${nickname} 평가 점수`, exact: true });
        await expect(input).toHaveAttribute("type", "text");
        await input.fill(String(score));
        await panel.getByRole("button", { name: `${nickname} 점수 저장`, exact: true }).click();
        await expect.poll(async () => (await fixture.activeRound(room.roomId)).ma_snapshot).toMatchObject({
          [ids[index]]: { m: score },
        });
      }
      await expectNoScoreToggle(panel);
    });

    await test.step("설정 해제 또는 Free 전환 시 예측 접근 숨김", async () => {
      // A started match locks this setting; exercise off using a separate preconfigured room.
      const offRoom = await createAndEnterBalanceRoom(page, fixture.path, "승부예측 해제 검증");
      const offRound = await fixture.activeRound(offRoom.roomId);
      expect((await fixture.service.from("balance_sessions").update({ roster }).eq("id", offRound.id)).error).toBeNull();
      await page.reload();
      const settings = await openSettings(page);
      await settings.getByRole("checkbox", { name: "승부예측 사용", exact: true }).uncheck();
      await settings.getByRole("checkbox", { name: "맵 투표 사용", exact: true }).uncheck();
      await settings.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }).uncheck();
      await saveSettings(settings);
      const mapPicker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
      await expect(mapPicker).toBeVisible();
      await mapPicker.getByRole("button", { name: "닫기", exact: true }).click();
      await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
      await panel.getByRole("button", { name: "혼합", exact: true }).click();
      await panel.getByRole("button", { name: "눔바니 선택", exact: true }).click();

      await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
      await spectator.goto(offRoom.url);
      for (const view of [page, spectator]) await expect(view.getByRole("button", { name: "승부예측", exact: true })).toHaveCount(0);
      expect((await fixture.service.from("clans").update({ subscription_tier: "free" }).eq("id", fixture.clanId)).error).toBeNull();
      await spectator.goto(room.url);
      await expect(spectator.getByRole("button", { name: "승부예측", exact: true })).toHaveCount(0);
    });
  } catch (error) {
    await page.screenshot({ path: test.info().outputPath("before-fixture-cleanup.png") });
    await test.info().attach("before-fixture-cleanup", { body: await page.locator("body").innerText(), contentType: "text/plain" });
    throw error;
  } finally {
    await spectatorContext.close();
    await fixture.cleanup();
  }
});
