import { test, expect } from "@playwright/test";

/**
 * Supabase에 존재하는 계정 + 오버워치 카드가 보이는 데이터가 필요함.
 * .env.local 등에만 설정: E2E_EMAIL, E2E_PASSWORD (커밋·채팅에 넣지 말 것)
 */
test.describe("온보딩 (E2E_EMAIL + E2E_PASSWORD)", () => {
  test("로그인 → 오버워치 → (필요 시) 게임 연동 시뮬 → 클랜 온보딩에 보내기 버튼", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(
      !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
      ".env.local 등에 E2E_EMAIL · E2E_PASSWORD 설정 후 실행 (e2e/README.md 참고).",
    );
    const email = process.env.E2E_EMAIL!.trim();
    const password = process.env.E2E_PASSWORD!.trim();

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
            "→ E2E_EMAIL·E2E_PASSWORD가 맞는지, `.env.local`의 Supabase와 **같은 프로젝트**인지 확인하세요.",
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

    const applyBtn = page.getByRole("button", { name: "가입 신청" }).first();
    const count = await applyBtn.count();
    if (count === 0) {
      testInfo.attach("note", {
        body: "표시할 클랜 카드가 없어 가입 패널 검증을 건너뜁니다.",
        contentType: "text/plain",
      });
      return;
    }

    await applyBtn.click();
    await expect(page.getByRole("button", { name: "보내기" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
