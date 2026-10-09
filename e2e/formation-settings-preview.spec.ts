import { expect, test } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("formation previews support readable pacing, seeking and every screen flow without saving", async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await createIsolatedBalanceFixture(1);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await createAndEnterBalanceRoom(page, fixture.path, "편성 미리보기 검증");
    const readSettings = async () => {
      const { data, error } = await fixture.service.from("balance_sessions").select("formation_settings").eq("clan_id", fixture.clanId);
      expect(error).toBeNull();
      return data;
    };
    const before = await readSettings();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByRole("button", { name: "라운드 설정", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "라운드 설정", exact: true });
    const preview = dialog.getByRole("region", { name: "편성 방식 미리보기", exact: true });
    const mode = dialog.getByRole("combobox", { name: "팀원 선발 방식", exact: true });
    const screen = preview.getByTestId("formation-preview-screen");
    const title = preview.getByTestId("formation-preview-title");
    const timeline = preview.getByRole("slider", { name: "미리보기 타임라인" });
    const seek = async (step: number) => timeline.fill(String(step));
    const chapter = async (name: string) => preview.getByRole("button", { name: new RegExp(`${name}(?: \\d+)? 구간 보기$`) }).first().click();
    const play = async () => preview.getByRole("button", { name: "미리보기 재생", exact: true }).click();
    const expectTeams = async () => {
      await expect(screen.locator('[data-preview-team="A"]')).toHaveCount(5);
      await expect(screen.locator('[data-preview-team="B"]')).toHaveCount(5);
    };
    const panel = page.getByTestId("balance-settings-panel");
    const previewBox = await preview.boundingBox();
    const panelBox = await panel.boundingBox();
    const normalScreenHeight = (await screen.boundingBox())!.height;
    expect(previewBox!.x + previewBox!.width).toBeLessThan(panelBox!.x);
    expect(previewBox!.y).toBeGreaterThanOrEqual(0);
    expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

    await expect(screen).toHaveAttribute("data-screen", "manual");
    await page.clock.runFor(3800);
    await expect(title).toHaveText("수동 명단 확인");
    await page.clock.runFor(200);
    await expect(title).toHaveText("역할 인원 확인");
    await seek(0);
    await page.clock.runFor(12000);
    await expect(title).toHaveText("수동 명단 확인");
    await timeline.focus();
    await page.keyboard.press("ArrowRight");
    await expect(title).toHaveText("역할 인원 확인");
    await chapter("결과");
    await expectTeams();
    await play();
    await page.clock.runFor(4000);
    await expect(title).toHaveText("수동 명단 확인");

    await mode.selectOption("random");
    await chapter("추첨 발표");
    await expect(screen).toHaveAttribute("data-screen", "draw");
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(0);
    await seek(3);
    await expect(title).toHaveText("돌격 팀 추첨");
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(2);
    await chapter("결과");
    await expectTeams();

    await dialog.getByRole("radio", { name: /자동 배정/ }).check();
    await expect(screen).toHaveAttribute("data-screen", "preference");
    await page.clock.runFor(3800);
    await expect(title).toHaveText("내 선호 역할 선택");
    await seek(1);
    await expect(screen.locator("[data-preview-preference]").first()).toHaveAttribute("data-preview-preference", "sup");
    await chapter("명단 확인");
    await expect(screen).toHaveAttribute("data-screen", "roster");
    await expect(preview.getByRole("group", { name: "내 선호 역할 선택 화면", exact: true })).toHaveCount(0);
    await chapter("추첨 발표");
    const frozenNames = await screen.locator('[data-revealed="false"] strong').allTextContents();
    await page.clock.runFor(2000);
    expect(await screen.locator('[data-revealed="false"] strong').allTextContents()).toEqual(frozenNames);
    await play();
    await page.clock.runFor(200);
    expect(await screen.locator('[data-revealed="false"] strong').allTextContents()).not.toEqual(frozenNames);
    await page.clock.runFor(200);
    await expect(title).toHaveText("추첨 발표");
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(1);
    await expect(preview.getByTestId("formation-preview-step")).toHaveText("4 / 5");
    await page.clock.runFor(1000);
    await expect(screen.locator('[data-preview-player="8"]')).toHaveAttribute("data-preview-team", "B");
    await expect(screen.locator('[data-preview-player="8"]')).toContainText("지원");
    await preview.getByRole("button", { name: "미리보기 일시정지", exact: true }).click();
    await page.clock.runFor(2000);
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(4);
    await expect(preview.getByTestId("formation-preview-step")).toHaveText("4 / 5");
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("auto-timeline-preview.png") });
    await play();
    await page.clock.runFor(1600);
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(10);
    await expect(title).toHaveText("추첨 발표");
    await expect(preview.getByTestId("formation-preview-step")).toHaveText("4 / 5");
    await page.clock.runFor(1000);
    await expect(screen).toHaveAttribute("data-screen", "complete");
    await expectTeams();
    await page.clock.runFor(4000);
    await expect(screen).toHaveAttribute("data-screen", "preference");

    for (const teamMode of ["draft", "auction"]) {
      await mode.selectOption(teamMode);
      await expect(screen).toHaveAttribute("data-screen", "preference");
      await chapter("추첨 발표");
      await play();
      await page.clock.runFor(1400);
      await expect(screen.locator('[data-revealed="true"]')).toHaveCount(4);
      await expect(screen).toContainText("역할 자리");
      await chapter("결과");
      await expectTeams();
    }
    await dialog.getByRole("radio", { name: /수동 배정/ }).check();
    await mode.selectOption("draft");
    await chapter("주장 선정");
    await expect(screen).toHaveAttribute("data-screen", "captains");
    await chapter("지명");
    await expect(screen).toHaveAttribute("data-screen", "draft");
    await seek(4);
    await expect(title).toHaveText("1번째 지명 · A팀");
    await seek(6);
    await expect(title).toHaveText("3번째 지명 · B팀");
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("draft-timeline-preview.png") });
    await chapter("결과");
    await expectTeams();

    await mode.selectOption("auction");
    const extensionBox = await dialog.getByLabel("입찰 연장 시간(초)", { exact: true }).boundingBox();
    const preparationBox = await dialog.getByLabel("낙찰 후 준비 시간(초)", { exact: true }).boundingBox();
    expect(extensionBox!.y < preparationBox!.y || (extensionBox!.y === preparationBox!.y && extensionBox!.x < preparationBox!.x)).toBe(true);
    await dialog.getByRole("spinbutton", { name: "최소·증액 단위", exact: true }).fill("20");
    await chapter("입찰");
    await expect(screen).toHaveAttribute("data-screen", "auction");
    await expect(title).toHaveText("A팀 주장 시점");
    await seek(4);
    const timer = preview.getByTestId("auction-preview-timer");
    const price = preview.getByTestId("auction-preview-price");
    await expect(timer).toHaveText("20초");
    await play();
    await page.clock.runFor(2000);
    await expect(timer).toHaveText("19초");
    await page.clock.runFor(2000);
    await expect(title).toHaveText("내 첫 입찰");
    await expect(price).toHaveText("20 cr");
    await seek(6);
    await expect(price).toHaveText("40 cr");
    await play();
    await page.clock.runFor(4000);
    await expect(title).toHaveText("내 재입찰 · 시간 연장");
    await expect(timer).toHaveText("5초");
    await expect(price).toHaveText("60 cr");
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("auction-timeline-preview.png") });
    await page.clock.runFor(4000);
    await expect(screen).toHaveAttribute("data-screen", "settlement");
    await expect(timer).toHaveText("0초");
    await page.clock.runFor(4000);
    await expect(preview.getByTestId("preview-credits-0")).toHaveText("940 cr");
    await expect(preview.getByTestId("auction-preview-preparation")).toHaveText("5초");
    await expect(preview.getByRole("button", { name: /입찰.*구간 보기/ })).toHaveCount(1);
    await expect(preview.getByRole("button", { name: /낙찰.*구간 보기/ })).toHaveCount(1);
    await dialog.getByLabel("낙찰 후 준비 시간(초)", { exact: true }).fill("12");
    await seek(9);
    await expect(preview.getByTestId("auction-preview-preparation")).toHaveText("12초");
    await dialog.getByLabel("입찰 연장 시간(초)", { exact: true }).fill("8");
    await seek(7);
    await expect(timer).toHaveText("8초");
    await expect(preview.getByTestId("formation-preview-caption")).toContainText("마지막 8초");
    await chapter("결과");
    await expectTeams();
    await expect(preview.getByTestId("preview-credits-0")).toHaveText("880 cr");
    await expect(preview.getByTestId("preview-credits-1")).toHaveText("900 cr");
    await dialog.getByRole("checkbox", { name: "전략 아이템 사용" }).check();
    await chapter("전략 준비");
    await expect(screen).toHaveAttribute("data-screen", "strategy");
    await chapter("아이템 선택");
    await expect(screen).toHaveAttribute("data-screen", "items");
    await expect(screen).toContainText("구매 안 함");
    await expect(screen).toContainText("영웅 밴 1장");
    await expect(screen).toContainText("맵 선택권 1장");
    await expect(screen).toContainText("영웅 밴 2장");
    await expect(screen).toContainText("100cr");
    await expect(screen).toContainText("50cr");
    await expect(screen).toContainText("200cr");

    for (const setting of [
      { label: "팀 크레딧", field: "auctionBudget", value: "1500", restore: "1000", scene: "auction", text: "1000 cr → 1500 cr" },
      { label: "최소·증액 단위", field: "minBid", value: "40", restore: "20", scene: "auction", text: "10 cr → 40 cr" },
      { label: "입찰 시간(초)", field: "durationSeconds", value: "35", restore: "20", scene: "auction", text: "20초 → 35초" },
      { label: "낙찰 후 준비 시간(초)", field: "auctionPreparationSeconds", value: "15", restore: "12", scene: "preparation", text: "5초 → 15초" },
      { label: "입찰 연장 시간(초)", field: "bidExtensionSeconds", value: "0", restore: "8", scene: "auction", text: "5초 → 0초 (연장 끔)" },
      { label: "전략 준비 시간(초)", field: "strategySeconds", value: "45", restore: "30", scene: "strategy", text: "30초 → 45초" },
    ]) {
      const input = dialog.getByRole("spinbutton", { name: setting.label, exact: true });
      await input.focus();
      await expect(screen.locator(`[data-preview-highlight="${setting.field}"]`)).toBeVisible();
      await input.fill(setting.value);
      await expect(screen).toHaveAttribute("data-screen", setting.scene);
      await expect(screen.getByRole("status")).toContainText(setting.text);
      await expect(screen.getByRole("status")).toHaveClass("sr-only");
      await expect(screen.locator("[data-preview-highlight]")).toHaveCount(1);
      const highlight = await screen.locator(`[data-preview-highlight="${setting.field}"]`).boundingBox();
      const unchangedScreen = await screen.boundingBox();
      expect(unchangedScreen!.height).toBe(normalScreenHeight);
      if (setting.field === "auctionBudget") {
        expect(highlight!.height).toBeLessThan(40);
        expect(highlight!.width).toBeLessThan(unchangedScreen!.width / 2);
      }
      const pausedTitle = await title.textContent();
      await page.clock.runFor(12000);
      await expect(title).toHaveText(pausedTitle!);
      await input.fill(setting.restore);
    }
    await play();
    await expect(screen.locator("[data-preview-highlight]")).toHaveCount(0);
    await chapter("입찰");
    await dialog.getByRole("spinbutton", { name: "입찰 연장 시간(초)", exact: true }).fill("8");
    await expect(preview.getByTestId("auction-preview-timer")).toHaveText("8초");
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("setting-highlight-preview.png") });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await mode.selectOption("random");
    await expect(screen).toHaveAttribute("data-screen", "complete");
    await chapter("역할 배치");
    await expect(screen).toHaveAttribute("data-screen", "manual");
    await page.clock.runFor(12000);
    await expect(screen).toHaveAttribute("data-screen", "manual");
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole("radio", { name: /자동 배정/ }).check();
    await chapter("추첨 발표");
    await expect(screen.locator('[data-revealed="true"]')).toHaveCount(10);
    await chapter("선호 선택");
    await preview.scrollIntoViewIfNeeded();
    expect(await screen.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await chapter("결과");
    await expectTeams();
    await preview.scrollIntoViewIfNeeded();
    expect(await screen.locator('[data-preview-player="8"]').evaluate((el) => el.getBoundingClientRect().bottom <= el.closest('[data-testid="formation-preview-screen"]')!.getBoundingClientRect().bottom)).toBe(true);
    await mode.selectOption("auction");
    await dialog.getByRole("spinbutton", { name: "입찰 시간(초)", exact: true }).fill("40");
    await expect(screen.getByRole("status")).toContainText("20초 → 40초");
    await expect(preview.getByTestId("auction-preview-timer")).toHaveText("40초");
    await preview.scrollIntoViewIfNeeded();
    const highlightedBox = await screen.locator('[data-preview-highlight="durationSeconds"]').boundingBox();
    const screenBox = await screen.boundingBox();
    expect(highlightedBox!.y + highlightedBox!.height).toBeLessThanOrEqual(screenBox!.y + screenBox!.height);
    await chapter("입찰");
    await seek(Number(await timeline.inputValue()) + 1);
    await preview.scrollIntoViewIfNeeded();
    expect(await screen.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await screen.getByTestId("auction-preview-timer").evaluate((el) => el.getBoundingClientRect().bottom <= el.closest('[data-testid="formation-preview-screen"]')!.getBoundingClientRect().bottom)).toBe(true);
    await chapter("아이템 선택");
    await page.screenshot({ animations: "disabled", path: test.info().outputPath("mobile-timeline-preview.png") });
    await mode.selectOption("draft");
    await chapter("지명");
    const draftStatus = screen.getByText("0 / 8명 선발 · 역할 정원 안에서 선택해요.", { exact: true });
    expect(await draftStatus.evaluate((el) => el.getBoundingClientRect().bottom <= el.closest('[data-testid="formation-preview-screen"]')!.getBoundingClientRect().bottom)).toBe(true);
    await dialog.getByRole("tab", { name: "화면 표시", exact: true }).click();
    await page.clock.runFor(300);
    await expect(preview).toBeHidden();
    await expect(await readSettings()).toEqual(before);
    await page.keyboard.press("Escape");
    await page.clock.runFor(300);
    await expect(dialog).toBeHidden();
  } finally {
    await fixture.cleanup();
  }
});
