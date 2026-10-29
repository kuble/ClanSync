import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("profile and discussion avatars use symbols even with a legacy photo", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(1), id = randomUUID();
  try {
    expect((await f.service.from("account_profile_photos").upsert({ user_id: f.users[0].id, image_path: `${f.users[0].id}/${randomUUID()}.webp` })).error).toBeNull();
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
