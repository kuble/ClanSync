import { test, expect } from "@playwright/test";
import { credentialsForOnboarding } from "./qa-fixture-credentials";

/**
 * 계정: `credentialsForOnboarding()` → 기본 QA_Member_01 + 고정 비번(qa-fixtures.mjs).
 * 선택: `E2E_EMAIL`·`E2E_PASSWORD` 둘 다 있으면 Member 자리만 덮어씀.
 * 사전 조건: `npm run db:seed` 로 같은 규칙의 사용자가 Supabase에 있어야 함.
 */
test.describe("온보딩 (QA 픽스처 Member)", () => {
  test("로그인 → 오버워치 → (필요 시) 게임 연동 시뮬 → 클랜 가입 보내기·토스트", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { email, password } = credentialsForOnboarding();

    await page.goto("/sign-in");
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "로그인" }).click();

    const gamesListPath = (url: URL) => {
      const p = url.pathname.replace(/\/$/, "") || "/";
      return p === "/games";
    };
    await page.waitForURL(gamesListPath, { timeout: 45_000 }).catch(async () => {
      const banner = page.getByRole("alert").first();
      const msg = (await banner.innerText().catch(() => "")).trim();
      if (msg) {
        throw new Error(
          `[E2E] 로그인 실패: ${msg}\n` +
            "→ `npm run db:seed` 여부, qa-fixtures 이메일·비번, `.env.local`의 Supabase와 **같은 프로젝트**인지 확인하세요.",
        );
      }
      throw new Error(`[E2E] /games로 이동하지 않음 (현재: ${page.url()}).`);
    });

    const owLink = page.getByRole("link", { name: /오버워치/i }).first();
    await expect(owLink).toBeVisible({ timeout: 10_000 });
    await owLink.click();

    await page.waitForURL(/\/games\/overwatch\/(auth|clan)/, { timeout: 30_000 });

    if (page.url().includes("/auth")) {
      const cta = page.getByRole("button", { name: /Battle\.net으로 계속/ });
      await expect(cta).toBeEnabled({ timeout: 10_000 });
      await cta.click();
      await page.waitForURL(/\/games\/overwatch\/clan/, { timeout: 30_000 });
    }

    // 이미 클랜 멤버면 .../clan/{uuid} 로 바로 갈 수 있음
    if (/\/games\/overwatch\/clan\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i.test(page.url())) {
      testInfo.attach("note", {
        body: "이미 클랜 멤버라 온보딩 목록 검증을 건너뜁니다.",
        contentType: "text/plain",
      });
      return;
    }

    await expect(page.getByRole("heading", { name: /가입 또는 생성/ })).toBeVisible({
      timeout: 15_000,
    });

    // dev(Strict Mode)에서 리스트 마운트 직후 클릭하면 상태가 리셋될 수 있음
    await page.waitForTimeout(800);

    const openCount = await page.locator('[data-testid^="clan-join-open-"]').count();
    if (openCount === 0) {
      testInfo.attach("note", {
        body: "표시할 클랜 카드가 없어 가입 패널 검증을 건너뜁니다.",
        contentType: "text/plain",
      });
      return;
    }

    // openApply는 토글: 연속 클릭으로 패널이 다시 닫히지 않게 한 번만 연다.
    const openBtn = page.locator('[data-testid^="clan-join-open-"]').first();
    await expect(openBtn).toBeVisible({ timeout: 10_000 });
    const openTestId = await openBtn.getAttribute("data-testid");
    const clanId = openTestId?.replace(/^clan-join-open-/, "") ?? "";
    const send = page.locator(`[data-testid="clan-join-send-${clanId}"]`);

    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();
    await expect(send).toBeVisible({ timeout: 15_000 });

    // 보내기 → 서버 액션·토스트까지 (성공 또는 동일 클랜 중복 신청 응답)
    const replaceDialog = page.getByRole("dialog", {
      name: /진행 중인 신청이 있습니다/,
    });
    try {
      await replaceDialog.waitFor({ state: "visible", timeout: 2000 });
      await page.getByRole("button", { name: "취소 후 새로 신청" }).click();
    } catch {
      /* 다이얼로그 없음 */
    }

    const joinPost = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes(`/games/${encodeURIComponent("overwatch")}/clan`),
      { timeout: 45_000 },
    );

    await send.click();
    await joinPost;

    await expect(
      page
        .getByText("가입 신청을 보냈습니다.")
        .or(page.getByText("이미 이 클랜에 신청 중입니다."))
        .or(page.getByText("이미 진행 중인 신청이 있습니다.")),
    ).toBeVisible({ timeout: 25_000 });
  });
});
