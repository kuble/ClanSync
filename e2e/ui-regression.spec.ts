import { test, expect } from "@playwright/test";
import { loginAsFixtureRole, gotoOverwatchLeaderClanBase } from "./fixture-login-helper";

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
      { suffix: "/balance", heading: /밸런스메이커/ },
      { suffix: "/stats", heading: /클랜 통계/ },
      { suffix: "/events", heading: /클랜 이벤트/ },
      { suffix: "/manage", heading: /클랜 관리/ },
      { suffix: "/store", heading: /스토어/ },
    ];

    for (const { suffix, heading } of tabs) {
      await page.goto(`${base}${suffix}`);
      await expect(
        page.getByRole("heading", { name: heading }),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test("헤더: 커뮤니티·프로필·게임 선택 링크", async ({ page }) => {
    const base = await gotoOverwatchLeaderClanBase(page);

    await page.getByRole("link", { name: "커뮤니티" }).click();
    await page.waitForURL(/\/games\/overwatch\/?$/);
    await expect(page.getByRole("heading", { name: "오버워치" })).toBeVisible();

    await page.goto(base);
    await page.getByRole("link", { name: "프로필" }).click();
    await expect(page.getByRole("heading", { name: "내 계정" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(base);
    await page.getByRole("link", { name: "게임 선택" }).click();
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
});

test.describe("UI 회귀 — MainGame 커뮤니티 탭", () => {
  test("홈·홍보·LFG·순위·스크림 패널 문구 확인", async ({ page }) => {
    await loginAsFixtureRole(page, "Leader");
    await page.goto("/games/overwatch");
    await expect(page.getByRole("heading", { name: "오버워치" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText(/클랜 일정·통계·스토어는/)).toBeVisible();

    await page.getByRole("tab", { name: "홍보" }).click();
    await expect(page.getByTestId("main-game-tab-promo")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("main-game-tab-promo").locator("select")).toBeVisible();

    await page.getByRole("tab", { name: "LFG" }).click();
    await expect(page.getByText("LFG 모집 등록")).toBeVisible();

    await page.getByRole("tab", { name: "순위" }).click();
    await expect(page.getByText(/활동 기준 미리보기/)).toBeVisible();

    await page.getByRole("tab", { name: "스크림" }).click();
    const scrimTab = page.getByTestId("main-game-tab-scrim");
    await expect(scrimTab).toBeVisible({ timeout: 10_000 });
    await expect(
      scrimTab.getByText(/같은 게임 소속 클랜 간 스크림 방/),
    ).toBeVisible();

    await page.getByRole("tab", { name: "홈" }).click();
    await expect(page.getByText(/클랜 일정·통계·스토어는/)).toBeVisible();
  });
});

test.describe("UI 회귀 — 무소속 멤버 픽스처", () => {
  test("오버워치 클랜 온보딩 허브", async ({ page }) => {
    await loginAsFixtureRole(page, "Member");
    await page.goto("/games/overwatch/clan");
    await expect(
      page.getByRole("heading", { name: /가입 또는 생성/ }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
