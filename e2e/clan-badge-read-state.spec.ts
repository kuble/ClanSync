import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("배지 확인의 새 획득 보존·사용자 격리·전체 확인 동기화", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(2);
  const base = f.path.replace(/\/balance$/, "");
  const categories = page.getByRole("radiogroup", { name: "배지 컬렉션", exact: true });
  const mainCase = page.getByRole("group", { name: "배지 진열", exact: true });
  const dialog = page.getByRole("dialog");
  const established = new Date();
  established.setUTCFullYear(established.getUTCFullYear() - 3);
  try {
    const changed = await f.service.from("clans").update({ created_at: established.toISOString() }).eq("id", f.clanId);
    expect(changed.error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 808, height: 884 });
    await page.goto(base + "/badges");
    await expect(categories.locator("[data-new-badges]")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.BADGE_CASE_CAPTURE_DIR) {
      await mkdir(process.env.BADGE_CASE_CAPTURE_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.BADGE_CASE_CAPTURE_DIR, "badge-case-808.png"), animations: "disabled" });
    }
    await mainCase.locator('[data-badge="founding"]').click();
    await expect(dialog.getByRole("heading", { name: "창단", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(categories.getByRole("radio", { name: "기념", exact: true }).locator("[data-new-badges]")).toBeVisible();
    await page.reload();
    const awards = await f.service.from("clan_badge_awards").select("created_at").eq("clan_id", f.clanId);
    expect(awards.error).toBeNull();
    const displayedThrough = Math.max(...awards.data!.map(b => Date.parse(b.created_at)));
    // An award arrives after this page's snapshot, before the final unread family is opened.
    const incomingAt = new Date().toISOString();
    expect(Date.parse(incomingAt)).toBeGreaterThan(displayedThrough);
    const incoming = await f.service.from("clan_badge_awards").update({ created_at: incomingAt }).eq("clan_id", f.clanId).eq("badge_key", "founding");
    expect(incoming.error).toBeNull();
    let failOnce = true;
    await page.route("**" + base + "/badges", async route => {
      if (failOnce && route.request().method() === "POST" && route.request().headers()["next-action"]) {
        failOnce = false;
        await route.abort();
      } else await route.continue();
    });
    await mainCase.locator('[data-badge="anniversary-3"]').click();
    await expect(page.getByText("확인 상태를 저장하지 못했습니다.", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await mainCase.locator('[data-badge="anniversary-3"]').click();
    await expect(dialog.getByRole("group", { name: "연관 단계 배지", exact: true }).locator("button")).toHaveCount(4);
    await expect.poll(async () => {
      const seen = await f.service.from("clan_badge_seen").select("seen_at").eq("clan_id", f.clanId).eq("user_id", f.users[0].id).maybeSingle();
      return seen.data ? Date.parse(seen.data.seen_at) : null;
    }).toBe(displayedThrough);
    await page.keyboard.press("Escape");
    await expect(categories.getByRole("radio", { name: "기념", exact: true }).locator("[data-new-badges]")).toBeVisible();
    await mainCase.locator('[data-badge="founding"]').click();
    await expect.poll(async () => {
      const seen = await f.service.from("clan_badge_seen").select("seen_at").eq("clan_id", f.clanId).eq("user_id", f.users[0].id).maybeSingle();
      return seen.data ? Date.parse(seen.data.seen_at) : null;
    }).toBe(Date.parse(incomingAt));
    await page.keyboard.press("Escape");
    await expect(categories.locator("[data-new-badges]")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await categories.getByRole("radio", { name: "활동", exact: true }).click();
    await expect(mainCase.locator("button")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.BADGE_CASE_CAPTURE_DIR) await page.screenshot({ path: path.join(process.env.BADGE_CASE_CAPTURE_DIR, "badge-case-390.png"), animations: "disabled" });

    const otherContext = await browser.newContext();
    try {
      const other = await otherContext.newPage();
      await loginIsolatedBalanceUser(other, f.users[1]);
      await other.goto(base + "/badges");
      await expect(other.getByRole("radiogroup", { name: "배지 컬렉션", exact: true }).locator("[data-new-badges]")).toHaveCount(2);
      await other.getByRole("group", { name: "배지 진열", exact: true }).locator('[data-badge="founding"]').click();
      await expect(other.getByRole("dialog").getByRole("button", { name: /대표 배지 (지정|해제)/ })).toHaveCount(0);
    } finally { await otherContext.close(); }
    const freshContext = await browser.newContext();
    try {
      const fresh = await freshContext.newPage();
      await loginIsolatedBalanceUser(fresh, f.users[0]);
      await fresh.goto(base + "/badges");
      await expect(fresh.getByRole("radiogroup", { name: "배지 컬렉션", exact: true }).locator("[data-new-badges]")).toHaveCount(0);
    } finally { await freshContext.close(); }
  } finally { await f.cleanup(); }
});
