import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { CLAN_BADGES, getClanBadgeRepresentatives, type ClanBadge, type ClanBadgeKey } from "../src/lib/clan/badges";

test.use({ timezoneId: "Asia/Seoul" });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("주년 한 슬롯·최고 단계 승급·연관 배지 상세와 대표 중복 정리", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(1);
  const base = f.path.replace(/\/balance$/, "");
  const stages = [[1, "anniversary"], [3, "anniversary-3"], [5, "anniversary-5"], [10, "anniversary-10"]] as const;
  const mainCase = page.getByRole("group", { name: "배지 진열", exact: true });
  const dialog = page.getByRole("dialog");
  const related = dialog.getByRole("group", { name: "연관 단계 배지", exact: true });
  const description = dialog.getByRole("region", { name: "배지 계열 설명", exact: true });
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1100, height: 884 });
    await page.goto(base+"/badges");
    const first = mainCase.locator('[data-badge="anniversary"]');
    await expect(mainCase.locator('[data-badge^="anniversary"]')).toHaveCount(1);
    await expect(first).toHaveAccessibleName("1주년 미획득");
    await first.click();
    await expect(description).toContainText("미획득 · 미리보기");
    await expect(dialog.getByRole("img", { name: "1주년 배지", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(first).toBeFocused();

    for (const [years, key] of stages) {
      const established = new Date(Date.now()-3_600_000);
      established.setUTCFullYear(established.getUTCFullYear()-years);
      await ok(f.service.from("clans").update({ created_at: established.toISOString() }).eq("id", f.clanId));
      await page.reload();
      await page.getByRole("button", { name: "기념", exact: true }).click();
      const representative = mainCase.locator(`[data-badge="${key}"]`);
      await expect(mainCase.locator('[data-badge^="anniversary"]')).toHaveCount(1);
      await expect(mainCase.locator("button")).toHaveCount(2);
      await expect(representative).toHaveAccessibleName(`${years}주년 획득`);
      await expect(representative.locator("img")).toHaveAttribute("loading", "eager");
      await representative.click();
      await expect(dialog.getByRole("heading", { name: `${years}주년`, exact: true })).toBeVisible();
      const preview = dialog.getByRole("img", { name: `${years}주년 배지`, exact: true });
      await expect(preview).toHaveAttribute("src", new RegExp(`anniversary-growing-history-${years}y-gold-v3`));
      await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(related.locator("button")).toHaveCount(4);
      for (const [relatedYear, relatedKey] of stages) {
        const badge = related.locator(`[data-badge="${relatedKey}"]`);
        await expect(badge).toHaveAccessibleName(`${relatedYear}주년 ${relatedYear<=years ? "획득" : "미획득"}`);
        await expect(badge.locator("img")).toHaveCount(relatedYear<=years ? 1 : 0);
      }
      if (years===3) await ok(f.service.from("clan_badge_featured").upsert({ clan_id:f.clanId, badge_keys:["anniversary","anniversary-3"] }));
      if (years===5) {
        const artBox = await preview.boundingBox(), infoBox = await description.boundingBox(), relatedBox = await related.boundingBox();
        expect(artBox!.x).toBeLessThan(infoBox!.x);
        expect(relatedBox!.y).toBeGreaterThan(Math.max(artBox!.y+artBox!.height,infoBox!.y+infoBox!.height));
        if (process.env.BADGE_SERIES_CAPTURE_DIR) {
          await mkdir(process.env.BADGE_SERIES_CAPTURE_DIR, { recursive:true });
          await page.screenshot({ path:path.join(process.env.BADGE_SERIES_CAPTURE_DIR,"five-year-detail-desktop.png"), animations:"disabled" });
        }
        await page.setViewportSize({ width:390,height:844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
        await related.locator('[data-badge="anniversary-10"]').click();
        await expect(description).toContainText("미획득 · 미리보기");
        await expect(dialog.getByRole("button", { name:"대표 배지 지정",exact:true })).toHaveCount(0);
        await related.locator('[data-badge="anniversary-5"]').click();
        if (process.env.BADGE_SERIES_CAPTURE_DIR) await page.screenshot({ path:path.join(process.env.BADGE_SERIES_CAPTURE_DIR,"five-year-detail-mobile.png"), animations:"disabled" });
        await page.setViewportSize({ width:1100,height:884 });
        await dialog.getByRole("button", { name:"대표 배지 해제",exact:true }).click();
        await expect.poll(async () => (await f.service.from("clan_badge_featured").select("badge_keys").eq("clan_id",f.clanId).single()).data?.badge_keys).toEqual([]);
        await dialog.getByRole("button", { name:"대표 배지 지정",exact:true }).click();
        await expect.poll(async () => (await f.service.from("clan_badge_featured").select("badge_keys").eq("clan_id",f.clanId).single()).data?.badge_keys).toEqual(["anniversary-5"]);
      }
      await related.locator('[data-badge="anniversary"]').click();
      await expect(dialog.getByRole("img", { name:"1주년 배지",exact:true })).toHaveAttribute("src",/anniversary-growing-history-1y-gold-v3/);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(representative).toBeFocused();
      await expect(mainCase.locator(`[data-badge="${key}"]`)).toBeVisible();
      if (years===5 && process.env.BADGE_SERIES_CAPTURE_DIR) await page.screenshot({ path:path.join(process.env.BADGE_SERIES_CAPTURE_DIR,"five-year-case.png"), animations:"disabled" });
      await page.goto(base+"/manage");
      await expect(mainCase.locator('[data-badge^="anniversary"]')).toHaveCount(1);
      await expect(mainCase.locator(`[data-badge="${key}"]`)).toBeVisible();
      await mainCase.locator(`[data-badge="${key}"]`).click();
      await expect(dialog.getByRole("button", { name:/대표 배지 (지정|해제)/ })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.goto(base+"/badges");
    }
  } finally { await f.cleanup(); }
});

test("모든 계열의 최고 달성·첫 미획득·인원 미달 단계 복귀", () => {
  const earned = new Set<ClanBadgeKey>(["founding","regular-1","regular-50","flash-10","anniversary","anniversary-3","anniversary-5","members-10","members-20","tenure-3","coaching-10","posts-100"]);
  const badges:ClanBadge[] = CLAN_BADGES.map(badge=>({...badge,earned:earned.has(badge.key),earnedAt:null,awardedAt:null,progress:"",isNew:false}));
  const keys = (rows:ClanBadge[]) => getClanBadgeRepresentatives(rows).map(badge=>badge.key).sort();
  expect(keys([...badges].reverse())).toEqual(["anniversary-5","coaching-10","flash-10","founding","members-20","posts-100","regular-1","regular-50","tenure-3"]);
  expect(keys(badges.map(badge=>({...badge,earned:badge.key==="members-20"?false:badge.earned})))).toEqual(["anniversary-5","coaching-10","flash-10","founding","members-10","posts-100","regular-1","regular-50","tenure-3"]);
  expect(keys(badges.map(badge=>({...badge,earned:badge.key==="founding"})))).toEqual(["anniversary","coaching-5","flash-10","founding","members-10","posts-50","regular-1","regular-50","tenure-1"]);
});
