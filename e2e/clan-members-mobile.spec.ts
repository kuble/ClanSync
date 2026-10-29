import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("mobile members keep identity, activity and all actions inside the viewport", async ({ page }) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(3), base = f.path.replace(/\/balance$/, "");
  const tags = ["LeaderTag#1234", "LongMemberTagNameABC#1234567890", "OfficerTag#3456"];
  try {
    for (let i = 0; i < tags.length; i++) expect((await f.service.from("user_game_profiles").update({ battle_tag: tags[i] }).eq("user_id", f.users[i].id).eq("game_id", f.gameId)).error).toBeNull();
    expect((await f.service.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 921, height: 884 });
    await page.goto(base + "/manage?tab=members");
    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader", { name: "활동", exact: true })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "활동 상태", exact: true })).toHaveCount(0);
    await expect(table.getByRole("columnheader")).toHaveCount(6);
    const row = (index: number) => table.getByRole("row").filter({ has: page.getByRole("link", { name: `${tags[index]} 개인 기록`, exact: true }) });
    for (const width of [320,351,640]) {
      await page.setViewportSize({ width, height: 884 });
      await expect(table.getByRole("columnheader")).toHaveCount(2);
      await expect(row(1).getByRole("cell")).toHaveCount(2);
      await expect(row(1).getByRole("link", { name: `${tags[1]} 개인 기록`, exact: true })).toHaveText(tags[1]);
      await expect(row(1).getByRole("img", { name: `${tags[1]} 활성`, exact: true })).toBeVisible();
      expect(await table.evaluate(el => el.parentElement!.scrollWidth <= el.parentElement!.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await table.boundingBox();
      for (const button of await row(1).getByRole("button").all()) {
        await expect(button).toHaveCSS("width", "44px");
        await expect(button).toHaveCSS("height", "44px");
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(bounds!.x); expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
      }
    }
    await page.setViewportSize({ width: 351, height: 884 });
    await page.getByRole("button", { name: `${tags[0]} 클랜장 위임 후 멤버로 강등`, exact: true }).click();
    const transfer = page.getByRole("dialog", { name: "클랜장 위임 및 강등", exact: true });
    await expect(transfer.getByRole("combobox", { name: "새 클랜장", exact: true })).toBeVisible();
    await transfer.getByRole("button", { name: "취소", exact: true }).click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: `${tags[1]} 운영진 승격`, exact: true }).click();
    await expect(page.getByRole("button", { name: `${tags[1]} 멤버로 강등`, exact: true })).toBeVisible();
    expect((await f.service.from("clan_members").select("role").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single()).data?.role).toBe("officer");
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: `${tags[1]} 강퇴`, exact: true }).click();
    expect((await f.service.from("clan_members").select("status").eq("clan_id", f.clanId).eq("user_id", f.users[1].id).single()).data?.status).toBe("active");
    await page.screenshot({ path: test.info().outputPath("members-mobile-351.png"), animations: "disabled" });
    expect((await f.service.from("clan_members").update({ status: "banned" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await page.reload();
    await page.getByRole("radio", { name: /이전 구성원/ }).click();
    await expect(row(1).getByText("재가입 차단", { exact: true })).toBeVisible();
    expect(await table.evaluate(el => el.parentElement!.scrollWidth <= el.parentElement!.clientWidth + 1)).toBe(true);
    await page.getByRole("button", { name: `${tags[1]} 재가입 허용`, exact: true }).click();
    const allow = page.getByRole("dialog", { name: "재가입을 허용하시겠습니까?", exact: true });
    await expect(allow).toBeVisible();
    await allow.getByRole("button", { name: "취소", exact: true }).click();
    await page.setViewportSize({ width: 921, height: 884 });
    await expect(table.getByRole("columnheader", { name: "탈퇴·강퇴일", exact: true })).toBeVisible();
  } finally { await f.cleanup(); }
});
