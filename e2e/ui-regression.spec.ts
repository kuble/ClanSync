import { selectProfileSection, selectSection } from "./section-picker-helper";
import { test, expect } from "@playwright/test";
import { loginAsFixtureRole, gotoOverwatchLeaderClanBase } from "./fixture-login-helper";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

/**
 * TODO_Phase2 · pages.md 에서 live 로 표시된 화면 위주로
 * 버튼·탭·링크 진입 후 오류 페이지가 아닌지 검증합니다.
 * 전제: `npm run db:seed` · 픽스처와 동일 Supabase 프로젝트.
 */
test.use({ viewport: { width: 1280, height: 720 } });
test.setTimeout(120_000);

test.describe("UI 회귀 — MainClan (QA 리더)", () => {
  test("대시보드·탭 URL·헤딩 로드", async ({ page }) => {
    const base = await gotoOverwatchLeaderClanBase(page);

    const tabs: { suffix: string; heading: RegExp }[] = [
      { suffix: "", heading: /대시보드/ },
      { suffix: "/balance", heading: /내전 로비/ },
      { suffix: "/stats", heading: /클랜 통계/ },
      { suffix: "/events", heading: /^이벤트$/ },
      { suffix: "/manage", heading: /클랜 관리/ },
      { suffix: "/store", heading: /클랜 스토어/ },
    ];

    for (const { suffix, heading } of tabs) {
      await page.goto(`${base}${suffix}`);
      await expect(
        page.locator("[data-header-breadcrumbs]").getByRole("heading", { name: heading }),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test("헤더: 커뮤니티·프로필·게임 선택 링크", async ({ page }) => {
    const base = await gotoOverwatchLeaderClanBase(page);

    await page.getByRole("button", { name: "게임 선택", exact: true }).press("Enter");
    await page.getByRole("menuitem", { name: "오버워치", exact: true }).click();
    await expect(page).toHaveURL(base);

    await page.goto(base);
    await page.getByRole("button", { name: "프로필 메뉴", exact: true }).click();
    await page.getByRole("menuitem", { name: "프로필", exact: true }).click();
    await expect(page.getByRole("region", { name: "플레이어 소개" })).toBeVisible({
      timeout: 15_000,
    });
    await selectProfileSection(page);
    await expect(page.getByRole("tabpanel", { name: "계정 정보", exact: true }).getByRole("heading", { name: "내 계정", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(base);
    await page.getByRole("button", { name: "게임 선택", exact: true }).press("Enter");
    await page.getByRole("menuitem", { name: "전체 게임 보기", exact: true }).click();
    await page.waitForURL(/\/games\/?$/);
    await expect(page.getByRole("heading", { name: "게임 선택" })).toBeVisible();
  });

  test("알림 벨 시트 열림", async ({ page }) => {
    await gotoOverwatchLeaderClanBase(page);
    await page.getByRole("button", { name: /^알림/ }).click();
    const sheet = page.getByTestId("clansync-inapp-notification-sheet");
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(sheet.getByText("알림", { exact: true })).toBeVisible();
  });

  test("이벤트는 캘린더·투표만 제공하고 구형 대진표 주소는 캘린더로 연다", async ({ page }) => {
    const f = await createIsolatedBalanceFixture(1);
    const events = f.path.replace(/balance$/, "events");
    try {
      await loginIsolatedBalanceUser(page, f.users[0]);
      await page.goto(events + "?tab=bracket");
      const tabs = page.getByRole("tablist", { name: "클랜 이벤트 하위 탭" });
      await expect(tabs.getByRole("tab")).toHaveText(["캘린더", "투표"]);
      await expect(tabs.getByRole("tab", { name: "캘린더", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: "대진표 초안 만들기", exact: true })).toHaveCount(0);
      await tabs.getByRole("tab", { name: "투표", exact: true }).click();
      await page.getByRole("button", { name: "투표 만들기", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "투표 만들기", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(events);
      await expect(page.getByRole("navigation", { name: "이벤트 선택", exact: true }).getByRole("button")).toContainText("캘린더");
      await selectSection(page, "이벤트 선택", "투표");
      await expect(page.getByRole("radiogroup", { name: "투표 상태", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.goto(events + "?tab=polls");
      await expect(page.getByRole("navigation", { name: "이벤트 선택", exact: true }).getByRole("button")).toContainText("투표");
    } finally { await f.cleanup(); }
  });
});

test.describe("UI 회귀 — MainGame 커뮤니티 탭", () => {
  test("홈·홍보·LFG·순위·스크림 패널 문구 확인", async ({ page }) => {
    test.skip(true,"게임 커뮤니티 사용 보류로 기본 게임 주소는 클랜 흐름으로 연결합니다.");
    await loginAsFixtureRole(page, "Leader");
    await page.goto("/games/overwatch");
    await expect(page.getByRole("heading", { name: "오버워치 커뮤니티" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole("heading", { name: "클랜 홍보", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "홍보" }).click();
    await expect(page.getByTestId("main-game-tab-promo")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("main-game-tab-promo").locator("select")).toBeVisible();

    await page.getByRole("tab", { name: "LFG" }).click();
    await page.getByRole("button", { name: "LFG 모집 등록", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "LFG 모집 등록" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.getByRole("tab", { name: "순위" }).click();
    await expect(page.getByText("최근 활동한 클랜 순으로 표시합니다.")).toBeVisible();

    await page.getByRole("tab", { name: "스크림" }).click();
    const scrimTab = page.getByTestId("main-game-tab-scrim");
    await expect(scrimTab).toBeVisible({ timeout: 10_000 });
    await expect(
      scrimTab.getByText(/같은 게임 소속 클랜 간 스크림 방/),
    ).toBeVisible();

    await page.getByRole("tab", { name: "홈" }).click();
    await expect(page.getByRole("heading", { name: "클랜 홍보", exact: true })).toBeVisible();
  });
});

test.describe("UI 회귀 — 무소속 멤버 픽스처", () => {
  test("오버워치 클랜 온보딩 허브", async ({ page }) => {
    await loginAsFixtureRole(page, "Member");
    await page.goto("/games/overwatch/clan");
    await expect(
      page.getByRole("heading", { name: "클랜 찾기", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
