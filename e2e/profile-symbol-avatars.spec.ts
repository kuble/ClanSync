import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("profile and discussion avatars use symbols without photo storage", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(1), id = randomUUID();
  try {
    expect((await f.service.from("clan_board_posts").insert({ id, clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "심벌 아바타 검증", content: "심벌만 표시합니다." })).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "게임 프로필", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "공통 프로필 사진", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "사진 선택", exact: true })).toHaveCount(0);
    expect((await page.request.post("/api/profile-photo")).status()).toBe(404);
    await page.goto(f.path.replace(/\/balance$/, "") + `/board/free/${id}`);
    const avatar = page.locator("article header").getByRole("img", { name: /프로필 심볼$/ });
    await expect.poll(async () => decodeURIComponent(await avatar.getAttribute("src") ?? "")).toContain("/symbols/normal-v1/");
    await expect.poll(() => avatar.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  } finally { await f.cleanup(); }
});

test("account deletion works after retiring profile photo storage", async ({ page }) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(25_000);
  const f = await createIsolatedBalanceFixture(2), subject = f.users[1];
  try {
    await loginIsolatedBalanceUser(page, subject);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const accountTab = page.getByRole("tab", { name: "계정 정보", exact: true });
    await expect(async () => {
      await accountTab.click();
      await expect(accountTab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole("button", { name: "ClanSync 탈퇴", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "ClanSync를 탈퇴하시겠습니까?", exact: true });
    await dialog.getByRole("button", { name: "ClanSync 탈퇴하기", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await f.service.auth.admin.getUserById(subject.id)).data.user).toBeNull();
    const result = await f.service.from("users").select("id").eq("id", subject.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    f.users.splice(1, 1);
  } finally { await f.cleanup(); }
});
