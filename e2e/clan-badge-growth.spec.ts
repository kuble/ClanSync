import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("성채 멤버 배지의 9·10명 판정·획득일 보존·회수와 주년 나무 성장", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(10);
  const base = f.path.replace(/\/balance$/, "");
  const lateMemberId = f.users[9].id;
  try {
    const established = new Date(Date.now() - 3_600_000);
    established.setUTCFullYear(established.getUTCFullYear() - 10);
    await ok(f.service.from("clans").update({ name: "성장 배지 QA 클랜", created_at: established.toISOString() }).eq("id", f.clanId));
    await ok(f.service.from("clan_members").update({ status: "pending" }).eq("clan_id", f.clanId).eq("user_id", lateMemberId));
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1100, height: 884 });
    await page.goto(base+"/badges");
    const details = page.getByRole("region", { name: "선택한 배지 정보", exact: true });
    await page.getByRole("button", { name: "멤버", exact: true }).click();
    const ten = page.locator('[data-badge="members-10"]');
    await expect(ten).toHaveAccessibleName("멤버 10명 미획득");
    await ten.click();
    await expect(details).toContainText("활성 클랜원 10명");
    await expect(details).toContainText("9 / 10명");
    await expect(ten.locator("img")).toHaveCount(0);
    for (const threshold of [20, 50, 100]) await expect(page.locator(`[data-badge="members-${threshold}"]`)).toHaveAccessibleName(`멤버 ${threshold}명 미획득`);

    await ok(f.service.from("clan_members").update({ status: "active" }).eq("clan_id", f.clanId).eq("user_id", lateMemberId));
    await page.reload();
    await page.getByRole("button", { name: "멤버", exact: true }).click();
    await expect(ten).toHaveAccessibleName("멤버 10명 획득");
    await ten.click();
    await expect(ten.locator("img")).toHaveAttribute("src", /members-shared-citadel-10/);
    await expect.poll(() => ten.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const earlier = new Date(Date.now() - 2 * 86_400_000).toISOString();
    await ok(f.service.from("clan_badge_awards").update({ earned_at: earlier }).eq("clan_id", f.clanId).eq("badge_key", "members-10"));
    await page.reload();
    await page.getByRole("button", { name: "멤버", exact: true }).click();
    await ten.click();
    await expect(details).toContainText(new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul" }).format(new Date(earlier)));

    await page.getByRole("button", { name: "기념", exact: true }).click();
    await page.locator('[data-badge="founding"]').click();
    await page.getByRole("button", { name: "대표 배지 해제", exact: true }).click();
    await expect(page.getByRole("button", { name: "대표 배지 지정", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "멤버", exact: true }).click();
    await ten.click();
    await page.getByRole("button", { name: "대표 배지 지정", exact: true }).click();
    await expect(page.getByRole("button", { name: "대표 배지 해제", exact: true })).toBeVisible();
    await page.goto(base+"/manage");
    await expect(page.locator('[data-badge="members-10"] img')).toHaveAttribute("src", /members-shared-citadel-10/);

    await page.goto(base+"/badges");
    await page.getByRole("button", { name: "기념", exact: true }).click();
    for (const [years, key] of [[1, "anniversary"], [3, "anniversary-3"], [5, "anniversary-5"], [10, "anniversary-10"]] as const) {
      const slot = page.locator(`[data-badge="${key}"]`);
      await expect(slot).toHaveAccessibleName(`${years}주년 획득`);
      await slot.click();
      await expect(slot.locator("img")).toHaveAttribute("src", new RegExp(`anniversary-growing-history-${years}y-gold-v2`));
      await expect.poll(() => slot.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    if (process.env.BADGE_GROWTH_CAPTURE_DIR) {
      await mkdir(process.env.BADGE_GROWTH_CAPTURE_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.BADGE_GROWTH_CAPTURE_DIR, "anniversary-tree-growth.png"), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "멤버", exact: true }).click();
      await ten.click();
      await page.screenshot({ path: path.join(process.env.BADGE_GROWTH_CAPTURE_DIR, "member-citadel.png"), fullPage: true, animations: "disabled" });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "멤버", exact: true }).click();
    await ten.click();
    await expect(ten.locator("img")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", lateMemberId));
    await page.reload();
    await expect(ten).toHaveAccessibleName("멤버 10명 미획득");
    expect(await ok(f.service.from("clan_badge_awards").select("badge_key").eq("clan_id", f.clanId).eq("badge_key", "members-10"))).toHaveLength(0);
    await page.goto(base+"/manage");
    await expect(page.locator('[data-badge="members-10"]')).toHaveCount(0);
  } finally { await f.cleanup(); }
});
