import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createIsolatedBalanceFixture,
  createAndEnterBalanceRoom,
  loginIsolatedBalanceUser,
} from "./isolated-balance-fixture";
import {
  parseRoster,
  rosterAssignedUserIds,
} from "../src/lib/balance/roster-schema";
import type { FormationState } from "../src/lib/balance/formation";

test.use({ actionTimeout: 20_000 });

const orderedSlots = [
  "team1:d0",
  "team1:d1",
  "team1:tank",
  "team1:s0",
  "team1:s1",
  "team2:d0",
  "team2:d1",
  "team2:tank",
  "team2:s0",
  "team2:s1",
];
const readRoster = (panel: Locator) =>
  Promise.all(
    orderedSlots.map((key) =>
      panel
        .locator(`[data-roster-slot="${key}"]`)
        .getAttribute("aria-label")
        .then((label) => label?.split(": ").at(-1) ?? ""),
    ),
  );

async function settings(
  page: Page,
  panel: Locator,
  mode: "keep" | "random" | "draft" | "auction",
  lottery = false,
) {
  await panel.getByRole("button", { name: "라운드 설정", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "라운드 설정", exact: true });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("radio", { name: lottery ? /공통 추첨순서/ : /직접 배정/ })
    .check();
  await dialog
    .getByRole("combobox", { name: "팀원 선발 방식", exact: true })
    .selectOption(mode);
  await dialog.getByRole("tab", { name: "밴픽", exact: true }).click();
  await dialog
    .getByRole("checkbox", { name: "맵 밴 사용", exact: true })
    .uncheck();
  await dialog
    .getByRole("checkbox", { name: "영웅 밴 사용", exact: true })
    .uncheck();
  await dialog.getByRole("button", { name: "설정 적용", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}

async function confirmResult(
  page: Page,
  panel: Locator,
  outcome: "win" | "void",
) {
  await panel
    .getByRole("button", {
      name: outcome === "win" ? "블루 승" : "무효 · 재경기",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: "경기 결과를 확정할까요?" });
  await dialog.getByRole("button", { name: "결과 확정", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(
    panel.getByRole("button", { name: "다음 라운드", exact: true }),
  ).toBeEnabled({ timeout: 20_000 });
}

async function applyAndSelectMap(panel: Locator) {
  await expect(panel.locator("[data-board-slot]")).toHaveCount(0, {
    timeout: 25_000,
  });
  await expect(panel.locator("[data-roster-slot]")).toHaveCount(0, {
    timeout: 25_000,
  });
  await panel.getByRole("button", { name: "쟁탈", exact: true }).click();
  const map = panel.getByRole("button", { name: "부산 선택", exact: true });
  await map.click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("button", { name: "경기 시작", exact: true })).toBeEnabled();
}

test("독립 QA 세션: 자동 저장·개인 선호·화면 내 공유 추첨·자동 전환·기록", async ({
  page,
  browser,
}) => {
  test.setTimeout(420_000);
  const fixture = await createIsolatedBalanceFixture();
  const memberContext = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  memberContext.setDefaultTimeout(20_000);
  const member = await memberContext.newPage();
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    await loginIsolatedBalanceUser(member, fixture.users[1]);
    await member.goto("/profile");
    await member.getByRole("tab", { name: "게임별", exact: true }).click();
    const profilePreference = member.getByRole("region", {
      name: "게임별 선호 역할",
    });
    await expect(profilePreference).toBeVisible({ timeout: 20_000 });
    await profilePreference.getByRole("button", { name: /딜러/ }).click();
    await profilePreference.getByRole("button", { name: /힐러/ }).click();
    await expect(
      profilePreference.getByRole("button", { name: /탱커/ }),
    ).toBeEnabled({ timeout: 20_000 });
    await expect
      .poll(async () => {
        const { data } = await fixture.service
          .from("profile_role_preferences")
          .select("ranking")
          .eq("user_id", fixture.users[1].id)
          .eq("game_id", fixture.gameId)
          .single();
        return data?.ranking;
      })
      .toEqual(["tank", "sup", "dmg"]);
    const room = await createAndEnterBalanceRoom(page, fixture.path);
    const panel = page.getByTestId("clan-balance-session-panel");
    await expect(panel).toHaveAttribute("data-balance-phase", "editing", {
      timeout: 20_000,
    });
    await expect(
      panel.getByRole("list", { name: "밸런스 진행 단계" }),
    ).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "배치 저장" })).toHaveCount(
      0,
    );
    await settings(page, panel, "keep");
    await panel.getByRole("button", { name: "화면 안내", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "대기방과 같은 자리", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "다음", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "이번 라운드의 규칙", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "이번 라운드의 규칙", exact: true }),
    ).toBeHidden();
    const candidates = panel.getByRole("region", { name: "참가 가능 클랜원" });
    const slot = (key: string) => panel.locator(`[data-roster-slot="${key}"]`);
    const selected = fixture.users.slice(0, 10).map((user) => user.nickname);
    for (let index = 0; index < 10; index++) {
      await candidates
        .getByRole("button", {
          name: `${selected[index]} 출전 명단에 추가`,
          exact: true,
        })
        .click();
      await expect(slot(orderedSlots[index])).toContainText(selected[index]);
      await expect(
        candidates.getByRole("button", {
          name: `${selected[index]} 출전 명단에 추가`,
          exact: true,
        }),
      ).toHaveCount(0);
    }
    await slot("team1:d1").click({ button: "right" });
    await expect(slot("team1:d1")).toHaveText("빈자리");
    await expect(slot("team1:tank")).toContainText(selected[2]);
    await panel.getByRole("button", { name: "명단 변경 되돌리기" }).click();
    await slot("team1:d0").dragTo(slot("team2:d1"));
    await expect(slot("team1:d0")).toContainText(selected[6]);
    await expect(slot("team2:d1")).toContainText(selected[0]);
    const savedRoster = await readRoster(panel);
    await panel.getByRole("button", { name: "출전 명단 초기화" }).click();
    expect(await readRoster(panel)).toEqual(Array(10).fill("빈자리"));
    await panel.getByRole("button", { name: "명단 변경 되돌리기" }).click();
    // No waiting for the debounce: one start click must flush this final change.
    await panel.getByRole("button", { name: "다음 단계", exact: true }).click();
    await expect(candidates).toHaveCount(0);
    expect(
      rosterAssignedUserIds(
        parseRoster((await fixture.activeRound()).roster),
      ).sort(),
    ).toEqual(
      fixture.users
        .slice(0, 10)
        .map((user) => user.id)
        .sort(),
    );
    await applyAndSelectMap(panel);
    await panel.getByRole("button", { name: "경기 시작", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", {
      timeout: 20_000,
    });
    await confirmResult(page, panel, "win");
    await panel
      .getByRole("button", { name: "다음 라운드", exact: true })
      .click();
    await expect(
      panel.getByRole("heading", { name: /밸런스 편집.*라운드 2/ }),
    ).toBeVisible({ timeout: 20_000 });
    expect(await readRoster(panel)).toEqual(savedRoster);

    await settings(page, panel, "random", true);
    await member.goto(room.url);
    const memberPanel = member.getByTestId("clan-balance-session-panel");
    await expect(memberPanel.getByTestId("balance-realtime")).toHaveAttribute(
      "data-connection-status",
      "READY",
      { timeout: 20_000 },
    );
    const ownPreference = memberPanel.getByRole("group", {
      name: "이번 라운드 내 선호",
      exact: true,
    });
    const preferenceOptions = ownPreference.getByRole("button", {
      name: "선호 옵션",
      exact: true,
    });
    await preferenceOptions.click();
    await expect(
      member.getByRole("menuitemradio", { name: "프로필 기본값", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await member.keyboard.press("Escape");
    await expect(
      ownPreference.getByRole("button", { name: /탱커/ }),
    ).toHaveAccessibleName("1순위 탱커");
    await expect(
      ownPreference.getByRole("button", { name: /힐러/ }),
    ).toHaveAccessibleName("2순위 힐러");
    await expect(
      ownPreference.getByRole("button", { name: /딜러/ }),
    ).toHaveAccessibleName("3순위 딜러");
    await preferenceOptions.click();
    await member
      .getByRole("menuitemradio", { name: "선호 없음", exact: true })
      .click();
    await expect
      .poll(async () => {
        const round = await fixture.activeRound();
        const { data } = await fixture.service
          .from("balance_round_role_preferences")
          .select("ranking")
          .eq("round_id", round.id)
          .eq("user_id", fixture.users[1].id)
          .single();
        return data?.ranking;
      })
      .toEqual([]);
    await expect(
      ownPreference
        .getByRole("list", { name: "역할 선호 순위" })
        .getByRole("button"),
    ).toHaveText(["–", "–", "–"]);
    await preferenceOptions.click();
    await member
      .getByRole("menuitemradio", { name: "프로필 기본값", exact: true })
      .click();
    await expect
      .poll(async () => {
        const round = await fixture.activeRound();
        const { data, error } = await fixture.service
          .from("balance_round_role_preferences")
          .select("ranking")
          .eq("round_id", round.id)
          .eq("user_id", fixture.users[1].id)
          .maybeSingle();
        return error ? "error" : data;
      })
      .toBeNull();
    await expect(preferenceOptions).toBeEnabled({ timeout: 20_000 });
    await preferenceOptions.click();
    await expect(
      member.getByRole("menuitemradio", { name: "프로필 기본값", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await member.keyboard.press("Escape");
    await ownPreference
      .getByRole("button", { name: /힐러/ })
      .dragTo(ownPreference.getByRole("button", { name: /탱커/ }));
    await expect(preferenceOptions).toBeEnabled({ timeout: 20_000 });
    await expect
      .poll(async () => {
        const round = await fixture.activeRound();
        const { data } = await fixture.service
          .from("balance_round_role_preferences")
          .select("ranking")
          .eq("round_id", round.id)
          .eq("user_id", fixture.users[1].id)
          .single();
        return data?.ranking;
      })
      .toEqual(["sup", "tank", "dmg"]);
    await panel.getByRole("button", { name: "추첨 시작", exact: true }).click();
    const operatorDraw = panel.getByLabel("공개 추첨 진행");
    const memberDraw = memberPanel.getByLabel("공개 추첨 진행");
    await expect(operatorDraw).toBeVisible({ timeout: 15_000 });
    await expect(memberDraw).toBeVisible({ timeout: 15_000 });
    const savedDraw = (await fixture.activeRound())
      .formation_state as unknown as FormationState;
    await expect(operatorDraw).toHaveAttribute("data-draw-id", savedDraw.draw!.id);
    await expect(memberDraw).toHaveAttribute("data-draw-id", savedDraw.draw!.id);
    await expect(ownPreference).toHaveCount(0, { timeout: 20_000 });
    const drawnRound = await fixture.activeRound();
    const draw = drawnRound.formation_state;
    const { data: unchangedDefault } = await fixture.service
      .from("profile_role_preferences")
      .select("ranking")
      .eq("user_id", fixture.users[1].id)
      .eq("game_id", fixture.gameId)
      .single();
    expect(unchangedDefault?.ranking).toEqual(["tank", "sup", "dmg"]);
    expect(drawnRound.formation_settings).toMatchObject({
      roles: "lottery",
      teams: "random",
    });
    const lockedClient = await fixture.memberClient(1);
    const locked = await lockedClient.rpc("save_round_role_preference", {
      p_round_id: drawnRound.id,
      p_ranking: ["dmg", "tank", "sup"],
    });
    expect(locked.error?.message).toMatch(/편성이 시작/);
    await lockedClient.auth.signOut({ scope: "local" });
    await expect(
      memberPanel.getByRole("button", { name: "추첨 시작", exact: true, includeHidden: true }),
    ).toHaveCount(0);
    await expect(
      memberPanel.getByRole("button", { name: "명단 수정", exact: true, includeHidden: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "결과 다시 보기" }),
    ).toHaveCount(0);
    await applyAndSelectMap(panel);
    await expect(memberPanel.locator("[data-board-slot]")).toHaveCount(0);
    const appliedState = (await fixture.activeRound()).formation_state;
    expect(appliedState).toEqual({ ...(draw as Record<string, unknown>), appliedAt: expect.any(Number) });
    await member.reload();
    await expect(memberPanel.locator("[data-board-slot]")).toHaveCount(0);
    await expect(memberPanel.getByRole("button", { name: "부산 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await fixture.activeRound()).formation_state).toEqual(appliedState);
    await panel.getByRole("button", { name: "경기 시작", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", {
      timeout: 20_000,
    });
    await confirmResult(page, panel, "void");
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.getByRole("button", { name: "내전 기록", exact: true }).click();
    const history = page.getByRole("dialog", {
      name: "내전 기록",
      exact: true,
    });
    await expect(history).toBeVisible();
    await expect(history).toContainText("1라운드");
    await expect(history).toContainText("2라운드");
    await expect(history).toContainText("1팀 승리");
    await expect(history).toContainText("무효");
    await expect
      .poll(async () => {
        const bounds = await history.boundingBox();
        return Boolean(
          bounds && bounds.x >= -1 && bounds.x + bounds.width <= 391,
        );
      })
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(history).toBeHidden();
    await panel.getByRole("button", { name: "세션 종료", exact: true }).click();
    await page.getByRole("button", { name: "종료 확정", exact: true }).click();
    await expect(page.getByTestId("clan-balance-lobby")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => {
      const { data } = await fixture.service.from("balance_session_series")
        .select("closed_at").eq("id", room.roomId).single();
      return data?.closed_at;
    }).toBeTruthy();
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});
