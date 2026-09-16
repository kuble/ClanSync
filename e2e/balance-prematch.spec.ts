import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";
import { mapPoolForGameSlug } from "../src/lib/balance/map-pools";

test.use({ actionTimeout: 20_000 });

type Fixture = Awaited<ReturnType<typeof createIsolatedBalanceFixture>>;

async function openSettings(page: Page, panel: Locator) {
  await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
  const settings = page.getByRole("dialog", {
    name: "라운드 설정",
    exact: true,
  });
  await expect(settings).toBeVisible();
  return settings;
}

async function saveSettings(settings: Locator) {
  await settings
    .getByRole("button", { name: "설정 적용", exact: true })
    .click();
  await expect(settings).toBeHidden({ timeout: 20_000 });
}

async function openAndForm(page: Page, fixture: Fixture) {
  await page.goto(fixture.path);
  const panel = page.getByTestId("clan-balance-session-panel");
  await panel.getByRole("button", { name: "세션 열기", exact: true }).click();
  await expect(panel).toHaveAttribute("data-balance-phase", "editing");
  const settings = await openSettings(page, panel);
  await settings.getByRole("radio", { name: /직접 배정/ }).check();
  await settings
    .getByRole("combobox", { name: "팀원 선발 방식", exact: true })
    .selectOption("keep");
  await settings
    .getByRole("checkbox", { name: "맵 밴 사용", exact: true })
    .check();
  await settings
    .getByRole("checkbox", { name: "영웅 밴 사용", exact: true })
    .check();
  await saveSettings(settings);
  const candidates = panel.getByRole("region", { name: "참가 가능 클랜원" });
  for (const user of fixture.users.slice(0, 10)) {
    await candidates
      .getByRole("button", {
        name: `${user.nickname} 출전 명단에 추가`,
        exact: true,
      })
      .click();
  }
  // Starting immediately exercises the roster flush before formation.
  await panel.getByRole("button", { name: "편성 시작", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "맵 밴 시작", exact: true }),
  ).toBeEnabled();
  await expect(panel.locator("[data-board-slot]")).toHaveCount(10);
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

test("경기 준비: QA 연출·설정 보존·유형 필터·공유 맵 결과·명시적 시작", async ({
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
  try {
    await Promise.all([
      loginIsolatedBalanceUser(page, fixture.users[0]),
      loginIsolatedBalanceUser(member, fixture.users[1]),
    ]);
    const panel = await openAndForm(page, fixture);
    await member.goto(fixture.path);
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    await expect(
      memberPanel.getByRole("button", { name: "라운드 설정", exact: true }),
    ).toHaveCount(0);
    await expect(
      memberPanel.getByRole("button", { name: "맵 밴 시작", exact: true }),
    ).toHaveCount(0);
    const formed = await fixture.activeRound();

    const previewSettings = await openSettings(page, panel);
    await previewSettings
      .getByRole("button", { name: "QA 맵 투표 연출", exact: true })
      .click();
    await expect(previewSettings).toBeHidden();
    const preview = page.getByRole("dialog", {
      name: "맵 투표 연출 테스트",
      exact: true,
    });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByText("QA 연출 테스트 · 실제 투표/기록 변경 없음", {
        exact: true,
      }),
    ).toBeVisible();
    for (const count of [3, 5, 2])
      await expect(
        preview.getByText(`${count}표`, { exact: true }),
      ).toBeVisible();
    await expect(preview.getByTestId("map-vote-reveal")).toHaveAttribute(
      "data-reveal-complete",
      "true",
      { timeout: 8_000 },
    );
    await expect(preview.getByTestId("map-vote-result")).toHaveText(
      mapPoolForGameSlug("overwatch")[1],
    );
    expect(await readVotes(fixture, formed.id)).toEqual([]);
    expect(await fixture.activeRound()).toEqual(formed);
    await preview
      .getByRole("button", { name: "닫기", exact: true })
      .last()
      .click();
    await expect(preview).toBeHidden();

    const settings = await openSettings(page, panel);
    await expect(
      settings.getByRole("radio", { name: /직접 배정/ }),
    ).toBeDisabled();
    await expect(
      settings.getByRole("combobox", { name: "팀원 선발 방식", exact: true }),
    ).toBeDisabled();
    await settings
      .getByRole("checkbox", { name: "맵 밴 사용", exact: true })
      .uncheck();
    await expect(
      settings.getByRole("spinbutton", { name: "맵 밴 시간(초)", exact: true }),
    ).toBeDisabled();
    await settings
      .getByRole("checkbox", { name: "맵 밴 사용", exact: true })
      .check();
    await settings
      .getByRole("spinbutton", { name: "맵 밴 시간(초)", exact: true })
      .fill("5");
    await settings
      .getByRole("spinbutton", { name: "영웅 밴 시간(초)", exact: true })
      .fill("11");
    await settings
      .getByRole("checkbox", { name: "영웅 밴 사용", exact: true })
      .uncheck();
    await saveSettings(settings);
    const configured = await fixture.activeRound();
    expect(configured.roster).toEqual(formed.roster);
    expect(configured.formation_state).toEqual(formed.formation_state);
    expect(configured).toMatchObject({
      map_ban_enabled: true,
      hero_ban_enabled: false,
      map_ban_seconds: 5,
      hero_ban_seconds: 11,
    });

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
    await control.click();
    await escort.click();
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
      .getByRole("button", { name: "맵 밴 시작", exact: true })
      .click();
    // Both authenticated browsers vote immediately in the minimum 5-second window.
    await Promise.all([
      panel.getByRole("button", { name: /MAP 01/ }).click(),
      memberPanel.getByRole("button", { name: /MAP 01/ }).click(),
    ]);
    await expect
      .poll(async () => (await readVotes(fixture, formed.id)).length)
      .toBe(2);
    const voting = await fixture.activeRound();
    expect(voting.phase).toBe("map_ban");
    expect(voting.map_types).toEqual(["control", "escort"]);
    expect(voting.map_ban_seconds).toBe(5);
    expect(voting.map_ban_deadline_at).not.toBeNull();
    expect(voting.map_candidates).toHaveLength(3);
    const allowed = mapPoolForGameSlug("overwatch", ["control", "escort"]);
    expect(voting.map_candidates?.every((map) => allowed.includes(map))).toBe(
      true,
    );
    expect(new Set(voting.map_candidates).size).toBe(3);
    expect(await readVotes(fixture, formed.id)).toEqual(
      fixture.users
        .slice(0, 2)
        .map((user) => ({ user_id: user.id, choice_idx: 0 }))
        .sort((a, b) => a.user_id.localeCompare(b.user_id)),
    );
    const resolve = panel.getByRole("button", {
      name: "맵 확정하기",
      exact: true,
    });
    await expect(resolve).toBeEnabled({ timeout: 10_000 });
    await resolve.click();
    const expectedMap = voting.map_candidates![0];
    await Promise.all(
      [page, member].map(async (client) => {
        const result = client.getByRole("dialog", {
          name: "맵 추첨 결과",
          exact: true,
        });
        await expect(result).toBeVisible({ timeout: 20_000 });
        await expect(result.getByTestId("map-vote-result")).toHaveText(
          expectedMap,
          { timeout: 8_000 },
        );
        await result.getByRole("button", { name: "확인", exact: true }).click();
        await expect(client.getByTestId("resolved-map")).toHaveText(
          expectedMap,
        );
      }),
    );
    const resolved = await fixture.activeRound();
    expect(resolved).toMatchObject({
      phase: "map_ban",
      resolved_map_label: expectedMap,
      map_ban_deadline_at: null,
    });
    expect(resolved.roster).toEqual(formed.roster);
    expect(resolved.formation_state).toEqual(formed.formation_state);
    await member.reload();
    await expect(memberPanel.getByTestId("resolved-map")).toHaveText(
      expectedMap,
    );
    await expect(
      member.getByRole("dialog", { name: "맵 추첨 결과", exact: true }),
    ).toHaveCount(0);
    expect((await fixture.activeRound()).resolved_map_label).toBe(expectedMap);
    await expect(
      memberPanel.getByRole("button", { name: "경기 시작", exact: true }),
    ).toHaveCount(0);
    await panel.getByRole("button", { name: "경기 시작", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    await expect(memberPanel).toHaveAttribute(
      "data-balance-phase",
      "match_live",
      { timeout: 20_000 },
    );
    const locked = await openSettings(page, panel);
    await expect(
      locked.getByRole("checkbox", { name: "맵 밴 사용", exact: true }),
    ).toBeDisabled();
    await expect(
      locked.getByRole("checkbox", { name: "영웅 밴 사용", exact: true }),
    ).toBeDisabled();
    await expect(
      locked.getByRole("spinbutton", { name: "맵 밴 시간(초)", exact: true }),
    ).toBeDisabled();
    await expect(
      locked.getByRole("button", { name: "설정 적용", exact: true }),
    ).toHaveCount(0);
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});

test("경기 준비: 수동 맵 보존·영웅 밴 마감·명시적 경기 시작", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const fixture = await createIsolatedBalanceFixture(10);
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const panel = await openAndForm(page, fixture);
    const formed = await fixture.activeRound();
    const settings = await openSettings(page, panel);
    await settings
      .getByRole("checkbox", { name: "맵 밴 사용", exact: true })
      .uncheck();
    await settings
      .getByRole("checkbox", { name: "영웅 밴 사용", exact: true })
      .uncheck();
    await saveSettings(settings);
    const configured = await fixture.activeRound();
    expect(configured.roster).toEqual(formed.roster);
    expect(configured.formation_state).toEqual(formed.formation_state);
    expect(configured.resolved_map_label).toBeNull();
    const start = panel.getByRole("button", { name: "경기 시작", exact: true });
    const picker = panel.getByRole("combobox", {
      name: "경기 맵",
      exact: true,
    });
    await expect(picker).toHaveValue("");
    await expect(start).toBeDisabled();
    await picker.selectOption("왕의 길");
    await expect(start).toBeEnabled();
    expect(await fixture.activeRound()).toMatchObject({
      phase: "editing",
      resolved_map_label: "왕의 길",
      map_ban_enabled: false,
    });
    expect(await readVotes(fixture, formed.id)).toEqual([]);
    await page.reload();
    await expect(picker).toHaveValue("왕의 길");
    await expect(start).toBeEnabled();

    const heroSettings = await openSettings(page, panel);
    await heroSettings
      .getByRole("checkbox", { name: "영웅 밴 사용", exact: true })
      .check();
    await heroSettings
      .getByRole("spinbutton", { name: "영웅 밴 시간(초)", exact: true })
      .fill("5");
    await saveSettings(heroSettings);
    const heroConfigured = await fixture.activeRound();
    expect(heroConfigured).toMatchObject({
      resolved_map_label: "왕의 길",
      hero_ban_enabled: true,
      hero_ban_seconds: 5,
    });
    expect(heroConfigured.roster).toEqual(formed.roster);
    expect(heroConfigured.formation_state).toEqual(formed.formation_state);
    const beforeHeroStart = Date.now();
    await panel
      .getByRole("button", { name: "영웅 밴 시작", exact: true })
      .click();
    await expect(panel).toHaveAttribute("data-balance-phase", "hero_ban");
    const heroResolve = panel.getByRole("button", {
      name: "영웅 밴 확정",
      exact: true,
    });
    await expect(heroResolve).toBeDisabled();
    await panel.getByRole("combobox", { name: "1순위 영웅", exact: true }).selectOption("dva");
    await panel.getByRole("combobox", { name: "2순위 영웅", exact: true }).selectOption("echo");
    await panel.getByRole("combobox", { name: "3순위 영웅", exact: true }).selectOption("ana");
    await panel.getByRole("button", { name: "투표 반영", exact: true }).click();
    await expect(panel.getByText(/1명 제출/)).toBeVisible();
    const heroVoting = await fixture.activeRound();
    const afterHeroStart = Date.now();
    expect(heroVoting).toMatchObject({
      phase: "hero_ban",
      resolved_map_label: "왕의 길",
      banned_heroes: null,
    });
    const heroDeadline = Date.parse(heroVoting.hero_ban_deadline_at!);
    expect(heroDeadline).toBeGreaterThanOrEqual(beforeHeroStart + 4_900);
    expect(heroDeadline).toBeLessThanOrEqual(afterHeroStart + 5_100);
    const { data: heroVotes, error: heroVoteError } = await fixture.service
      .from("balance_session_hero_votes")
      .select("user_id")
      .eq("session_id", formed.id);
    if (heroVoteError) throw heroVoteError;
    expect(heroVotes).toEqual([{ user_id: fixture.users[0].id }]);
    await expect(heroResolve).toBeEnabled({ timeout: 10_000 });
    await heroResolve.click();
    await expect(start).toBeEnabled();
    await expect(panel).toHaveAttribute("data-balance-phase", "hero_ban");
    expect(await fixture.activeRound()).toMatchObject({
      phase: "hero_ban",
      resolved_map_label: "왕의 길",
      banned_heroes: ["dva", "echo", "ana"],
      hero_ban_deadline_at: null,
    });
    await start.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live");
    expect(await fixture.activeRound()).toMatchObject({
      phase: "match_live",
      resolved_map_label: "왕의 길",
    });
  } finally {
    await fixture.cleanup();
  }
});
