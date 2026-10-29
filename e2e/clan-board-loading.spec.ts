import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("게시판 모든 목록과 상세 진입에서 스켈레톤을 제공하고 내용을 표시한다", async ({ page }, info) => {
  test.setTimeout(120_000);
  const fixture = await createIsolatedBalanceFixture(1);
  const base = fixture.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, fixture.users[0]);
    const { data: post, error } = await fixture.service.from("clan_notices").insert({
      clan_id: fixture.clanId, created_by: fixture.users[0].id, title: "로딩 확인용 공지", content: "상세 화면 확인",
    }).select("id").single();
    expect(error).toBeNull();
    let fallbacks = 0;
    for (const path of ["notices", "free", "feedback", "channels", "memories", `notices/${post!.id}`]) {
      const response = await page.goto(`${base}/board/${path}`);
      expect(response!.status()).toBe(200);
      const html = await response!.text();
      // Ready SSR can finish before the shared loading boundary needs to stream.
      if (html.includes('aria-label="게시판 로딩"')) { fallbacks++; expect(html).toContain('data-slot="skeleton"'); }
      await expect(page.getByRole("navigation", { name: "게시판 목차" })).toBeVisible();
      await expect(page.getByLabel("게시판 로딩", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "게시판 내용", exact: true })).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(fallbacks).toBeGreaterThan(0);
    await expect(page.getByText("상세 화면 확인", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("board-notice.png") });
  } finally {
    await fixture.cleanup();
  }
});
