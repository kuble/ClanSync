import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ timezoneId: "Asia/Seoul" });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("성채 멤버 배지의 9·10명 판정·획득일 보존·회수와 단계 상세", async ({ page }) => {
  test.setTimeout(180_000);
  const f = await createIsolatedBalanceFixture(10);
  const base = f.path.replace(/\/balance$/, "");
  const lateMemberId = f.users[9].id;
  const mainCase = page.getByRole("group", { name: "배지 진열", exact: true });
  const dialog = page.getByRole("dialog");
  const related = dialog.getByRole("group", { name: "연관 단계 배지", exact: true });
  const description = dialog.getByRole("region", { name: "배지 계열 설명", exact: true });
  const ten = mainCase.locator('[data-badge="members-10"]');
  try {
    await ok(f.service.from("clan_members").update({ status:"pending" }).eq("clan_id",f.clanId).eq("user_id",lateMemberId));
    await loginIsolatedBalanceUser(page,f.users[0]);
    await page.setViewportSize({ width:1100,height:884 });
    await page.goto(base+"/badges");
    await page.getByRole("button", { name:"멤버",exact:true }).click();
    await expect(mainCase.locator("button")).toHaveCount(1);
    await expect(ten).toHaveAccessibleName("멤버 10명 미획득");
    await ten.click();
    await expect(description).toContainText("9 / 10명");
    await expect(related.locator("button")).toHaveCount(4);
    for (const threshold of [10,20,50,100]) {
      const slot = related.locator('[data-badge="members-'+threshold+'"]');
      await expect(slot).toHaveAccessibleName("멤버 "+threshold+"명 미획득");
      await expect(slot.locator("img")).toHaveCount(0);
    }
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await expect(dialog).toHaveCount(0);
    await ok(f.service.from("clan_members").update({ status:"active" }).eq("clan_id",f.clanId).eq("user_id",lateMemberId));
    await page.reload();
    await page.getByRole("button", { name:"멤버",exact:true }).click();
    await expect(ten).toHaveAccessibleName("멤버 10명 획득");
    const earlier = new Date(Date.now()-2*86_400_000).toISOString();
    await ok(f.service.from("clan_badge_awards").update({ earned_at:earlier }).eq("clan_id",f.clanId).eq("badge_key","members-10"));
    await page.reload();
    await page.getByRole("button", { name:"멤버",exact:true }).click();
    await ten.click();
    await expect(description).toContainText(new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul"}).format(new Date(earlier)));
    const image = dialog.getByRole("img", { name:"멤버 10명 배지",exact:true });
    await expect(image).toHaveAttribute("src",/members-shared-citadel-10/);
    await expect.poll(() => image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
    await related.locator('[data-badge="members-20"]').click();
    await expect(description).toContainText("미획득 · 미리보기");
    await expect(description).toContainText("10 / 20명");
    await expect(dialog.getByRole("button",{name:"대표 배지 지정",exact:true})).toHaveCount(0);
    await related.locator('[data-badge="members-10"]').click();
    await dialog.getByRole("button", { name:"대표 배지 해제",exact:true }).click();
    await expect(dialog.getByRole("button", { name:"대표 배지 지정",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"대표 배지 지정",exact:true }).click();
    await expect(dialog.getByRole("button", { name:"대표 배지 해제",exact:true })).toBeVisible();
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await page.goto(base+"/manage");
    await expect(mainCase.locator('[data-badge="members-10"] img')).toHaveAttribute("src",/members-shared-citadel-10/);
    await mainCase.locator('[data-badge="members-10"]').click();
    await expect(related.locator("button")).toHaveCount(4);
    await expect(dialog.getByRole("button",{name:/대표 배지 (지정|해제)/})).toHaveCount(0);
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await page.goto(base+"/badges");
    await page.getByRole("button", { name:"멤버",exact:true }).click();
    await page.setViewportSize({ width:390,height:844 });
    await ten.click();
    await expect(image).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await dialog.getByRole("button", { name:"닫기",exact:true }).click();
    await ok(f.service.from("clan_members").update({ status:"left" }).eq("clan_id",f.clanId).eq("user_id",lateMemberId));
    await page.reload();
    await page.getByRole("button", { name:"멤버",exact:true }).click();
    await expect(ten).toHaveAccessibleName("멤버 10명 미획득");
    expect(await ok(f.service.from("clan_badge_awards").select("badge_key").eq("clan_id",f.clanId).eq("badge_key","members-10"))).toHaveLength(0);
    await page.goto(base+"/manage");
    await expect(mainCase.locator('[data-badge="members-10"]')).toHaveCount(0);
  } finally { await f.cleanup(); }
});
