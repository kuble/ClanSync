import { test, expect } from "@playwright/test";
import { allSeededFixtureCredentials } from "./qa-fixture-credentials";

/**
 * 시드된 모든 QA 계정으로 로그인 가능 여부 스모크 (규칙만 알면 접근 가능한지 검증).
 */
test.describe("QA 픽스처 계정 로그인", () => {
  for (const acc of allSeededFixtureCredentials()) {
    test(`${acc.nickname} (@${acc.email.split("@")[1]})`, async ({ page }) => {
      await page.goto("/sign-in");
      await page.getByLabel("이메일").fill(acc.email);
      await page.getByLabel("비밀번호").fill(acc.password);
      await page.getByRole("button", { name: "로그인" }).click();

      await page.waitForURL(/\/games\/?$/, { timeout: 45_000 }).catch(async () => {
        const banner = page.getByRole("alert").first();
        const msg = (await banner.innerText().catch(() => "")).trim();
        throw new Error(
          msg
            ? `[E2E] ${acc.nickname} 로그인 실패: ${msg}`
            : `[E2E] ${acc.nickname} /games 미도달 (${page.url()}). db:seed·Supabase 프로젝트 확인.`,
        );
      });

      await expect(page.getByRole("link", { name: /오버워치/i }).first()).toBeVisible({
        timeout: 10_000,
      });
    });
  }
});
