import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test("기본 네임카드와 임시 칭호는 게임 간 공유되며 삭제한 예시 디자인을 다시 표시하지 않는다", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(2);
  const titleId = randomUUID();
  const peerContext = await browser.newContext();
  try {
    expect((await f.service.from("nameplate_options").insert({ id: titleId, game_id: f.gameId, category: "sub", code: "title-e2e-" + titleId, name_ko: "검증용 칭호", unlock_source: "store", price_coins: 90 })).error).toBeNull();
    expect((await f.service.from("users").update({ coin_balance: 100 }).eq("id", f.users[0].id)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.goto("/store");
    const categories = page.getByRole("radiogroup", { name: "개인 꾸미기 분류" });
    await categories.getByRole("radio", { name: "테마", exact: true }).click();
    await expect(page.getByRole("heading", { name: "표시할 디자인이 없습니다." })).toBeVisible();
    await categories.getByRole("radio", { name: "칭호", exact: true }).click();
    const title = page.getByRole("article", { name: "검증용 칭호", exact: true });
    await title.getByRole("button", { name: "검증용 칭호 구매", exact: true }).click();
    await page.getByRole("dialog", { name: "네임카드 디자인 구매" }).getByRole("button", { name: "구매 확정", exact: true }).click();
    await expect(page.getByLabel("보유 코인").locator("strong")).toHaveText("10");
    await page.getByRole("region", { name: "현재 네임카드" }).getByRole("button", { name: "검증용 칭호 적용", exact: true }).click();
    await expect(page.getByRole("region", { name: "현재 네임카드" })).toContainText("검증용 칭호");

    await page.goto("/profile");
    await page.getByRole("button", { name: "네임카드 꾸미기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "네임카드 꾸미기", exact: true });
    const picker = editor.getByRole("group", { name: "네임카드 꾸미기 분류" });
    const card = editor.getByRole("region", { name: "현재 네임카드" }).locator("[data-namecard]");
    await expect(editor.getByRole("group", { name: "네임카드 심벌 디자인" }).getByRole("button")).toHaveCount(5);
    await expect(card.locator('img[data-symbol-art="orbit"]')).toBeVisible();
    await picker.getByRole("button", { name: "테마", exact: true }).click();
    await expect(editor.getByText("등록된 테마가 없습니다.")).toBeVisible();
    for (const category of ["초상 프레임", "배경", "카드 프레임"]) {
      await picker.getByRole("button", { name: category, exact: true }).click();
      await expect(editor.getByRole("group", { name: "네임카드 " + category + " 디자인", exact: true }).getByRole("button")).toHaveCount(1);
    }
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await expect(card).toContainText("검증용 칭호");
    }
    await page.screenshot({ path: test.info().outputPath("default-namecard-mobile.png") });
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByRole("region", { name: "공통 네임카드" })).toContainText("검증용 칭호");

    const peer = await peerContext.newPage();
    await loginIsolatedBalanceUser(peer, f.users[1]);
    await peer.goto(f.path.replace(/balance$/, "stats") + "?player=" + f.users[0].id);
    const publicCard = peer.getByRole("region", { name: "플레이어 배너" }).locator("[data-namecard]");
    await expect(publicCard).toContainText("검증용 칭호");
    await expect(publicCard.locator('img[data-symbol-art="orbit"]')).toBeVisible();
    expect((await page.request.get("/symbols/normal-v1/orbit.webp")).ok()).toBe(true);
    expect((await page.request.get("/namecards/v1/shield.webp")).status()).toBe(404);
    for (const path of ["/namecards/v1/arcade.webp", "/namecards/v1/crown.webp", "/clan-banners/emerald.svg", "/images/demo/qa-clan-banner.webp"]) expect((await page.request.get(path)).status()).toBe(404);
  } finally {
    await peerContext.close();
    await f.cleanup();
    expect((await f.service.from("nameplate_options").delete().eq("id", titleId)).error).toBeNull();
  }
});
