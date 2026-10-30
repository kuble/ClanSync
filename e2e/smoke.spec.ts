import { test, expect } from "@playwright/test";

test.describe("공개 스모크", () => {
  test("랜딩·로그인 화면이 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /팀 편성이 한결 편해지는/ })).toBeVisible();
    await expect(page).toHaveTitle("ClanSync — 클랜 운영을 한곳에서");
    await expect(page.getByRole("link", { name: "무료로 시작하기", exact: true }).first()).toHaveAttribute("href", "/sign-up");

    const nav = page.getByRole("navigation", { name: "서비스 소개" });
    const records = nav.getByRole("link", { name: "기록과 통계", exact: true });
    await records.click();
    await expect(records).toHaveAttribute("aria-current", "location");
    await page.getByRole("tab", { name: "경기 기록", exact: true }).click();
    await expect(page.getByRole("heading", { name: "이날의 내전 기록", exact: true })).toBeVisible();

    const activity = nav.getByRole("link", { name: "클랜 활동", exact: true });
    await activity.click();
    await expect(activity).toHaveAttribute("aria-current", "location");
    await page.getByRole("tab", { name: "알림", exact: true }).click();
    await expect(page.getByRole("heading", { name: "중요한 소식은 놓치지 않도록.", exact: true })).toBeVisible();

    await page.goto("/sign-in");
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });
});
