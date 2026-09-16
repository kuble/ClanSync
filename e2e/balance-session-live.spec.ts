import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";

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

async function readRoster(panel: Locator) {
  return Promise.all(
    orderedSlots.map((key) =>
      panel.locator(`[data-roster-slot="${key}"]`).innerText(),
    ),
  );
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
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "결과 확정", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(
    panel.getByRole("button", { name: "다음 라운드", exact: true }),
  ).toBeEnabled({ timeout: 20_000 });
}

async function closeRemainingQaSession(page: Page, panel: Locator) {
  // Streaming navigation can finish before this panel has rendered.
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(panel).toHaveAttribute(
    "data-balance-phase",
    /^(none|editing|match_live)$/,
    { timeout: 20_000 },
  );
  const phase = await panel.getAttribute("data-balance-phase");
  if (phase === "none") return;

  if (
    phase === "match_live" &&
    (await panel
      .getByRole("button", { name: "무효 · 재경기", exact: true })
      .count())
  ) {
    await confirmResult(page, panel, "void");
  }
  const close = panel.getByRole("button", { name: "세션 종료", exact: true });
  await expect(close).toBeEnabled({ timeout: 20_000 });
  await close.click();
  await expect(panel).toHaveAttribute("data-balance-phase", "none", {
    timeout: 20_000,
  });
  await expect(
    panel.getByRole("button", { name: "세션 열기", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
}

async function expectReadOnlyShare(page: Page, panel: Locator) {
  await panel.getByRole("button", { name: "공유 화면", exact: true }).click();
  const share = page.getByRole("dialog", { name: "내전 공유 화면" });
  await expect(share).toBeVisible();
  await expect(share.locator("[data-roster-slot]")).toHaveCount(0);
  await expect(share.getByRole("button", { name: "편성 초기화" })).toHaveCount(
    0,
  );
  await expect(
    share.getByRole("spinbutton", { name: "입찰 크레딧" }),
  ).toHaveCount(0);
  await expect(share.getByRole("button", { name: /팀 입찰$/ })).toHaveCount(0);
  await expect(
    share.locator("button:enabled").filter({
      hasNotText: /^(공유 화면 닫기|결과 다시 보기)$/,
    }),
  ).toHaveCount(0);
  await expect(
    share.getByRole("button", { name: "공유 화면 닫기", exact: true }),
  ).toBeEnabled();
  await share.getByRole("button", { name: "공유 화면 닫기" }).click();
  await expect(share).toBeHidden();
}

test("운영진 세션: 명단 조작·팀 편성·공유·결과·다음 라운드·종료", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const base = await gotoOverwatchLeaderClanBase(page);
  await page.goto(`${base}/balance`);
  const panel = page.getByTestId("clan-balance-session-panel");
  await closeRemainingQaSession(page, panel);

  try {
    await panel.getByRole("checkbox", { name: /맵 밴 사용/ }).uncheck();
    await panel.getByRole("button", { name: "세션 열기", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "editing", {
      timeout: 20_000,
    });
    await expect(
      panel.getByRole("heading", { name: "라운드 1", exact: true }),
    ).toBeVisible();
    const formation = panel.getByTestId("balance-formation");
    const candidates = panel.getByRole("region", { name: "참가 가능 클랜원" });
    const startMatch = panel.getByRole("button", {
      name: "맵 밴 없이 경기 화면으로",
      exact: true,
    });
    const slot = (key: string) => panel.locator(`[data-roster-slot="${key}"]`);
    await expect(startMatch).toBeDisabled();
    await expect(
      formation.getByRole("button", { name: "편성 시작", exact: true }),
    ).toBeDisabled();
    expect(await candidates.getByRole("button").count()).toBeGreaterThanOrEqual(
      10,
    );

    const selected: string[] = [];
    for (let i = 0; i < 10; i++) {
      const candidate = candidates.getByRole("button").first();
      const nickname = (await candidate.innerText()).trim();
      selected.push(nickname);
      await candidate.click();
      await expect(slot(orderedSlots[i])).toHaveText(nickname);
      await expect(
        candidates.getByRole("button", {
          name: `${nickname} 출전 명단에 추가`,
          exact: true,
        }),
      ).toHaveCount(0);
    }
    await expect(startMatch).toBeDisabled();
    await slot("team1:d1").click({ button: "right" });
    await expect(slot("team1:d1")).toHaveText("빈자리");
    await expect(slot("team1:tank")).toHaveText(selected[2]);
    await expect(
      candidates.getByRole("button", {
        name: `${selected[1]} 출전 명단에 추가`,
        exact: true,
      }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "명단 변경 되돌리기" }).click();
    await expect(slot("team1:d1")).toHaveText(selected[1]);

    await slot("team1:d0").dragTo(slot("team2:d1"));
    await expect(slot("team1:d0")).toHaveText(selected[6]);
    await expect(slot("team2:d1")).toHaveText(selected[0]);
    const savedRoster = await readRoster(panel);
    await panel.getByRole("button", { name: "출전 명단 초기화" }).click();
    expect(await readRoster(panel)).toEqual(Array(10).fill("빈자리"));
    await panel.getByRole("button", { name: "명단 변경 되돌리기" }).click();
    expect(await readRoster(panel)).toEqual(savedRoster);
    await panel.getByRole("button", { name: "배치 저장", exact: true }).click();
    await expect(
      formation.getByRole("button", { name: "편성 시작", exact: true }),
    ).toBeEnabled({ timeout: 20_000 });
    await formation.getByRole("radio", { name: /현재 팀 유지/ }).check();
    await formation
      .getByRole("button", { name: "편성 시작", exact: true })
      .click();
    await expect(
      formation
        .locator('[aria-live="polite"]')
        .getByText("팀 편성 완료", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    expect(await readRoster(panel)).toEqual(savedRoster);
    await expectReadOnlyShare(page, panel);

    await startMatch.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", {
      timeout: 20_000,
    });
    await expect(
      panel.getByRole("button", { name: "세션 종료", exact: true }),
    ).toBeDisabled();
    await confirmResult(page, panel, "win");
    await panel
      .getByRole("button", { name: "다음 라운드", exact: true })
      .click();
    await expect(panel).toHaveAttribute("data-balance-phase", "editing", {
      timeout: 20_000,
    });
    await expect(
      panel.getByRole("heading", { name: "라운드 2", exact: true }),
    ).toBeVisible();
    expect(await readRoster(panel)).toEqual(savedRoster);

    await formation.getByRole("radio", { name: /주장 지명/ }).check();
    await formation
      .getByRole("button", { name: "편성 시작", exact: true })
      .click();
    await expect(formation.getByText(/지명 차례 · 1\/8/)).toBeVisible({
      timeout: 20_000,
    });
    await expect(startMatch).toBeDisabled();
    for (let pick = 1; pick <= 8; pick++) {
      const choices = formation
        .getByRole("button")
        .filter({ hasText: /딜러|힐러|탱커/ });
      const enabledChoice = choices
        .and(formation.locator("button:enabled"))
        .first();
      await enabledChoice.click();
      if (pick < 8) {
        await expect(
          formation.getByText(new RegExp(`지명 차례 · ${pick + 1}/8`)),
        ).toBeVisible({ timeout: 20_000 });
      }
    }
    await expect(
      formation
        .locator('[aria-live="polite"]')
        .getByText("팀 편성 완료", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    expect((await readRoster(panel)).sort()).toEqual([...savedRoster].sort());
    await formation.getByRole("button", { name: "편성 초기화" }).click();
    await expect(
      formation.getByRole("button", { name: "편성 시작", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    expect(await readRoster(panel)).toEqual(savedRoster);

    await formation.getByRole("radio", { name: /팀원 경매/ }).check();
    await formation
      .getByRole("button", { name: "편성 시작", exact: true })
      .click();
    await expect(
      formation.getByRole("button", { name: "다음 선수 공개" }),
    ).toBeVisible({ timeout: 20_000 });
    await formation.getByRole("button", { name: "다음 선수 공개" }).click();
    await expect(
      formation.getByRole("spinbutton", { name: "입찰 크레딧" }),
    ).toBeVisible({ timeout: 20_000 });
    await formation
      .getByRole("spinbutton", { name: "입찰 크레딧" })
      .fill("100");
    await formation
      .getByRole("button", { name: "1팀 입찰", exact: true })
      .click();
    await expect(formation.getByText("100P", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await formation.getByRole("button", { name: "편성 일시정지" }).click();
    await expect(
      formation.getByRole("button", { name: "편성 재개" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      formation.getByRole("button", { name: "1팀 입찰", exact: true }),
    ).toBeDisabled();
    await expectReadOnlyShare(page, panel);
    await formation.getByRole("button", { name: "편성 초기화" }).click();
    await expect(
      formation.getByRole("button", { name: "편성 시작", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    expect(await readRoster(panel)).toEqual(savedRoster);

    await formation.getByRole("radio", { name: /공통 추첨순서/ }).check();
    await formation.getByRole("radio", { name: /역할별 추첨/ }).check();
    await formation
      .getByRole("button", { name: "편성 시작", exact: true })
      .click();
    await expect(
      formation
        .locator('[aria-live="polite"]')
        .getByText("팀 편성 완료", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    expect((await readRoster(panel)).sort()).toEqual([...savedRoster].sort());
    await startMatch.click();
    await expect(panel).toHaveAttribute("data-balance-phase", "match_live", {
      timeout: 20_000,
    });
    await confirmResult(page, panel, "void");
    await panel.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect(panel).toHaveAttribute("data-balance-phase", "none", {
      timeout: 20_000,
    });
    await expect(
      panel.getByRole("button", { name: "세션 열기", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "라운드 기록", exact: true }),
    ).toBeVisible();
    await expect(
      panel.locator("summary").filter({ hasText: "라운드 1" }),
    ).toContainText("1팀 승리");
    await expect(
      panel.locator("summary").filter({ hasText: "라운드 2" }),
    ).toContainText("취소 · 무효");
  } finally {
    // Keep the shared QA clan usable if an assertion fails halfway through.
    await page.goto(`${base}/balance`);
    await closeRemainingQaSession(page, panel);
  }
});
