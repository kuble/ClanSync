import { expect, test, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { formatCommunityDate } from "../src/lib/main-game/format-community-date";

test.use({ actionTimeout: 20_000 });

test("community dates use a stable Korean display across UTC day and year boundaries", () => {
  expect(formatCommunityDate("2026-12-31T16:04:46Z")).toBe("2027-01-01 01:04 KST");
  expect(formatCommunityDate("2026-10-16T00:15:00+09:00")).toBe("2026-10-16 00:15 KST");
  expect(formatCommunityDate("invalid")).toBe("—");
});

async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

async function checkEditor(page: Page, dialog: Locator, action: string, capture: string) {
  await expect(dialog).toBeVisible();
  await expect.poll(async () => await dialog.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  const box = await dialog.boundingBox();
  expect(Math.abs(box!.x + box!.width - page.viewportSize()!.width)).toBeLessThan(2);
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const title = dialog.locator('[data-slot="sheet-title"]');
  const submit = action === "닫기"
    ? dialog.locator('[data-slot="sheet-footer"]').getByRole("button", { name: action, exact: true })
    : dialog.getByRole("button", { name: action, exact: true });
  const before = [await title.boundingBox(), await submit.boundingBox()];
  await dialog.locator(".board-scroll").first().evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(submit).toBeInViewport();
  expect(Math.abs((await title.boundingBox())!.y - before[0]!.y)).toBeLessThan(2);
  expect(Math.abs((await submit.boundingBox())!.y - before[1]!.y)).toBeLessThan(2);
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath(capture), animations: "disabled" });
}

test("remaining pages fit desktop and mobile without document overflow", async ({ page }) => {
  test.setTimeout(480_000);
  const f = await createIsolatedBalanceFixture(2), base = f.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    const paths = [
      "/games", "/profile", ...["home", "promo", "lfg", "rank", "scrim"].map((tab) => `/games/overwatch?tab=${tab}`),
      base, `${base}/balance`, `${base}/stats`, `${base}/events`, `${base}/store`, `${base}/badges`,
      ...["overview", "appearance", "members", "requests", "balance", "notifications", "insights", "subscription"].map((tab) => `${base}/manage?tab=${tab}`),
      ...["notices", "free", "feedback", "channels", "memories"].map((section) => `${base}/board/${section}`),
    ];
    for (const width of [1304, 390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      for (const path of paths) {
        await test.step(`${width}px ${path.replace(f.clanId, "fixture")}`, async () => {
          const response = await page.goto(path);
          expect(response?.status()).toBeLessThan(400);
          await expect(page.getByRole("main")).toHaveCount(1);
          await expect(page.getByRole("main")).toBeVisible();
          await expect(page.getByRole("main").getByRole("status").filter({ hasText: /불러오는 중/ })).toHaveCount(0, { timeout: 30_000 });
          await expect(page.getByRole("main").locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 30_000 });
          await noPageOverflow(page);
          if (path === base) {
            await expect(page.getByRole("region", { name: "클랜 소개", exact: true })).toBeVisible();
            await page.screenshot({ path: test.info().outputPath(`dashboard-${width}.png`), animations: "disabled" });
          }
        });
      }
    }
  } finally { await f.cleanup(); }
});

test("board, coaching, brackets, records and profile editors share fixed actions on mobile", async ({ page }) => {
  test.setTimeout(240_000);
  const f = await createIsolatedBalanceFixture(2), base = f.path.replace(/\/balance$/, "");
  try {
    expect((await f.service.from("clan_board_coaches").insert({ clan_id: f.clanId, user_id: f.users[1].id, expertise: "지원 · 아나" })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 320, height: 568 });
    for (const [section, trigger, title, action] of [
      ["notices", "공지 작성", "공지 작성", "공지 저장"],
      ["free", "글 작성", "글 작성", "저장"],
      ["feedback", "코칭 선생님 등록", "코칭 선생님 등록", "프로필 저장"],
      ["feedback", "피드백 신청", "피드백 신청", "저장"],
      ["channels", "채널 등록", "방송 채널 등록", "저장"],
      ["memories", "추억 남기기", "추억 남기기", "저장"],
    ]) {
      await page.goto(`${base}/board/${section}`);
      await page.getByRole("button", { name: trigger, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: title, exact: true });
      if (section === "channels") for (let i = 0; i < 3; i++) await dialog.getByRole("button", { name: "방송 플랫폼 추가", exact: true }).click();
      await checkEditor(page, dialog, action, `${section}-${trigger}.png`);
      await dialog.getByRole("button", { name: "닫기", exact: true }).last().click();
      await expect(dialog).toBeHidden();
    }
    await page.goto(`${base}/events?tab=bracket`);
    await page.getByRole("button", { name: "대진표 초안 만들기", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "대진표 초안", exact: true });
    await checkEditor(page, dialog, "저장", "bracket-mobile.png");
    const longTitle = "MobileBracket".repeat(8);
    await dialog.getByLabel("대회명", { exact: true }).fill(longTitle);
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(longTitle, { exact: true })).toBeVisible();
    await noPageOverflow(page);
    await page.goto(`${base}/stats`);
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    await page.getByRole("button", { name: "기록 추가", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "경기 기록 추가", exact: true });
    await checkEditor(page, dialog, "기록 저장", "record-mobile.png");
    await dialog.getByRole("button", { name: "닫기", exact: true }).last().click();
    await page.goto("/profile");
    await page.getByRole("tab", { name: "계정 정보", exact: true }).click();
    await noPageOverflow(page);
    for (const [trigger, title, action] of [["네임카드 꾸미기", "네임카드 꾸미기", "닫기"]]) {
      await page.getByRole("button", { name: trigger, exact: true }).first().click();
      dialog = page.getByRole("dialog", { name: title, exact: true });
      await checkEditor(page, dialog, action, `${title}-mobile.png`);
      await dialog.getByRole("button", { name: "닫기", exact: true }).last().click();
      await expect(dialog).toBeHidden();
    }
    await page.goto(`${base}/manage?tab=members`);
    await page.getByRole("button", { name: `${f.users[1].nickname} 이전 기록 관리`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "이전 내전 기록", exact: true });
    await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "이 기록 연결", exact: true })).toBeInViewport();
    await noPageOverflow(page);
  } finally { await f.cleanup(); }
});

test("community composers keep their actions visible and preserve real post submission", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(1);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    for (const width of [1304, 390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      for (const [tab, title, action] of [["promo", "홍보 글 작성", "등록"], ["lfg", "LFG 모집 등록", "모집 등록"], ["scrim", "스크림 방 만들기", "방 만들기"]]) {
        await page.goto(`/games/overwatch?tab=${tab}`);
        await page.getByRole("button", { name: title, exact: true }).click();
        const dialog = page.getByRole("dialog", { name: title, exact: true });
        await checkEditor(page, dialog, action, `${tab}-${width}.png`);
        if (tab === "promo" && width === 320) {
          const longTitle = "MobilePromotion".repeat(8);
          await dialog.getByLabel("제목", { exact: true }).fill(longTitle);
          await dialog.getByLabel("내용", { exact: true }).fill("임시 클랜 게시글 저장 확인");
          await dialog.getByRole("button", { name: action, exact: true }).click();
          await expect(dialog).toBeHidden();
          await expect(page.getByRole("link", { name: longTitle, exact: true })).toBeVisible();
          await noPageOverflow(page);
          await page.getByRole("link", { name: longTitle, exact: true }).click();
          await page.waitForURL(/\/board\/[^/]+$/);
          await expect(page.getByRole("heading", { name: longTitle, exact: true })).toBeVisible();
          await noPageOverflow(page);
          await page.screenshot({ path: test.info().outputPath("community-detail-320.png"), animations: "disabled" });
        } else {
          await dialog.getByRole("button", { name: "닫기", exact: true }).last().click();
          await expect(dialog).toBeHidden();
        }
      }
    }
    expect(errors).toEqual([]);
  } finally { await f.cleanup(); }
});
