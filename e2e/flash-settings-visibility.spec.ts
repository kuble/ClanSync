import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 15_000 });

test("flash rooms hide scores and unavailable settings for member hosts and clan leaders", async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(2);
  const staffContext = await browser.newContext({ baseURL });
  try {
    await loginIsolatedBalanceUser(page, f.users[1]);
    const room = await createAndEnterBalanceRoom(page, f.path, "깜짝 점수 비공개 검증", "flash");
    const round = await f.activeRound(room.roomId);
    const guests = await f.service.from("clan_participants").insert(Array.from({ length: 8 }, (_, i) => ({ clan_id: f.clanId, nickname: `깜짝검증${i}`, is_guest: true }))).select("id");
    expect(guests.error).toBeNull();
    const ids = [f.users[1].id, f.users[0].id, ...guests.data!.map((row) => row.id)];
    const roster = { team1: { tank: ids[0], dmg: ids.slice(2, 4), sup: ids.slice(4, 6) }, team2: { tank: ids[1], dmg: ids.slice(6, 8), sup: ids.slice(8, 10) } };
    const seeded = await f.service.from("balance_sessions").update({
      roster, map_ban_enabled: false, hero_ban_enabled: false,
      ma_snapshot: { [ids[0]]: { m: 9.37, a: null } },
      formation_settings: { ...round.formation_settings as object, showPlayerCardScore: true, showPlayerSessionSummary: true, showTeamComparisonSummary: true },
    }).eq("id", round.id);
    expect(seeded.error).toBeNull();
    const prepared = await f.activeRound(room.roomId);
    expect(prepared.ma_snapshot).toMatchObject({ [ids[0]]: { m: 9.37, a: null } });
    const before = prepared.formation_settings;
    await page.reload();
    const picker = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await picker.getByRole("button", { name: "부산 선택", exact: true }).click();
    await expect(picker).toBeHidden();
    const staff = await staffContext.newPage();
    await loginIsolatedBalanceUser(staff, f.users[0]);
    for (const view of [page, staff]) {
      const response = await view.goto(room.url);
      const body = await response!.text();
      expect(body).not.toContain("9.37");
      const panel = view.getByTestId("clan-balance-session-panel");
      await expect(panel.getByRole("button", { name: /^(평가|분석) 점수$/ })).toHaveCount(0);
      await expect(panel.getByTestId("team-comparison-graph")).toHaveCount(0);
      await view.getByRole("button", { name: "경기 설정", exact: true }).click();
      const dialog = view.getByRole("dialog", { name: "경기 설정", exact: true });
      await dialog.getByRole("radio", { name: "자동 배정", exact: true }).check();
      await dialog.getByRole("combobox", { name: "팀원 선발 방식", exact: true }).selectOption("random");
      const preview = dialog.getByRole("region", { name: "편성 방식 미리보기", exact: true });
      await preview.getByRole("slider", { name: "미리보기 타임라인", exact: true }).press("End");
      await expect(preview.getByTestId("formation-preview-caption")).toContainText("같은 역할끼리");
      await expect(preview).not.toContainText(/점수|승률/);

      await dialog.getByRole("tab", { name: "화면 표시", exact: true }).click();
      await expect(dialog.getByRole("checkbox", { name: "선수 카드 점수 표시", exact: true, includeHidden: true })).toHaveCount(0);
      await expect(dialog.getByRole("group", { name: "팀 비교", exact: true, includeHidden: true })).toHaveCount(0);
      await expect(dialog.getByRole("combobox", { name: "팀 비교 그래프", exact: true, includeHidden: true })).toHaveCount(0);
      const display = dialog.getByTestId("balance-display-preview");
      await expect(display.getByTestId("team-comparison-graph")).toHaveCount(0);
      await expect(display.getByRole("button", { name: /^(평가|분석) 점수$/ })).toHaveCount(0);
      await expect(display).not.toContainText(/\+1\.2|\+2\.1/);
      await expect(dialog).not.toContainText("점수");
      await dialog.getByRole("button", { name: "마우스 오버 상세 정보", exact: true }).hover();
      const help = view.getByRole("tooltip").filter({ hasText: "선수 카드에 마우스를" });
      await expect(help).toContainText("세션 전적·승률");
      await expect(help).not.toContainText("점수");
      await view.mouse.move(0, 0);
      await display.getByTestId("display-preview-card-0").hover();
      const details = view.getByRole("tooltip").filter({ hasText: "이번 세션 전적" });
      await expect(details).toBeVisible();
      await expect(details).not.toContainText("점수");
      await view.mouse.move(0, 0);
      for (const width of [320, 390]) {
        await view.setViewportSize({ width, height: 844 });
        await expect.poll(() => dialog.getByTestId("balance-settings-panel").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      await view.screenshot({ path: test.info().outputPath(`flash-display-${view === page ? "host" : "leader"}.png`) });
      await view.setViewportSize({ width: 1244, height: 884 });
      await dialog.getByRole("tab", { name: "경기 구성", exact: true }).click();
      await expect(dialog.getByRole("region", { name: "관전자 이벤트", exact: true, includeHidden: true })).toHaveCount(0);
      await expect(dialog.getByRole("checkbox", { name: "승부예측 사용", exact: true, includeHidden: true })).toHaveCount(0);
      await expect(dialog.getByRole("checkbox", { name: "맵 투표 사용", exact: true })).toBeVisible();
      await expect(dialog.getByRole("checkbox", { name: "영웅 밴 사용", exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    }
    expect((await f.activeRound(room.roomId)).formation_settings).toEqual(before);
    await page.getByRole("button", { name: "경기 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "경기 설정", exact: true });
    await settings.getByRole("tab", { name: "화면 표시", exact: true }).click();
    await settings.getByRole("checkbox", { name: "선수 카드 보조 정보 표시", exact: true }).uncheck();
    await settings.getByRole("button", { name: "설정 적용", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect.poll(async () => (await f.activeRound(room.roomId)).formation_settings).toMatchObject({ showPlayerCardInfo: false });
    const panel = page.getByTestId("clan-balance-session-panel");
    await panel.getByRole("button", { name: "세션 종료", exact: true }).click();
    const end = page.getByRole("dialog", { name: "내전을 종료할까요?", exact: true });
    await expect(end).not.toContainText("점수");
    await end.getByRole("button", { name: "돌아가기", exact: true }).click();
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 20_000 });
    await page.getByRole("button", { name: "화면 안내", exact: true }).click();
    const guide = page.getByRole("dialog", { name: "진행 중인 경기", exact: true });
    await expect(guide).toContainText("승리한 팀");
    await expect(guide).not.toContainText("점수");
    await guide.getByRole("button", { name: "닫기", exact: true }).click();
  } finally {
    await staffContext.close();
    await f.cleanup();
  }
});
