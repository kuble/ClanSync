import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("member rows, search and successor selection use one full BattleTag", async ({ page }) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(2), base = f.path.replace(/\/balance$/, "");
  const tags = ["LeaderTag#1234", "MemberTag#2345"];
  try {
    for (let index = 0; index < 2; index++) expect((await f.service.from("user_game_profiles").update({ battle_tag: tags[index] }).eq("user_id", f.users[index].id).eq("game_id", f.gameId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto(base + "/manage?tab=members");
    await expect(page.getByRole("columnheader", { name: "배틀태그", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "닉네임", exact: true })).toHaveCount(0);
    for (let index = 0; index < 2; index++) {
      const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: `${tags[index]} 개인 기록`, exact: true }) });
      await expect(row.getByRole("link", { name: `${tags[index]} 개인 기록`, exact: true })).toHaveText(tags[index]);
      await expect(row).not.toContainText(f.users[index].nickname);
      await expect(row.getByRole("cell").first().locator("p")).toHaveCount(0);
    }
    const search = page.getByRole("textbox", { name: "구성원 검색", exact: true });
    await expect(search).toHaveAttribute("placeholder", "배틀태그 검색");
    await search.fill("#2345");
    await expect(page.getByRole("link", { name: `${tags[1]} 개인 기록`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `${tags[0]} 개인 기록`, exact: true })).toHaveCount(0);
    await search.fill(f.users[1].nickname);
    await expect(page.getByText("조건에 맞는 멤버가 없습니다.", { exact: true })).toBeVisible();
    await search.clear();
    await page.getByRole("button", { name: `${tags[0]} 클랜장 위임 후 멤버로 강등`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "클랜장 위임 및 강등", exact: true });
    await expect(dialog.getByRole("option", { name: `${tags[1]} · 멤버`, exact: true })).toHaveCount(1);
    await expect(dialog).not.toContainText(f.users[1].nickname);
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await page.setViewportSize({ width: 1142, height: 884 });
    await page.screenshot({ path: test.info().outputPath("member-battletags-desktop.png"), animations: "disabled" });
    expect((await f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await page.reload();
    await page.getByRole("radio", { name: /이전 구성원/ }).click();
    await expect(page.getByRole("link", { name: `${tags[1]} 개인 기록`, exact: true })).toBeVisible();
  } finally { await f.cleanup(); }
});
