import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  createAndEnterBalanceRoom,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";
import { mapPoolForGameSlug } from "../src/lib/balance/map-pools";

test.use({ actionTimeout: 20_000 });

type Fixture = Awaited<ReturnType<typeof createIsolatedBalanceFixture>>;

async function openSettings(page: Page, panel: Locator) {
  await panel.getByRole("button", { name: "경기 설정", exact: true }).click();
  const settings = page.getByRole("dialog", {
    name: "경기 설정",
    exact: true,
  });
  await expect(settings).toBeVisible();
  return settings;
}

async function expectGuide(page: Page, panel: Locator, title: string) {
  await panel.getByRole("button", { name: "화면 안내", exact: true }).click();
  const guide = page.getByRole("dialog", { name: title, exact: true });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(guide).toBeHidden();
}

async function expectMapStage(panel: Locator) {
  await expect(panel.locator("[data-board-slot]")).toHaveCount(0);
  await expect(panel.locator("[data-roster-slot]")).toHaveCount(0);
  await expect(panel.getByRole("region", { name: "참가 가능 클랜원" })).toHaveCount(0);
}

async function expectLoadedMapImage(card: Locator) {
  const image = card.locator("img").first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) =>
    element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
  )).toBe(true);
}

async function capturePanel(panel: Locator, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await panel.screenshot({ path });
  await test.info().attach(name, { path, contentType: "image/png" });
}

async function saveSettings(settings: Locator) {
  await settings
    .getByRole("button", { name: "설정 적용", exact: true })
    .click();
  await expect(settings).toBeHidden({ timeout: 20_000 });
}

async function openAndForm(
  page: Page,
  fixture: Fixture,
  options: {
    mapBan?: boolean;
    heroBan?: boolean;
    mapBanSeconds?: number;
    heroBanSeconds?: number;
    heroBanCount?: 1 | 2;
  } = {},
) {
  await createAndEnterBalanceRoom(page, fixture.path);
  const panel = page.getByTestId("clan-balance-session-panel");
  await expect(panel).toHaveAttribute("data-balance-phase", "editing");
  const settings = await openSettings(page, panel);
  await settings.getByRole("radio", { name: /수동 배정/ }).check();
  await settings
    .getByRole("combobox", { name: "팀원 선발 방식", exact: true })
    .selectOption("keep");
  await expect(settings.getByRole("button", { name: /QA 맵 투표 연출/ })).toHaveCount(0);
  await settings.getByRole("tab", { name: "경기 구성", exact: true }).click();
  const mapBan = options.mapBan ?? true;
  const heroBan = options.heroBan ?? true;
  await settings.getByRole("checkbox", { name: "맵 투표 사용", exact: true }).setChecked(mapBan);
  await settings.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }).setChecked(heroBan);
  if (mapBan && options.mapBanSeconds !== undefined)
    await settings
      .getByRole("spinbutton", { name: "맵 투표 시간(초)", exact: true })
      .fill(String(options.mapBanSeconds));
  if (heroBan && options.heroBanSeconds !== undefined)
    await settings
      .getByRole("spinbutton", { name: "영웅 밴 시간(초)", exact: true })
      .fill(String(options.heroBanSeconds));
  if (heroBan && options.heroBanCount !== undefined)
    await settings
      .getByRole("combobox", { name: "팀별 영웅 밴 개수" })
      .selectOption(String(options.heroBanCount));
  await saveSettings(settings);
  if (!mapBan) {
    const initialMap = page.getByRole("dialog", { name: "경기 맵 선택", exact: true });
    await expect(initialMap.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    await initialMap.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(initialMap).toBeHidden();
  }
  const candidates = panel.getByRole("region", { name: "참가 가능 클랜원" });
  for (const user of fixture.users.slice(0, 10)) {
    await candidates
      .getByRole("button", {
        name: `${user.nickname} 출전 명단에 추가`,
        exact: true,
      })
      .click();
  }
  // Advancing immediately exercises the roster flush and automatic apply.
  await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
  if (mapBan) {
    // Empty roster slots also occur during the outgoing formation reveal.
    // Wait for the actual map preparation before opening its guide or voting.
    await expect(panel.getByRole("region", { name: "경기 준비", exact: true })).toBeVisible({ timeout: 20_000 });
  }
  await expectMapStage(panel);
  return panel;
}

async function readVotes(fixture: Fixture, roundId: string) {
  const { data, error } = await fixture.service
    .from("balance_session_map_votes")
    .select("user_id,choice_idx")
    .eq("session_id", roundId)
    .order("user_id");
  if (error) throw error;
  return data;
}

test("경기 준비: 가중 맵 연출·설정 보존·공유 결과·자동 영웅 밴", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const fixture = await createIsolatedBalanceFixture(10);
  const memberContext = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  memberContext.setDefaultTimeout(20_000);
  const member = await memberContext.newPage();
  let hostMirror: Page | undefined;
  try {
    await Promise.all([
      loginIsolatedBalanceUser(page, fixture.users[0]),
      loginIsolatedBalanceUser(member, fixture.users[1]),
    ]);
    const panel = await openAndForm(page, fixture, {
      mapBanSeconds: 15,
      heroBanSeconds: 11,
    });
    await member.goto(page.url());
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    await expect(
      memberPanel.getByRole("button", { name: "경기 설정", exact: true }),
    ).toHaveCount(0);
    await expect(
      memberPanel.getByRole("button", { name: "다음 단계", exact: true }),
    ).toHaveCount(0);
    const formed = await fixture.activeRound();
    await expectGuide(page, panel, "투표할 맵 유형");

    const configured = await fixture.activeRound();
    expect(configured.roster).toEqual(formed.roster);
    expect(configured.formation_state).toEqual(formed.formation_state);
    expect(configured).toMatchObject({
      map_ban_enabled: true,
      hero_ban_enabled: true,
      map_ban_seconds: 15,
      hero_ban_seconds: 11,
    });

    await expectMapStage(panel);
    await expectMapStage(memberPanel);
    const applied = await fixture.activeRound();
    expect(applied.formation_state).toEqual(formed.formation_state);
    await member.reload();
    await expectMapStage(memberPanel);
    await expect(memberPanel.getByRole("region", { name: "경기 준비", exact: true })).toBeVisible();
    await expectGuide(page, panel, "투표할 맵 유형");

    const preparation = panel.getByRole("region", {
      name: "경기 준비",
      exact: true,
    });
    const all = preparation.getByRole("button", { name: "전체", exact: true });
    const control = preparation.getByRole("button", {
      name: "쟁탈",
      exact: true,
    });
    const escort = preparation.getByRole("button", {
      name: "화물",
      exact: true,
    });
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await control.click();
    await escort.click();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(escort).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await all.click();
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(escort).toHaveAttribute("aria-pressed", "false");
    await preparation.getByRole("button", { name: "플래시포인트", exact: true }).click();
    await Promise.all([
      expect(panel.getByTestId("balance-realtime")).toHaveAttribute(
        "data-connection-status",
        "READY",
      ),
      expect(memberPanel.getByTestId("balance-realtime")).toHaveAttribute(
        "data-connection-status",
        "READY",
      ),
    ]);

    await preparation
      .getByRole("button", { name: "유형 선택 완료", exact: true })
      .click();
    // Both authenticated browsers vote before automatic resolution at the shared deadline.
    await Promise.all([
      panel.getByRole("button", { name: /MAP 01/ }).click(),
      memberPanel.getByRole("button", { name: /MAP 02/ }).click(),
    ]);
    await expect
      .poll(async () => (await readVotes(fixture, formed.id)).length)
      .toBe(2);
    const voting = await fixture.activeRound();
    hostMirror = await page.context().newPage();
    await hostMirror.goto(page.url());
    const mirrorPanel = hostMirror.getByTestId("clan-balance-session-panel");
    await expect(mirrorPanel.getByTestId("balance-realtime")).toHaveAttribute("data-connection-status", "READY");
    expect(voting.phase).toBe("map_ban");
    expect(voting.map_types).toEqual(["flashpoint"]);
    expect(voting.map_ban_seconds).toBe(15);
    expect(voting.map_ban_deadline_at).not.toBeNull();
    expect(voting.map_candidates).toHaveLength(3);
    const allowed = mapPoolForGameSlug("overwatch", ["flashpoint"]);
    expect([...allowed].sort()).toEqual(["수라바사", "뉴 정크 시티", "아틀리스"].sort());
    expect(voting.map_candidates?.every((map) => allowed.includes(map))).toBe(
      true,
    );
    expect(new Set(voting.map_candidates).size).toBe(3);
    await expectMapStage(panel);
    await expectMapStage(memberPanel);
    for (const number of ["01", "02", "03"]) await expectLoadedMapImage(panel.getByRole("button", { name: new RegExp("MAP " + number) }));
    await capturePanel(panel, "map-voting-gallery");
    await expectGuide(page, panel, "원하는 맵에 투표");
    expect(await readVotes(fixture, formed.id)).toEqual(
      fixture.users
        .slice(0, 2)
        .map((user, index) => ({ user_id: user.id, choice_idx: index }))
        .sort((a, b) => a.user_id.localeCompare(b.user_id)),
    );
    await expect(panel.getByRole("button", { name: "맵 확정하기", exact: true })).toHaveCount(0);
    await expect(panel.getByText(/명 투표 · 내 선택/)).toHaveCount(0);
    const oddsBefore = await panel.getByTestId("balance-win-probability").boundingBox();
    const galleryBefore = await panel.getByTestId("map-vote-gallery").boundingBox();
    const endBefore = await panel.getByRole("button", { name: "세션 종료", exact: true }).boundingBox();
    expect(oddsBefore!.y).toBeGreaterThan(galleryBefore!.y + galleryBefore!.height);
    expect(oddsBefore!.y + oddsBefore!.height).toBeLessThan(endBefore!.y);
    await expect(panel.locator('[data-map-revealing="true"]')).toBeVisible({ timeout: 20_000 });
    await expect(panel.locator('[data-vote-excluded="true"]')).toHaveCount(1);
    await expect(panel.locator('[data-vote-excluded="true"]')).toContainText(voting.map_candidates![2]);
    await expect(panel.getByRole("button", { name: "경기 도구", exact: true })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "영웅 밴 시작", exact: true })).toHaveCount(0);
    await expect(panel.getByTestId("resolved-map")).toBeVisible();
    const expectedMap = await panel.getByTestId("resolved-map").innerText();
    expect(voting.map_candidates!.slice(0, 2)).toContain(expectedMap);
    await expect(panel.getByTestId("map-vote-gallery")).toHaveCount(0);
    const expanded = await panel.getByTestId("resolved-map-card").boundingBox();
    expect(expanded!.width).toBeGreaterThan(galleryBefore!.width - 2);
    await capturePanel(panel, "map-confirmed-expanded");
    await expect(panel.getByTestId("balance-win-probability")).toHaveCount(1);
    await expect(panel.getByTestId("balance-win-probability")).toContainText(expectedMap);
    await Promise.all([panel, memberPanel, mirrorPanel].map(async (view) => {
      await expect(view).toHaveAttribute("data-balance-phase", "hero_ban", { timeout: 20_000 });
      await expect(view.getByText(expectedMap, { exact: true })).toBeVisible();
      await expect(view.getByRole("alert")).toHaveCount(0);
    }));
    await expect(page.getByRole("dialog", { name: "맵 추첨 결과", exact: true })).toHaveCount(0);
    const resolved = await fixture.activeRound();
    expect(resolved).toMatchObject({
      phase: "hero_ban", resolved_map_label: expectedMap, map_ban_deadline_at: null,
    });
    expect(resolved.hero_ban_deadline_at).not.toBeNull();
    expect(resolved.roster).toEqual(formed.roster);
    expect(resolved.formation_state).toEqual(applied.formation_state);
    await member.reload();
    await expect(memberPanel).toHaveAttribute("data-balance-phase", "hero_ban");
    expect((await fixture.activeRound()).resolved_map_label).toBe(expectedMap);
    await expect(panel.getByRole("button", { name: "경기 설정", exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "경기 설정", exact: true })).toHaveCount(0);
  } finally {
    await hostMirror?.close();
    await memberContext.close();
    await fixture.cleanup();
  }
});

test("경기 준비: 팀별 영웅 선택·기권·밴 확정과 경기 시작", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(10);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const panel = await openAndForm(page, fixture, {
      mapBan: false,
      heroBan: true,
      heroBanSeconds: 15,
      heroBanCount: 2,
    });
    const formed = await fixture.activeRound();
    const configured = await fixture.activeRound();
    expect(configured.roster).toEqual(formed.roster);
    expect(configured.formation_state).toEqual(formed.formation_state);
    expect(configured.resolved_map_label).toBeNull();
    await expectMapStage(panel);
    await expectGuide(page, panel, "맵 유형 선택");
    await expect(panel.getByRole("button", { name: "쟁탈", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByRole("button", { name: "부산 선택", exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "혼합", exact: true }).click();
    const picker = panel.getByRole("button", { name: "왕의 길 선택", exact: true });
    await expectLoadedMapImage(picker);
    const beforeHeroStart = Date.now();
    await picker.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "hero_ban");
    const heroResolve = panel.getByRole("button", {
      name: "경기 시작",
      exact: true,
    });
    await expect(heroResolve).toHaveCount(0);
    await expect(panel.getByRole("group", { name: "점수 표시" })).toHaveCount(0);
    const hazard = panel.getByRole("button", { name: "해저드 밴 선택", exact: true });
    await hazard.dblclick({ delay: 0 });
    await expect(hazard).toHaveAttribute("aria-pressed", "true");
    await expect(hazard).toBeEnabled();
    await hazard.click();
    await expect(hazard).toHaveAttribute("aria-pressed", "false");
    await hazard.click();
    await expect(hazard).toHaveAttribute("aria-pressed", "true");
    const wuyang = panel.getByRole("button", { name: "우양 밴 선택", exact: true });
    await wuyang.click();
    await expect(wuyang).toHaveAttribute("aria-pressed", "true");
    await expect(wuyang).toBeEnabled();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "아나 밴 선택", exact: true })).toBeDisabled();
    const team1BanStatus = panel.getByRole("region", { name: "1팀 밴 현황" });
    await expect(team1BanStatus).toHaveCount(0);
    await expect(panel.getByTestId("hero-ban-results")).toHaveCount(0);
    await expect.poll(() => hazard.locator("img").evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    await capturePanel(panel, "hero-ban-portraits");
    const heroVoting = await fixture.activeRound();
    const afterHeroStart = Date.now();
    expect(heroVoting).toMatchObject({
      phase: "hero_ban",
      resolved_map_label: "왕의 길",
      banned_heroes: null,
    });
    const heroDeadline = Date.parse(heroVoting.hero_ban_deadline_at!);
    // The hosted DB and test runner clocks can differ by a few hundred milliseconds.
    expect(heroDeadline).toBeGreaterThanOrEqual(beforeHeroStart + 14_000);
    expect(heroDeadline).toBeLessThanOrEqual(afterHeroStart + 16_000);
    const { data: heroVotes, error: heroVoteError } = await fixture.service
      .from("balance_session_hero_votes")
      .select("user_id")
      .eq("session_id", formed.id);
    if (heroVoteError) throw heroVoteError;
    expect(heroVotes).toEqual([{ user_id: fixture.users[0].id }]);
    await expect(heroResolve).toBeEnabled({ timeout: 20_000 });
    await expect(hazard).toHaveCount(0);
    await expect(panel.getByTestId("hero-ban-results")).toBeVisible();
    await expect(team1BanStatus).toContainText("1 / 5명 선택");
    await expect(team1BanStatus).toContainText("해저드");
    await expect(team1BanStatus).toContainText("우양");
    await expect.poll(() => Date.now()).toBeGreaterThan(heroDeadline + 1_000);
    await heroResolve.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", { timeout: 20_000 });
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    expect(await fixture.activeRound()).toMatchObject({
      phase: "match_live",
      resolved_map_label: "왕의 길",
      banned_heroes: ["hazard", "wuyang"],
      hero_ban_deadline_at: null,
      hero_ban_context: { version: 1, bansPerTeam: 2, teams: { team1: [{ heroId: "hazard", role: "tank", votes: 1 }, { heroId: "wuyang", role: "support", votes: 1 }], team2: [] } },
    });
  } catch (error) {
    await capturePanel(page.getByTestId("clan-balance-session-panel"), "hero-start-failure");
    await test.info().attach("hero-start-state", {
      body: JSON.stringify({ text: await page.locator("body").innerText(), round: await fixture.activeRound() }), contentType: "application/json",
    });
    throw error;
  } finally {
    await fixture.cleanup();
  }
});
